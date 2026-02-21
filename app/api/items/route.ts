import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getOrCreateAppUserId } from "@/lib/app-user";
import { getSupabaseBucket } from "@/lib/env";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import {
  coerceSizeDetail,
  makeDisplayName,
  normalizePublicImagePath,
  pickSizeValue,
  toText,
} from "@/lib/wardrobe";

function redirectWithMessage(requestUrl: string, path: string, key: "error" | "message", value: string) {
  const url = new URL(path, requestUrl);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

async function uploadItemImage(file: File) {
  const bucket = getSupabaseBucket();
  const admin = createServiceRoleSupabaseClient();

  const safeName = `${crypto.randomUUID().replace(/-/g, "")}${file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ""}`;
  const objectPath = `items/${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = toText(file.type) || "application/octet-stream";

  const { error } = await admin.storage.from(bucket).upload(objectPath, buffer, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(objectPath);
  return toText(data.publicUrl);
}

export async function POST(request: Request) {
  const authUser = await getCurrentUser();
  if (!authUser?.email) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  try {
    const formData = await request.formData();
    const brand = toText(formData.get("brand"));
    const product = toText(formData.get("product"));
    const category = toText(formData.get("category"));
    const explicitSize = toText(formData.get("size"));
    const sizeDetail = coerceSizeDetail(toText(formData.get("size_detail_json")));
    const prefillImagePath = toText(formData.get("image_path_prefill"));

    const fileValue = formData.get("image");
    const file = fileValue instanceof File ? fileValue : null;

    let imagePath: string | null = null;
    if (file && file.size > 0) {
      imagePath = await uploadItemImage(file);
    } else if (prefillImagePath) {
      imagePath = normalizePublicImagePath(prefillImagePath);
    }

    const appUserId = await getOrCreateAppUserId(authUser.email);
    const admin = createServiceRoleSupabaseClient();

    const payload = {
      user_id: appUserId,
      name: makeDisplayName(brand, product),
      category: category || null,
      size: pickSizeValue(explicitSize, sizeDetail),
      size_detail: sizeDetail,
      image_path: imagePath,
    };

    const { error } = await admin.from("item").insert(payload);
    if (error) {
      return redirectWithMessage(request.url, "/wardrobe/new", "error", "Item save failed.");
    }

    return NextResponse.redirect(new URL("/wardrobe", request.url), { status: 303 });
  } catch {
    return redirectWithMessage(request.url, "/wardrobe/new", "error", "Item save failed.");
  }
}
