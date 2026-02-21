import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getOrCreateAppUserId } from "@/lib/app-user";
import { getSupabaseBucket } from "@/lib/env";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { extractStorageObjectPath, toText } from "@/lib/wardrobe";

function uniqueNumericIds(rawIds: string[]) {
  const set = new Set<number>();
  rawIds.forEach((raw) => {
    const n = Number(raw);
    if (Number.isInteger(n) && n > 0) set.add(n);
  });
  return Array.from(set);
}

export async function POST(request: Request) {
  const authUser = await getCurrentUser();
  if (!authUser?.email) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  try {
    const formData = await request.formData();
    const rawIds = formData
      .getAll("item_ids")
      .map((value) => toText(value))
      .filter(Boolean);
    const itemIds = uniqueNumericIds(rawIds);
    if (itemIds.length === 0) {
      return NextResponse.redirect(new URL("/wardrobe", request.url), { status: 303 });
    }

    const appUserId = await getOrCreateAppUserId(authUser.email);
    const admin = createServiceRoleSupabaseClient();
    const bucket = getSupabaseBucket();

    const { data: ownedItems, error: lookupError } = await admin
      .from("item")
      .select("id,image_path")
      .eq("user_id", appUserId)
      .in("id", itemIds);
    if (lookupError) {
      return NextResponse.redirect(new URL("/wardrobe?error=Delete+failed", request.url), {
        status: 303,
      });
    }

    const ownedIds = (ownedItems || []).map((row) => Number(row.id));
    if (ownedIds.length === 0) {
      return NextResponse.redirect(new URL("/wardrobe", request.url), { status: 303 });
    }

    await admin.from("outfit_item").delete().in("item_id", ownedIds);
    await admin.from("outfit_photo_item").delete().in("item_id", ownedIds);

    for (const row of ownedItems || []) {
      const objectPath = extractStorageObjectPath(toText(row.image_path), bucket);
      if (!objectPath) continue;
      await admin.storage.from(bucket).remove([objectPath]);
    }

    await admin.from("item").delete().eq("user_id", appUserId).in("id", ownedIds);

    return NextResponse.redirect(new URL("/wardrobe", request.url), { status: 303 });
  } catch {
    return NextResponse.redirect(new URL("/wardrobe?error=Delete+failed", request.url), {
      status: 303,
    });
  }
}
