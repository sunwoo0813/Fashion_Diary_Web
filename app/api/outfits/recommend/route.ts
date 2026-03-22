import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getOrCreateAppUserId } from "@/lib/app-user";
import {
  recommendOutfit,
  type RecommendationItemRow,
  type RecommendationWeatherInput,
} from "@/lib/outfit-recommendation";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

type RequestBody = {
  weather?: RecommendationWeatherInput;
  regionLabel?: string;
};

export async function POST(request: Request) {
  const authUser = await getCurrentUser();
  if (!authUser?.email) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as RequestBody;
    const weather = body.weather;

    if (!weather) {
      return NextResponse.json({ ok: false, error: "날씨 정보가 필요합니다." }, { status: 400 });
    }

    const appUserId = await getOrCreateAppUserId(authUser.email);
    const admin = createServiceRoleSupabaseClient();

    const { data, error } = await admin
      .from("item")
      .select("id,brand,product_name,category,detail_category,color,season,thickness,image_path")
      .eq("user_id", appUserId);

    if (error) {
      return NextResponse.json({ ok: false, error: "옷장 정보를 불러오지 못했습니다." }, { status: 500 });
    }

    const items = (data || []) as RecommendationItemRow[];
    if (items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "옷장에 아이템이 없어서 코디를 추천할 수 없습니다." },
        { status: 400 },
      );
    }

    // 날씨 기본 검증
    const tempValue = Number(weather.current_temp ?? weather.feels_like);
    if (!Number.isFinite(tempValue) || tempValue < -60 || tempValue > 60) {
      return NextResponse.json({ ok: false, error: "날씨 정보가 올바르지 않습니다." }, { status: 400 });
    }

    const itemIds = items.map((item) => Number(item.id)).filter((id) => Number.isFinite(id));
    // 아이템별 고유 outfit ID 집합 (중복 착용 횟수 방지)
    const wearOutfitIds: Record<number, Set<number>> = {};
    const recentWearDates: Record<number, string> = {};

    if (itemIds.length > 0) {
      const [
        { data: outfitItems, error: outfitItemError },
        { data: outfits, error: outfitError },
      ] = await Promise.all([
        admin.from("outfit_item").select("item_id,outfit_id").in("item_id", itemIds),
        admin.from("outfit").select("id,date").eq("user_id", appUserId),
      ]);

      if (outfitItemError || outfitError) {
        return NextResponse.json({ ok: false, error: "착용 기록을 불러오지 못했어요." }, { status: 500 });
      }

      const outfitDateById = new Map<number, string>();
      (outfits || []).forEach((row) => {
        const outfitId = Number(row.id);
        const date = row.date ? String(row.date).slice(0, 10) : "";
        if (Number.isFinite(outfitId) && date) {
          outfitDateById.set(outfitId, date);
        }
      });

      const assignRecentWearDate = (itemId: number, nextDate: string) => {
        if (!nextDate) return;
        const current = recentWearDates[itemId] || "";
        if (!current || nextDate > current) {
          recentWearDates[itemId] = nextDate;
        }
      };

      (outfitItems || []).forEach((row) => {
        const itemId = Number(row.item_id);
        const outfitId = Number(row.outfit_id);
        if (!Number.isFinite(itemId) || !Number.isFinite(outfitId)) return;
        (wearOutfitIds[itemId] ??= new Set()).add(outfitId);
        assignRecentWearDate(itemId, outfitDateById.get(outfitId) || "");
      });
    }

    // Set 크기를 실제 착용 횟수로 변환
    const wearCounts: Record<number, number> = {};
    Object.entries(wearOutfitIds).forEach(([id, outfitIds]) => {
      wearCounts[Number(id)] = outfitIds.size;
    });

    const recommendationItems = items.map((item) => ({
      ...item,
      wear_count: wearCounts[Number(item.id)] ?? 0,
      recent_wear_date: recentWearDates[Number(item.id)] ?? null,
    }));

    const recommendation = recommendOutfit(recommendationItems, {
      ...weather,
      regionLabel: body.regionLabel || weather.regionLabel,
    });

    return NextResponse.json({ ok: true, data: recommendation });
  } catch {
    return NextResponse.json({ ok: false, error: "코디 추천을 생성하지 못했습니다." }, { status: 500 });
  }
}
