import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getOrCreateAppUserId } from "@/lib/app-user";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { makeDisplayNameFromFields, toText } from "@/lib/wardrobe";

type UpdateBody = {
  brand?: unknown;
  product?: unknown;
  category?: unknown;
  detail_category?: unknown;
  size?: unknown;
  size_detail?: unknown;
  color?: unknown;
  season?: unknown;
  thickness?: unknown;
  stylingIdea?: unknown;
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const authUser = await getCurrentUser();
  if (!authUser?.email) {
    return NextResponse.json({ ok: false, error: "인증이 필요합니다." }, { status: 401 });
  }

  const itemId = Number(params.id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return NextResponse.json({ ok: false, error: "잘못된 아이템 ID입니다." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as UpdateBody;
    const brand = toText(body.brand);
    const product = toText(body.product);
    const category = toText(body.category);
    const detailCategory = toText(body.detail_category);
    const size = toText(body.size);
    const sizeDetail =
      body.size_detail && typeof body.size_detail === "object" && !Array.isArray(body.size_detail)
        ? (body.size_detail as Record<string, unknown>)
        : null;
    const color = toText(body.color);
    const seasons = Array.isArray(body.season)
      ? Array.from(new Set(body.season.map((value) => toText(value)).filter(Boolean)))
      : [];
    const thickness = toText(body.thickness);
    const stylingIdea = toText(body.stylingIdea);

    const appUserId = await getOrCreateAppUserId(authUser.email);
    const admin = createServiceRoleSupabaseClient();

    const { data: existingItem, error: existingItemError } = await admin
      .from("item")
      .select("id,brand,product_name,category,detail_category,color,season,thickness,size,size_detail")
      .eq("id", itemId)
      .eq("user_id", appUserId)
      .maybeSingle();

    if (existingItemError) {
      return NextResponse.json({ ok: false, error: "아이템 정보를 불러오지 못했어요." }, { status: 500 });
    }
    if (!existingItem) {
      return NextResponse.json({ ok: false, error: "아이템을 찾을 수 없어요." }, { status: 404 });
    }

    const fallbackSizeDetail =
      color || stylingIdea
        ? {
            pairs: {
              ...(color ? { color } : {}),
              ...(stylingIdea ? { styling: stylingIdea } : {}),
            },
          }
        : null;

    const hasSeasonField = Array.isArray(body.season);

    const payload = {
      brand: brand || toText(existingItem.brand) || null,
      product_name: product || toText(existingItem.product_name) || null,
      category: category || toText(existingItem.category) || null,
      detail_category: detailCategory || toText(existingItem.detail_category) || null,
      color: color || toText(existingItem.color) || null,
      season: hasSeasonField ? (seasons.length > 0 ? seasons : null) : existingItem.season ?? null,
      thickness: thickness || toText(existingItem.thickness) || null,
      size: size || toText(existingItem.size) || null,
      size_detail: sizeDetail ?? fallbackSizeDetail ?? existingItem.size_detail ?? null,
    };

    const { data, error } = await admin
      .from("item")
      .update(payload)
      .eq("id", itemId)
      .eq("user_id", appUserId)
      .select("id,brand,product_name,category,detail_category,color,season,thickness,size,size_detail")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: "아이템 수정에 실패했어요." }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: "아이템을 찾을 수 없어요." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      item: {
        ...data,
        name: makeDisplayNameFromFields(data.brand, data.product_name),
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "아이템 수정에 실패했어요." }, { status: 500 });
  }
}
