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

export async function POST(request: Request) {
  const authUser = await getCurrentUser();
  if (!authUser?.email) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  const redirectToNew = (message?: string) => {
    const url = new URL("/outfits/new", request.url);
    if (message) url.searchParams.set("error", message);
    return NextResponse.redirect(url, { status: 303 });
  };

  try {
    const formData = await request.formData();
    const appUserId = await getOrCreateAppUserId(authUser.email);
    const admin = createServiceRoleSupabaseClient();

    const dateValue = toIsoDate(toText(formData.get("date"))) ?? new Date().toISOString().slice(0, 10);
    const note = toText(formData.get("note")) || null;
    const tMin = toNumber(toText(formData.get("t_min")), 0);
    const tMax = toNumber(toText(formData.get("t_max")), 0);
    const humidity = Math.trunc(toNumber(toText(formData.get("humidity")), 0));
    const rain = toText(formData.get("rain")) === "1";

    const { data: outfitRow, error: insertError } = await admin
      .from("outfit")
      .insert({
        user_id: appUserId,
        date: dateValue,
        note,
        t_min: tMin,
        t_max: tMax,
        humidity,
        rain,
      })
      .select("id,date")
      .single();
    if (insertError || !outfitRow?.id) {
      return redirectToNew("코디 저장에 실패했어요.");
    }

    const outfitId = Number(outfitRow.id);
    const tagsList = parseTagsJson(toText(formData.get("photo_tags_json")));
    const bucket = getSupabaseBucket();
    const uploadedPhotoUrls = parsePhotoUrlsJson(toText(formData.get("photo_urls_json")), bucket);
    const files = formData
      .getAll("photos")
      .filter((entry): entry is File => entry instanceof File)
      .filter((file) => file.size > 0);

    const { data: userItems } = await admin.from("item").select("id").eq("user_id", appUserId);
    const allowedItemIds = new Set((userItems || []).map((row) => Number(row.id)));
    const outfitItemIds = parseIdList(formData.getAll("outfit_item_ids")).filter((id) => allowedItemIds.has(id));

    if (outfitItemIds.length > 0) {
      const rows = outfitItemIds.map((itemId) => ({ outfit_id: outfitId, item_id: itemId }));
      await admin.from("outfit_item").insert(rows);
    }

    const photoCount = Math.max(uploadedPhotoUrls.length, files.length);
    for (let index = 0; index < photoCount; index += 1) {
      const uploadedUrl = toText(uploadedPhotoUrls[index]);
      const file = files[index];
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
      const tagIds = (tagsList[index] || []).filter((id) => allowedItemIds.has(id));
      if (tagIds.length > 0) {
        const rows = tagIds.map((itemId) => ({ photo_id: photoId, item_id: itemId }));
        await admin.from("outfit_photo_item").insert(rows);
      }
    }

    return NextResponse.redirect(new URL("/diary", request.url), { status: 303 });
  } catch {
    return redirectToNew("코디 저장에 실패했어요.");
  }
}
