import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getSupabaseBucket } from "@/lib/env";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { extractStorageObjectPath, toText } from "@/lib/wardrobe";

const CHUNK_SIZE = 200;

function toInt(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

function chunk<T>(values: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    out.push(values.slice(i, i + size));
  }
  return out;
}

function uniqueIds(values: number[]): number[] {
  return Array.from(new Set(values.filter((id) => Number.isInteger(id) && id > 0)));
}

function redirectWithQuery(request: Request, path: string, key: "error" | "message", value: string) {
  const url = new URL(path, request.url);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

function assertNoError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

async function removeStorageFiles(publicUrlsOrPaths: string[]) {
  const admin = createServiceRoleSupabaseClient();
  const bucket = getSupabaseBucket();

  const objectPaths = Array.from(
    new Set(
      publicUrlsOrPaths
        .map((value) => extractStorageObjectPath(value, bucket))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  for (const objectChunk of chunk(objectPaths, 100)) {
    if (objectChunk.length === 0) continue;
    await admin.storage.from(bucket).remove(objectChunk);
  }
}

async function fetchAppUserByEmail(email: string) {
  const admin = createServiceRoleSupabaseClient();
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const { data, error } = await admin.from("user").select("id,email").eq("email", normalized).maybeSingle();
  if (error) {
    throw new Error(`App user lookup failed: ${error.message}`);
  }

  if (!data?.id) return null;
  return {
    id: Number(data.id),
    email: String(data.email || normalized),
  };
}

async function deleteAppDomainData(appUserId: number) {
  const admin = createServiceRoleSupabaseClient();

  const [{ data: itemRows, error: itemError }, { data: outfitRows, error: outfitError }] = await Promise.all([
    admin.from("item").select("id,image_path").eq("user_id", appUserId),
    admin.from("outfit").select("id").eq("user_id", appUserId),
  ]);
  if (itemError) throw new Error(`Item query failed: ${itemError.message}`);
  if (outfitError) throw new Error(`Outfit query failed: ${outfitError.message}`);

  const itemIds = uniqueIds((itemRows || []).map((row) => toInt(row.id) ?? 0));
  const outfitIds = uniqueIds((outfitRows || []).map((row) => toInt(row.id) ?? 0));
  const objectPathsSource: string[] = [...(itemRows || []).map((row) => toText(row.image_path))];

  const photoRows: Array<{ id: number; photo_path: string }> = [];
  for (const outfitChunk of chunk(outfitIds, CHUNK_SIZE)) {
    if (outfitChunk.length === 0) continue;
    const { data, error } = await admin.from("outfit_photo").select("id,photo_path").in("outfit_id", outfitChunk);
    assertNoError(error, "Outfit photo query failed");
    (data || []).forEach((row) => {
      const id = toInt(row.id);
      if (!id) return;
      photoRows.push({ id, photo_path: toText(row.photo_path) });
    });
  }

  const photoIds = uniqueIds(photoRows.map((row) => row.id));
  objectPathsSource.push(...photoRows.map((row) => row.photo_path));

  await removeStorageFiles(objectPathsSource);

  for (const photoChunk of chunk(photoIds, CHUNK_SIZE)) {
    if (photoChunk.length === 0) continue;
    const { error } = await admin.from("outfit_photo_item").delete().in("photo_id", photoChunk);
    assertNoError(error, "Outfit photo tag delete failed");
  }

  for (const itemChunk of chunk(itemIds, CHUNK_SIZE)) {
    if (itemChunk.length === 0) continue;
    const { error } = await admin.from("outfit_item").delete().in("item_id", itemChunk);
    assertNoError(error, "Outfit-item delete by item failed");
  }

  for (const outfitChunk of chunk(outfitIds, CHUNK_SIZE)) {
    if (outfitChunk.length === 0) continue;
    const { error: outfitItemError } = await admin.from("outfit_item").delete().in("outfit_id", outfitChunk);
    assertNoError(outfitItemError, "Outfit-item delete by outfit failed");

    const { error: photoDeleteError } = await admin.from("outfit_photo").delete().in("outfit_id", outfitChunk);
    assertNoError(photoDeleteError, "Outfit photo delete failed");

    const { error: outfitDeleteError } = await admin.from("outfit").delete().in("id", outfitChunk).eq("user_id", appUserId);
    assertNoError(outfitDeleteError, "Outfit delete failed");
  }

  for (const itemChunk of chunk(itemIds, CHUNK_SIZE)) {
    if (itemChunk.length === 0) continue;
    const { error } = await admin.from("item").delete().in("id", itemChunk).eq("user_id", appUserId);
    assertNoError(error, "Item delete failed");
  }

  const { error: userDeleteError } = await admin.from("user").delete().eq("id", appUserId);
  assertNoError(userDeleteError, "App user delete failed");
}

async function deleteAuthUser(authUserId: string): Promise<void> {
  const admin = createServiceRoleSupabaseClient();
  await admin.auth.admin.deleteUser(authUserId);
}

async function clearSession() {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
}

export async function POST(request: Request) {
  const authUser = await getCurrentUser();
  if (!authUser?.email) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  try {
    const formData = await request.formData();
    const confirm = toText(formData.get("confirm")).toUpperCase();
    if (confirm !== "DELETE") {
      return redirectWithQuery(request, "/account", "error", "계정 삭제 확인을 위해 DELETE를 입력해 주세요.");
    }

    const appUser = await fetchAppUserByEmail(authUser.email);
    if (appUser?.id) {
      await deleteAppDomainData(appUser.id);
    }

    try {
      await deleteAuthUser(authUser.id);
    } catch {
      // 앱 데이터 삭제는 계속 진행합니다.
    }
    await clearSession();

    return redirectWithQuery(request, "/login", "message", "계정이 삭제되었습니다.");
  } catch {
    return redirectWithQuery(request, "/account", "error", "계정 삭제에 실패했어요.");
  }
}
