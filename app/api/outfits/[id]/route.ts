import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getOrCreateAppUserId } from "@/lib/app-user";
import { getSupabaseBucket } from "@/lib/env";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { toText } from "@/lib/wardrobe";
import {
  toIsoDate,
  toNumber,
  parseIdList,
  parseTagsJson,
  parsePhotoUrlsJson,
  uploadOutfitPhoto,
  removePublicUrl,
} from "../outfit-utils";

async function resolveContext(request: Request, outfitIdRaw: string) {
  const authUser = await getCurrentUser();
  if (!authUser?.email) {
    return {
      redirect: NextResponse.redirect(new URL("/login", request.url), { status: 303 }),
      appUserId: null,
      outfitId: null,
      admin: null,
    };
  }

  const outfitId = Number(outfitIdRaw);
  if (!Number.isInteger(outfitId) || outfitId <= 0) {
    return {
      redirect: NextResponse.redirect(new URL("/diary", request.url), { status: 303 }),
      appUserId: null,
      outfitId: null,
      admin: null,
    };
  }

  const appUserId = await getOrCreateAppUserId(authUser.email);
  const admin = createServiceRoleSupabaseClient();
  return { redirect: null as NextResponse | null, appUserId, outfitId, admin };
}

async function deleteOutfit(request: Request, params: { id: string }) {
  const ctx = await resolveContext(request, params.id);
  if (ctx.redirect) return ctx.redirect;
  const { appUserId, outfitId, admin } = ctx;
  if (!admin || appUserId == null || outfitId == null) {
    return NextResponse.redirect(new URL("/diary", request.url), { status: 303 });
  }

  const { data: outfitRow } = await admin
    .from("outfit")
    .select("id,user_id")
    .eq("id", outfitId)
    .eq("user_id", appUserId)
    .maybeSingle();
  if (!outfitRow) {
    return NextResponse.redirect(new URL("/diary", request.url), { status: 303 });
  }

  const { data: photos } = await admin.from("outfit_photo").select("id,photo_path").eq("outfit_id", outfitId);

  await admin.from("outfit_item").delete().eq("outfit_id", outfitId);
  await admin.from("outfit_photo").delete().eq("outfit_id", outfitId);
  await admin.from("outfit").delete().eq("id", outfitId).eq("user_id", appUserId);

  for (const photo of photos || []) {
    await removePublicUrl(toText(photo.photo_path));
  }

  return NextResponse.redirect(new URL(`/diary?post=${outfitId}`, request.url), { status: 303 });
}

async function updateOutfit(request: Request, params: { id: string }, formData: FormData) {
  const ctx = await resolveContext(request, params.id);
  if (ctx.redirect) return ctx.redirect;
  const { appUserId, outfitId, admin } = ctx;
  if (!admin || appUserId == null || outfitId == null) {
    return NextResponse.redirect(new URL("/diary", request.url), { status: 303 });
  }

  const { data: outfitRow } = await admin
    .from("outfit")
    .select("id,date,user_id")
    .eq("id", outfitId)
    .eq("user_id", appUserId)
    .maybeSingle();
  if (!outfitRow) {
    return NextResponse.redirect(new URL("/diary", request.url), { status: 303 });
  }

  const dateValue = toIsoDate(toText(formData.get("date"))) ?? String(outfitRow.date ?? "");
  const note = toText(formData.get("note")) || null;
  const city = toText(formData.get("city")) || null;
  const tMin = toNumber(toText(formData.get("t_min")), 0);
  const tMax = toNumber(toText(formData.get("t_max")), 0);
  const humidity = Math.min(100, Math.max(0, Math.trunc(toNumber(toText(formData.get("humidity")), 0))));
  const rain = toText(formData.get("rain")) === "1";

  const { error: updateError } = await admin
    .from("outfit")
    .update({
      date: dateValue,
      note,
      city,
      t_min: tMin,
      t_max: tMax,
      humidity,
      rain,
    })
    .eq("id", outfitId)
    .eq("user_id", appUserId);
  if (updateError) {
    const url = new URL(`/outfits/${outfitId}/edit`, request.url);
    url.searchParams.set("error", "코디 수정에 실패했어요.");
    return NextResponse.redirect(url, { status: 303 });
  }

  const { data: allPhotos } = await admin
    .from("outfit_photo")
    .select("id,photo_path")
    .eq("outfit_id", outfitId)
    .order("created_at", { ascending: true });
  const photosById = (allPhotos || []).reduce<Record<number, { id: number; photo_path: string }>>((acc, row) => {
    const id = Number(row.id);
    acc[id] = { id, photo_path: toText(row.photo_path) };
    return acc;
  }, {});

  const deletePhotoIds = parseIdList(formData.getAll("delete_photo_ids")).filter((id) => Boolean(photosById[id]));
  if (deletePhotoIds.length > 0) {
    await admin.from("outfit_photo").delete().in("id", deletePhotoIds);
    for (const photoId of deletePhotoIds) {
      await removePublicUrl(photosById[photoId].photo_path);
    }
  }

  const { data: userItems } = await admin.from("item").select("id").eq("user_id", appUserId);
  const allowedItemIds = new Set((userItems || []).map((row) => Number(row.id)));
  const outfitItemIds = parseIdList(formData.getAll("outfit_item_ids")).filter((id) => allowedItemIds.has(id));

  await admin.from("outfit_item").delete().eq("outfit_id", outfitId);
  if (outfitItemIds.length > 0) {
    const rows = outfitItemIds.map((itemId) => ({ outfit_id: outfitId, item_id: itemId }));
    await admin.from("outfit_item").insert(rows);
  }

  const newTagsList = parseTagsJson(toText(formData.get("photo_tags_new_json")));
  const bucket = getSupabaseBucket();
  const uploadedPhotoUrls = parsePhotoUrlsJson(toText(formData.get("photo_urls_new_json")), bucket);
  const newFiles = formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File)
    .filter((file) => file.size > 0);

  const photoCount = Math.max(uploadedPhotoUrls.length, newFiles.length);
  for (let index = 0; index < photoCount; index += 1) {
    const uploadedUrl = toText(uploadedPhotoUrls[index]);
    const file = newFiles[index];
    if (!uploadedUrl && !file) continue;

    const publicPath = uploadedUrl || (await uploadOutfitPhoto(file, appUserId));
    const uploadedByServer = !uploadedUrl;

    const { data: photoRow, error: photoInsertError } = await admin
      .from("outfit_photo")
      .insert({
        outfit_id: outfitId,
        photo_path: publicPath,
      })
      .select("id")
      .single();
    if (photoInsertError || !photoRow?.id) {
      if (uploadedByServer) {
        await removePublicUrl(publicPath);
      }
      continue;
    }

  }

  return NextResponse.redirect(new URL("/diary", request.url), { status: 303 });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const authUser = await getCurrentUser();
  if (!authUser?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const outfitId = Number(params.id);
  if (!Number.isInteger(outfitId) || outfitId <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid ID" }, { status: 400 });
  }

  const appUserId = await getOrCreateAppUserId(authUser.email);
  const admin = createServiceRoleSupabaseClient();

  const body = (await request.json()) as {
    note?: string | null;
    city?: string | null;
    outfit_item_ids?: number[];
    t_min?: number;
    t_max?: number;
    humidity?: number;
    rain?: boolean;
  };

  const { data: outfitRow } = await admin
    .from("outfit")
    .select("id")
    .eq("id", outfitId)
    .eq("user_id", appUserId)
    .maybeSingle();
  if (!outfitRow) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const { error: updateError } = await admin
    .from("outfit")
    .update({
      note: body.note ?? null,
      city: body.city ?? null,
      t_min: body.t_min ?? 0,
      t_max: body.t_max ?? 0,
      humidity: body.humidity ?? 0,
      rain: body.rain ?? false,
    })
    .eq("id", outfitId)
    .eq("user_id", appUserId);
  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  if (Array.isArray(body.outfit_item_ids)) {
    const { data: userItems } = await admin.from("item").select("id").eq("user_id", appUserId);
    const allowedItemIds = new Set((userItems || []).map((row) => Number(row.id)));
    const validItemIds = body.outfit_item_ids.filter((id) => allowedItemIds.has(id));

    await admin.from("outfit_item").delete().eq("outfit_id", outfitId);
    if (validItemIds.length > 0) {
      const rows = validItemIds.map((itemId) => ({ outfit_id: outfitId, item_id: itemId }));
      await admin.from("outfit_item").insert(rows);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const formData = await request.formData();
  const action = toText(formData.get("_action")).toLowerCase();
  if (action === "delete") {
    return deleteOutfit(request, params);
  }
  return updateOutfit(request, params, formData);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  return deleteOutfit(request, params);
}
