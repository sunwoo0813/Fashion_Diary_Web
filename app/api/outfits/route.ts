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
  parsePhotoUrlsJson,
  uploadOutfitPhoto,
  removePublicUrl,
} from "./outfit-utils";

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
    const city = toText(formData.get("city")) || null;
    const tMin = toNumber(toText(formData.get("t_min")), 0);
    const tMax = toNumber(toText(formData.get("t_max")), 0);
    const humidity = Math.min(100, Math.max(0, Math.trunc(toNumber(toText(formData.get("humidity")), 0))));
    const rain = toText(formData.get("rain")) === "1";

    const { data: outfitRow, error: insertError } = await admin
      .from("outfit")
      .insert({
        user_id: appUserId,
        date: dateValue,
        note,
        city,
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

    }

    return NextResponse.redirect(new URL("/diary", request.url), { status: 303 });
  } catch {
    return redirectToNew("코디 저장에 실패했어요.");
  }
}
