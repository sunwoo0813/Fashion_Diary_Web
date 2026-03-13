import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getOrCreateAppUserId } from "@/lib/app-user";
import { getSupabaseBucket } from "@/lib/env";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { extractStorageObjectPath, toText } from "@/lib/wardrobe";

function toIsoDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function toNumber(raw: string, fallback = 0): number {
  const value = raw.trim();
  if (!value) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function parseIdList(values: FormDataEntryValue[]): number[] {
  return values
    .map((value) => Number(toText(value)))
    .filter((id, index, arr) => Number.isInteger(id) && id > 0 && arr.indexOf(id) === index);
}

function parseTagsJson(raw: string): number[][] {
  const value = raw.trim();
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => {
      if (!Array.isArray(entry)) return [];
      return entry
        .map((v) => Number(v))
        .filter((id) => Number.isInteger(id) && id > 0);
    });
  } catch {
    return [];
  }
}

function parsePhotoUrlsJson(raw: string, bucketName: string): string[] {
  const value = raw.trim();
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => toText(entry))
      .filter((url) => Boolean(extractStorageObjectPath(url, bucketName)));
  } catch {
    return [];
  }
}

function normalizePathSegment(value: string): string {
  const raw = value.trim();
  if (!raw) return "anonymous";
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "");
  return cleaned || "anonymous";
}

async function uploadOutfitPhoto(file: File, appUserId: number) {
  const admin = createServiceRoleSupabaseClient();
  const bucket = getSupabaseBucket();
  const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const userPath = normalizePathSegment(String(appUserId));
  const objectPath = `outfits/${userPath}/${crypto.randomUUID().replace(/-/g, "")}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage.from(bucket).upload(objectPath, buffer, {
    contentType: toText(file.type) || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data } = admin.storage.from(bucket).getPublicUrl(objectPath);
  return toText(data.publicUrl);
}

async function removePublicUrl(url: string) {
  const admin = createServiceRoleSupabaseClient();
  const bucket = getSupabaseBucket();
  const objectPath = extractStorageObjectPath(url, bucket);
  if (!objectPath) return;
  await admin.storage.from(bucket).remove([objectPath]);
}

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
  const photoIds = (photos || []).map((row) => Number(row.id));

  if (photoIds.length > 0) {
    await admin.from("outfit_photo_item").delete().in("photo_id", photoIds);
  }
  await admin.from("outfit_item").delete().eq("outfit_id", outfitId);
  await admin.from("outfit_photo").delete().eq("outfit_id", outfitId);
  await admin.from("outfit").delete().eq("id", outfitId).eq("user_id", appUserId);

  for (const photo of photos || []) {
    await removePublicUrl(toText(photo.photo_path));
  }

  return NextResponse.redirect(new URL("/diary", request.url), { status: 303 });
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

  const dateValue = toIsoDate(toText(formData.get("date"))) ?? String(outfitRow.date);
  const note = toText(formData.get("note")) || null;
  const tMin = toNumber(toText(formData.get("t_min")), 0);
  const tMax = toNumber(toText(formData.get("t_max")), 0);
  const humidity = Math.trunc(toNumber(toText(formData.get("humidity")), 0));
  const rain = toText(formData.get("rain")) === "1";

  const { error: updateError } = await admin
    .from("outfit")
    .update({
      date: dateValue,
      note,
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
    await admin.from("outfit_photo_item").delete().in("photo_id", deletePhotoIds);
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

    const photoId = Number(photoRow.id);
    const tagIds = (newTagsList[index] || []).filter((id) => allowedItemIds.has(id));
    if (tagIds.length > 0) {
      const rows = tagIds.map((itemId) => ({ photo_id: photoId, item_id: itemId }));
      await admin.from("outfit_photo_item").insert(rows);
    }
  }

  return NextResponse.redirect(new URL("/diary", request.url), { status: 303 });
}

export async function PATCH() {
  return NextResponse.json({ ok: false, error: "수정은 POST multipart 방식으로 요청해 주세요." }, { status: 405 });
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
