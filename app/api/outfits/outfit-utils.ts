import { getSupabaseBucket } from "@/lib/env";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { extractStorageObjectPath, toText } from "@/lib/wardrobe";

export function toIsoDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function toNumber(raw: string, fallback = 0): number {
  const value = raw.trim();
  if (!value) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function parseIdList(values: FormDataEntryValue[]): number[] {
  return values
    .map((value) => Number(toText(value)))
    .filter((id, index, arr) => Number.isInteger(id) && id > 0 && arr.indexOf(id) === index);
}

export function parseTagsJson(raw: string): number[][] {
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

export function parsePhotoUrlsJson(raw: string, bucketName: string): string[] {
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

export async function uploadOutfitPhoto(file: File, appUserId: number) {
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

export async function removePublicUrl(url: string) {
  const admin = createServiceRoleSupabaseClient();
  const bucket = getSupabaseBucket();
  const objectPath = extractStorageObjectPath(url, bucket);
  if (!objectPath) return;
  await admin.storage.from(bucket).remove([objectPath]);
}
