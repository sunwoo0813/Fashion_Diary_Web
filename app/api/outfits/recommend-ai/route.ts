import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { recommendOutfit, type WardrobeItem } from "@/lib/ai/recommendOutfit";
import { getOrCreateAppUserId } from "@/lib/app-user";
import type { RecommendationWeatherInput } from "@/lib/outfit-recommendation";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { makeDisplayNameFromFields, normalizePublicImagePath, toText } from "@/lib/wardrobe";

type RequestBody = {
  weather?: RecommendationWeatherInput;
  regionLabel?: string;
  comment?: string;
};

function toFiniteNumber(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeCategory(value: unknown): "Top" | "Bottom" | "Outer" | "Shoes" | "ACC" | null {
  const text = toText(value).toLowerCase();
  if (["top", "tops"].includes(text)) return "Top";
  if (["bottom", "bottoms"].includes(text)) return "Bottom";
  if (["outer", "outerwear"].includes(text)) return "Outer";
  if (["shoes", "footwear"].includes(text)) return "Shoes";
  if (["acc", "accessories", "accessory"].includes(text)) return "ACC";
  return null;
}

function normalizeWeatherInput(weather: RecommendationWeatherInput) {
  const wind = "wind" in weather ? toText((weather as RecommendationWeatherInput & { wind?: unknown }).wind) : "";

  return {
    temperature: toFiniteNumber(weather.current_temp) ?? 20,
    feels_like: toFiniteNumber(weather.feels_like) ?? toFiniteNumber(weather.current_temp) ?? 20,
    min: toFiniteNumber(weather.t_min) ?? toFiniteNumber(weather.current_temp) ?? 20,
    max: toFiniteNumber(weather.t_max) ?? toFiniteNumber(weather.current_temp) ?? 20,
    condition: toText(weather.desc) || "unknown",
    rain: Boolean(weather.rain),
    wind: wind || "unknown",
  };
}

function toDateOnly(value: unknown) {
  const text = toText(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function daysAgoFromDate(dateText: string | null) {
  if (!dateText) return null;
  const parsed = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((today.getTime() - parsed.getTime()) / 86_400_000);
}

function deriveColorFamily(color: unknown) {
  const value = toText(color).toLowerCase();
  const explicitMap: Record<string, string> = {
    light_blue_denim: "light_blue",
    medium_blue_denim: "blue",
    dark_blue_denim: "dark_blue",
    raw_denim: "deep_navy",
    black_denim: "black",
    gray_denim: "gray",
    white_denim: "white",
  };

  if (explicitMap[value]) return explicitMap[value];
  if (!value) return undefined;
  return value.includes("denim") ? "denim" : value;
}

function isNeutralFamily(colorFamily: string | undefined) {
  return Boolean(colorFamily && ["black", "white", "gray", "charcoal", "navy", "beige", "ivory", "deep_navy"].includes(colorFamily));
}

function buildStyleHint(category: unknown, detailCategory: unknown, color: unknown, thickness: unknown) {
  const normalizedCategory = normalizeCategory(category);
  const detail = toText(detailCategory).toLowerCase();
  const colorFamily = deriveColorFamily(color);
  const normalizedThickness = toText(thickness).toLowerCase();
  if (!normalizedCategory) return undefined;

  if (normalizedCategory === "Top") {
    if (["shirt", "blouse", "polo_shirt"].includes(detail)) {
      return isNeutralFamily(colorFamily) ? "단정한 스마트 캐주얼 상의" : "깔끔하게 포인트 주기 좋은 상의";
    }
    if (["hoodie", "sweatshirt"].includes(detail)) return "편하게 입기 좋은 캐주얼 상의";
    if (detail === "knit") {
      return normalizedThickness === "heavy" ? "포근한 무드의 니트 상의" : "부드러운 분위기의 니트 상의";
    }
    if (["short_sleeve_tshirt", "long_sleeve_tshirt"].includes(detail)) {
      return isNeutralFamily(colorFamily) ? "기본으로 입기 좋은 깔끔한 상의" : "가볍게 풀어 입기 좋은 상의";
    }
    if (detail === "sleeveless") return "가볍고 시원한 분위기의 상의";
  }

  if (normalizedCategory === "Bottom") {
    if (detail === "slacks") return "정돈된 인상을 주는 하의";
    if (detail === "jeans") {
      if (["light_blue", "blue"].includes(colorFamily || "")) return "가볍고 캐주얼한 데님 하의";
      if (["dark_blue", "deep_navy", "black", "gray"].includes(colorFamily || "")) return "깔끔하게 정리되는 데님 하의";
      return "활용도 높은 데님 하의";
    }
    if (detail === "cargo_pants") return "편하게 포인트 주기 좋은 카고 하의";
    if (detail === "jogger_pants") return "활동하기 편한 스포티한 하의";
    if (detail === "cotton_pants") return "무난한 스마트 캐주얼 하의";
    if (detail === "shorts") return "가볍게 입기 좋은 하의";
    if (detail === "skirt") return "부드럽게 꾸민 느낌을 주는 하의";
  }

  if (normalizedCategory === "Outer") {
    if (["coat", "padding"].includes(detail)) return "보온감 있게 마무리해주는 아우터";
    if (detail === "blazer") return "단정하고 구조감 있는 아우터";
    if (detail === "jacket") return isNeutralFamily(colorFamily) ? "깔끔하게 정리되는 아우터" : "무난하게 활용하기 좋은 아우터";
    if (["windbreaker", "hood_zipup"].includes(detail)) return "가볍게 걸치기 좋은 아우터";
    if (detail === "cardigan") return "부드럽게 레이어드하기 좋은 아우터";
    if (detail === "leather_jacket") return "분위기를 살려주는 포인트 아우터";
    if (detail === "fleece") return "편안하고 포근한 아우터";
  }

  if (normalizedCategory === "Shoes") {
    return isNeutralFamily(colorFamily) ? "매일 신기 좋은 무난한 신발" : "코디에 포인트를 주는 신발";
  }

  if (normalizedCategory === "ACC") {
    return "코디를 마무리하는 액세서리";
  }

  return undefined;
}

function scoreWeatherFit(item: WardrobeItem, weather: RecommendationWeatherInput) {
  const effectiveTemp =
    toFiniteNumber(weather.feels_like) ??
    toFiniteNumber(weather.current_temp) ??
    ((toFiniteNumber(weather.t_min) ?? 20) + (toFiniteNumber(weather.t_max) ?? 20)) / 2;
  const isRainy = Boolean(weather.rain);
  const seasons = Array.isArray(item.season) ? item.season.map((value) => toText(value).toLowerCase()) : [];
  const thickness = toText(item.thickness).toLowerCase();
  const category = normalizeCategory(item.category);
  const detail = toText(item.detail_category).toLowerCase();
  const color = toText(item.color).toLowerCase();

  let score = 50;

  if (effectiveTemp <= 4) {
    if (seasons.some((season) => ["winter", "fall"].includes(season))) score += 18;
    if (["heavy", "medium"].includes(thickness)) score += 16;
    if (thickness === "light") score -= 18;
    if (category === "Outer") score += 12;
  } else if (effectiveTemp <= 12) {
    if (seasons.some((season) => ["winter", "fall", "spring"].includes(season))) score += 14;
    if (["medium", "heavy"].includes(thickness)) score += 12;
    if (thickness === "light" && category !== "ACC") score -= 10;
    if (category === "Outer") score += 8;
  } else if (effectiveTemp <= 22) {
    if (seasons.some((season) => ["spring", "fall"].includes(season))) score += 12;
    if (["light", "medium"].includes(thickness)) score += 10;
  } else {
    if (seasons.some((season) => ["summer", "spring"].includes(season))) score += 14;
    if (thickness === "light") score += 14;
    if (thickness === "heavy") score -= 24;
    if (category === "Outer") score -= 14;
  }

  if (isRainy) {
    if (category === "Outer" && ["windbreaker", "jacket", "hood_zipup"].includes(detail)) score += 14;
    if (["black", "navy", "gray", "charcoal", "brown", "black_denim"].includes(color)) score += 8;
  }

  return Math.max(0, Math.min(100, score));
}

function buildRecommendationHint(item: WardrobeItem, weather: RecommendationWeatherInput, wearCount: number, recentWornDaysAgo: number | null) {
  const hints: string[] = [];
  const effectiveTemp =
    toFiniteNumber(weather.feels_like) ??
    toFiniteNumber(weather.current_temp) ??
    ((toFiniteNumber(weather.t_min) ?? 20) + (toFiniteNumber(weather.t_max) ?? 20)) / 2;
  const detail = toText(item.detail_category).toLowerCase();
  const colorFamily = deriveColorFamily(item.color);
  const styleHint = buildStyleHint(item.category, item.detail_category, item.color, item.thickness);

  if (effectiveTemp <= 12 && ["knit", "coat", "padding", "hoodie", "long_sleeve_tshirt"].includes(detail)) {
    hints.push("쌀쌀한 날씨에 잘 맞음");
  }
  if (effectiveTemp >= 23 && ["short_sleeve_tshirt", "shorts", "sleeveless"].includes(detail)) {
    hints.push("더운 날 가볍게 입기 좋음");
  }
  if (Boolean(weather.rain) && ["windbreaker", "jacket", "hood_zipup"].includes(detail)) {
    hints.push("비 오는 날 활용하기 좋음");
  }
  if (colorFamily && ["black", "gray", "white", "navy", "beige", "deep_navy"].includes(colorFamily)) {
    hints.push("다른 색과 자연스럽게 어울림");
  }
  if (wearCount === 0) {
    hints.push("아직 입은 기록이 없음");
  } else if (recentWornDaysAgo != null && recentWornDaysAgo >= 14) {
    hints.push("최근 한동안 입지 않았음");
  }
  if (styleHint) {
    hints.push(styleHint);
  }

  return hints.join(" | ") || undefined;
}

async function buildWearMetadata(admin: ReturnType<typeof createServiceRoleSupabaseClient>, itemIds: number[]) {
  const [outfitItemsResult, photoItemsResult, outfitsResult, photosResult] = await Promise.all([
    admin.from("outfit_item").select("item_id,outfit_id").in("item_id", itemIds),
    admin.from("outfit_photo_item").select("item_id,photo_id").in("item_id", itemIds),
    admin.from("outfit").select("id,date"),
    admin.from("outfit_photo").select("id,outfit_id"),
  ]);

  if (outfitItemsResult.error) {
    throw new Error(`Failed to load outfit_item metadata: ${outfitItemsResult.error.message}`);
  }
  if (photoItemsResult.error) {
    throw new Error(`Failed to load outfit_photo_item metadata: ${photoItemsResult.error.message}`);
  }
  if (outfitsResult.error) {
    throw new Error(`Failed to load outfit metadata: ${outfitsResult.error.message}`);
  }
  if (photosResult.error) {
    throw new Error(`Failed to load outfit_photo metadata: ${photosResult.error.message}`);
  }

  const wearCounts: Record<number, number> = {};
  const recentWearDates: Record<number, string> = {};
  const outfitDateById = new Map<number, string>();
  const outfitIdByPhotoId = new Map<number, number>();

  (outfitsResult.data || []).forEach((row) => {
    const outfitId = Number(row.id);
    const date = toDateOnly(row.date);
    if (Number.isFinite(outfitId) && date) {
      outfitDateById.set(outfitId, date);
    }
  });

  (photosResult.data || []).forEach((row) => {
    const photoId = Number(row.id);
    const outfitId = Number(row.outfit_id);
    if (Number.isFinite(photoId) && Number.isFinite(outfitId)) {
      outfitIdByPhotoId.set(photoId, outfitId);
    }
  });

  function bump(itemId: number, date: string | null) {
    wearCounts[itemId] = (wearCounts[itemId] ?? 0) + 1;
    if (!date) return;
    const current = recentWearDates[itemId] || "";
    if (!current || date > current) {
      recentWearDates[itemId] = date;
    }
  }

  (outfitItemsResult.data || []).forEach((row) => {
    const itemId = Number(row.item_id);
    const outfitId = Number(row.outfit_id);
    if (!Number.isFinite(itemId) || !Number.isFinite(outfitId)) return;
    bump(itemId, outfitDateById.get(outfitId) || null);
  });

  (photoItemsResult.data || []).forEach((row) => {
    const itemId = Number(row.item_id);
    const photoId = Number(row.photo_id);
    if (!Number.isFinite(itemId) || !Number.isFinite(photoId)) return;
    const outfitId = outfitIdByPhotoId.get(photoId);
    bump(itemId, outfitId ? outfitDateById.get(outfitId) || null : null);
  });

  return { wearCounts, recentWearDates };
}

function toUiParts(
  itemIds: number[],
  itemMap: Map<number, WardrobeItem>,
) {
  return itemIds
    .map((id) => itemMap.get(id))
    .filter((item): item is WardrobeItem => Boolean(item))
    .map((item) => ({
      slot: normalizeCategory(item.category) ?? "ACC",
      item: {
        id: item.id,
        name: makeDisplayNameFromFields(item.brand ?? "", item.product_name ?? ""),
        category: normalizeCategory(item.category),
        detail_category: item.detail_category ?? null,
        color: item.color ?? null,
        thickness: item.thickness ?? null,
        season: item.season ?? [],
        image_path: item.image_path ? normalizePublicImagePath(item.image_path) : null,
      },
      score: 0,
      reasons: [],
    }));
}

export async function POST(request: Request) {
  const authUser = await getCurrentUser();
  if (!authUser?.email) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as RequestBody;
    const weather = body.weather;
    const comment = toText(body.comment).trim();

    if (!weather) {
      return NextResponse.json({ ok: false, error: "날씨 정보가 필요합니다." }, { status: 400 });
    }
    if (!comment) {
      return NextResponse.json(
        { ok: false, error: "AI 추천을 위해 오늘 상황을 입력해 주세요." },
        { status: 400 },
      );
    }

    const appUserId = await getOrCreateAppUserId(authUser.email);
    const admin = createServiceRoleSupabaseClient();

    const { data, error } = await admin
      .from("item")
      .select(
        "id,user_id,category,detail_category,brand,product_name,color,season,thickness,image_path,size,created_at",
      )
      .eq("user_id", appUserId);

    if (error) {
      console.error("[POST /api/outfits/recommend-ai] failed to load wardrobe items", error);
      return NextResponse.json({ ok: false, error: "옷장 정보를 불러오지 못했습니다." }, { status: 500 });
    }

    const baseWardrobeItems = ((data ?? []) as WardrobeItem[]).filter((item) => item.id > 0);
    const itemIds = baseWardrobeItems.map((item) => item.id);
    const { wearCounts, recentWearDates } = await buildWearMetadata(admin, itemIds);
    const wardrobeItems = baseWardrobeItems.map((item) => {
      const wearCount = wearCounts[item.id] ?? 0;
      const recentWearDate = recentWearDates[item.id] || null;
      const recentWornDaysAgo = daysAgoFromDate(recentWearDate);
      const weatherFitScore = scoreWeatherFit(item, weather);
      const colorFamily = deriveColorFamily(item.color);
      const styleHint = buildStyleHint(item.category, item.detail_category, item.color, item.thickness);

      return {
        ...item,
        wear_count: wearCount,
        recent_worn_days_ago: recentWornDaysAgo,
        weather_fit_score: weatherFitScore,
        color_family: colorFamily,
        style_hint: styleHint,
        recommendation_hint: buildRecommendationHint(item, weather, wearCount, recentWornDaysAgo),
      };
    });
    if (wardrobeItems.length === 0) {
      return NextResponse.json(
        { ok: false, error: "옷장에 아이템이 없어서 AI 추천을 만들 수 없습니다." },
        { status: 400 },
      );
    }

    const recommendation = await recommendOutfit({
      weather: normalizeWeatherInput(weather),
      userComment: comment,
      wardrobeItems,
    });

    const itemMap = new Map(wardrobeItems.map((item) => [item.id, item]));
    const parts = toUiParts(recommendation.look.item_ids, itemMap);
    const usedSlots = new Set(parts.map((part) => part.slot));
    const isOuterNeeded =
      (toFiniteNumber(weather.feels_like) ?? toFiniteNumber(weather.current_temp) ?? 20) <= 17 ||
      Boolean(weather.rain);
    const missingSlots = [
      "Top",
      "Bottom",
      "Shoes",
      ...(isOuterNeeded ? ["Outer"] : []),
    ].filter((slot) => !usedSlots.has(slot as "Top" | "Bottom" | "Shoes" | "Outer"));

    return NextResponse.json({
      ok: true,
      data: {
        summary: recommendation.summary,
        context: {
          effectiveTemp: toFiniteNumber(weather.feels_like) ?? toFiniteNumber(weather.current_temp) ?? 20,
          tempBand: "ai",
          isRainy: Boolean(weather.rain),
          regionLabel: body.regionLabel || weather.regionLabel || "선택 지역",
        },
        looks: [
          {
            title: "single",
            summary: recommendation.look.summary,
            reasons: [recommendation.look.reason],
            parts,
            missingSlots,
            totalScore: 0,
          },
        ],
      },
    });
  } catch (error) {
    console.error("[POST /api/outfits/recommend-ai] failed", error);
    const message = error instanceof Error ? error.message : "AI 추천을 만들지 못했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
