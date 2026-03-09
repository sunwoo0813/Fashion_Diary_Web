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

    const recommendation = recommendOutfit(items, {
      ...weather,
      regionLabel: body.regionLabel || weather.regionLabel,
    });

    return NextResponse.json({ ok: true, data: recommendation });
  } catch {
    return NextResponse.json({ ok: false, error: "코디 추천을 생성하지 못했습니다." }, { status: 500 });
  }
}
