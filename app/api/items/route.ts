import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getOrCreateAppUserId } from "@/lib/app-user";
import { getSupabaseBucket } from "@/lib/env";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import {
  coerceSizeDetail,
  extractStorageObjectPath,
  normalizePublicImagePath,
  pickSizeValue,
  toText,
} from "@/lib/wardrobe";

function redirectWithMessage(requestUrl: string, path: string, key: "error" | "message", value: string) {
  const url = new URL(path, requestUrl);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

async function uploadItemImage(file: File, saveAsStoragePath: boolean, appUserId: number) {
  const bucket = getSupabaseBucket();
  const admin = createServiceRoleSupabaseClient();

  const safeName = `${crypto.randomUUID().replace(/-/g, "")}${file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ""}`;
  const objectPath = `items/${appUserId}/${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = toText(file.type) || "application/octet-stream";

  const { error } = await admin.storage.from(bucket).upload(objectPath, buffer, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  if (saveAsStoragePath) {
    return `${bucket}/${objectPath}`;
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(objectPath);
  return toText(data.publicUrl);
}

function toStorageImagePath(value: string): string {
  const raw = toText(value);
  if (!raw) return "";

  const itemBucket = getSupabaseBucket();
  if (raw.startsWith(`${itemBucket}/`) || raw.startsWith("product-assets/")) {
    return raw;
  }

  const objectPathInItemBucket = extractStorageObjectPath(raw, itemBucket);
  if (objectPathInItemBucket) {
    return `${itemBucket}/${objectPathInItemBucket}`;
  }

  const objectPathInProductBucket = extractStorageObjectPath(raw, "product-assets");
  if (objectPathInProductBucket) {
    return `product-assets/${objectPathInProductBucket}`;
  }

  // External images cannot be mapped to storage object paths.
  return raw;
}

export async function POST(request: Request) {
  const authUser = await getCurrentUser();
  if (!authUser?.email) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  try {
    const formData = await request.formData();
    const inputMode = toText(formData.get("input_mode")).toLowerCase();
    const isSearchMode = inputMode === "search";
    const isUrlMode = inputMode === "url";
    const brand = toText(formData.get("brand"));
    const product = toText(formData.get("product"));
    const category = toText(formData.get("category"));
    const detailCategory = toText(formData.get("detail_category"));
    const color = toText(formData.get("color"));
    const seasons = Array.from(
      new Set(formData.getAll("season").map((value) => toText(value)).filter(Boolean)),
    );
    const thickness = toText(formData.get("thickness"));
    const explicitSize = toText(formData.get("size"));
    const parsedSizeDetail = coerceSizeDetail(toText(formData.get("size_detail_json")));
    const sizeDetail = parsedSizeDetail;
    const prefillImagePath = toText(formData.get("image_path_prefill"));
    const appUserId = await getOrCreateAppUserId(authUser.email);

    const fileValue = formData.get("image");
    const file = fileValue instanceof File ? fileValue : null;

    let imagePath: string | null = null;
    if (file && file.size > 0) {
      imagePath = await uploadItemImage(file, !isUrlMode, appUserId);
    } else if (prefillImagePath) {
      if (isSearchMode) {
        imagePath = toStorageImagePath(prefillImagePath);
      } else if (isUrlMode) {
        imagePath = prefillImagePath;
      } else {
        imagePath = normalizePublicImagePath(prefillImagePath);
      }
    }

    const admin = createServiceRoleSupabaseClient();

    const payload = {
      user_id: appUserId,
      brand: brand || null,
      product_name: product || null,
      category: category || null,
      detail_category: detailCategory || null,
      color: color || null,
      season: seasons.length > 0 ? seasons : null,
      thickness: thickness || null,
      size: pickSizeValue(explicitSize, sizeDetail),
      size_detail: sizeDetail,
      image_path: imagePath,
      created_at: new Date().toISOString(),
    };

    const { error } = await admin.from("item").insert(payload);
    if (error) {
      return redirectWithMessage(request.url, "/wardrobe/new", "error", "아이템 저장에 실패했어요.");
    }

    return NextResponse.redirect(new URL("/wardrobe", request.url), { status: 303 });
  } catch {
    return redirectWithMessage(request.url, "/wardrobe/new", "error", "아이템 저장에 실패했어요.");
  }
}
