import { makeDisplayNameFromFields, normalizePublicImagePath, toText } from "@/lib/wardrobe";

export type RecommendationWeatherInput = {
  regionLabel?: string;
  current_temp?: number | null;
  feels_like?: number | null;
  t_min?: number | null;
  t_max?: number | null;
  humidity?: number | null;
  rain?: boolean | null;
  desc?: string | null;
  precipitation_type?: string | null;
  precipitation_probability?: number | null;
  precipitation_amount?: string | null;
};

export type RecommendationItemRow = {
  id: number;
  brand?: unknown;
  product_name?: unknown;
  category?: unknown;
  detail_category?: unknown;
  color?: unknown;
  season?: unknown;
  thickness?: unknown;
  image_path?: unknown;
  wear_count?: unknown;
  recent_wear_date?: unknown;
};

export type RecommendationPart = {
  slot: "Top" | "Bottom" | "Outer" | "Shoes" | "ACC";
  item: {
    id: number;
    name: string;
    category: string | null;
    detail_category: string | null;
    color: string | null;
    thickness: string | null;
    season: string[];
    image_path: string | null;
  };
  score: number;
  reasons: string[];
};

export type RecommendationLook = {
  title: "stable" | "variation" | "underused";
  summary: string;
  reasons: string[];
  parts: RecommendationPart[];
  missingSlots: string[];
  totalScore: number;
};

export type RecommendationResult = {
  context: {
    effectiveTemp: number;
    tempBand: string;
    isRainy: boolean;
    regionLabel: string;
  };
  looks: RecommendationLook[];
};

type Slot = RecommendationPart["slot"];
type Profile = RecommendationLook["title"];

type NormalizedItem = {
  id: number;
  name: string;
  category: Slot | "";
  detailCategory: string;
  color: string;
  thickness: "light" | "medium" | "heavy" | "";
  seasons: string[];
  imagePath: string | null;
  wearCount: number;
  recentWearDate: string | null;
};

type RecommendationContext = {
  effectiveTemp: number;
  tempBand: "freezing" | "cold" | "mild" | "warm" | "hot";
  expectedSeasons: string[];
  preferredThicknesses: Array<"light" | "medium" | "heavy">;
  wantsOuter: boolean;
  wantsAccessories: boolean;
  isRainy: boolean;
  regionLabel: string;
};

type Candidate = {
  item: NormalizedItem;
  score: number;
  reasons: string[];
};

const SLOT_ORDER: Slot[] = ["Top", "Bottom", "Outer", "Shoes", "ACC"];
const NEUTRAL_COLORS = new Set([
  "black",
  "charcoal",
  "white",
  "gray",
  "ivory",
  "beige",
  "brown",
  "navy",
]);
const VIVID_COLORS = new Set(["red", "orange", "yellow", "green", "pink", "purple", "burgundy"]);

const GOOD_COLOR_PAIRS = new Map<string, number>([
  ["black|white", 14],
  ["black|gray", 12],
  ["black|charcoal", 12],
  ["black|beige", 10],
  ["navy|white", 14],
  ["navy|beige", 12],
  ["gray|white", 10],
  ["beige|brown", 14],
  ["light_blue_denim|white", 16],
  ["medium_blue_denim|white", 14],
  ["dark_blue_denim|white", 12],
  ["black_denim|gray", 12],
  ["black_denim|charcoal", 12],
  ["burgundy|black", 12],
  ["burgundy|gray", 10],
]);

const BAD_COLOR_PAIRS = new Map<string, number>([
  ["red|orange", -12],
  ["red|pink", -10],
  ["yellow|orange", -10],
  ["purple|red", -10],
  ["green|red", -14],
  ["pink|orange", -10],
]);

function toFiniteNumber(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
}

function normalizeCategory(value: unknown): NormalizedItem["category"] {
  const text = toText(value).toLowerCase();
  if (["top", "tops"].includes(text)) return "Top";
  if (["bottom", "bottoms"].includes(text)) return "Bottom";
  if (["outer", "outerwear"].includes(text)) return "Outer";
  if (["shoes", "footwear"].includes(text)) return "Shoes";
  if (["acc", "accessories", "accessory"].includes(text)) return "ACC";
  return "";
}

function normalizeThickness(value: unknown): NormalizedItem["thickness"] {
  const text = toText(value).toLowerCase();
  if (text === "light" || text === "medium" || text === "heavy") return text;
  return "";
}

function normalizeSeasons(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((entry) => toText(entry).toLowerCase()).filter(Boolean)));
  }
  const text = toText(value).toLowerCase();
  return text ? [text] : [];
}

function normalizeItem(row: RecommendationItemRow): NormalizedItem {
  const imagePath = toText(row.image_path);

  return {
    id: Number(row.id),
    name: makeDisplayNameFromFields(row.brand, row.product_name),
    category: normalizeCategory(row.category),
    detailCategory: toText(row.detail_category).toLowerCase(),
    color: toText(row.color).toLowerCase(),
    thickness: normalizeThickness(row.thickness),
    seasons: normalizeSeasons(row.season),
    imagePath: imagePath ? normalizePublicImagePath(imagePath) : null,
    wearCount: Math.max(0, Number(row.wear_count) || 0),
    recentWearDate: toText(row.recent_wear_date) || null,
  };
}

function daysSince(dateText: string | null): number | null {
  if (!dateText) return null;
  const parsed = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((today.getTime() - parsed.getTime()) / 86_400_000);
}

function buildContext(weather: RecommendationWeatherInput): RecommendationContext {
  const current = toFiniteNumber(weather.current_temp);
  const feelsLike = toFiniteNumber(weather.feels_like);
  const tMin = toFiniteNumber(weather.t_min);
  const tMax = toFiniteNumber(weather.t_max);
  const fallbackAverage = tMin != null && tMax != null ? (tMin + tMax) / 2 : current ?? 20;
  const effectiveTemp = feelsLike ?? current ?? fallbackAverage;
  const precipType = toText(weather.precipitation_type).toLowerCase();
  const isRainy =
    Boolean(weather.rain) ||
    ["rain", "shower", "snow", "drizzle"].some((token) => precipType.includes(token));
  if (effectiveTemp <= 4) {
    return {
      effectiveTemp,
      tempBand: "freezing",
      expectedSeasons: ["winter"],
      preferredThicknesses: ["heavy", "medium"],
      wantsOuter: true,
      wantsAccessories: true,
      isRainy,
      regionLabel: toText(weather.regionLabel) || "선택 지역",
    };
  }
  if (effectiveTemp <= 12) {
    return {
      effectiveTemp,
      tempBand: "cold",
      expectedSeasons: ["winter", "fall"],
      preferredThicknesses: ["medium", "heavy"],
      wantsOuter: true,
      wantsAccessories: isRainy,
      isRainy,
      regionLabel: toText(weather.regionLabel) || "선택 지역",
    };
  }
  if (effectiveTemp <= 22) {
    return {
      effectiveTemp,
      tempBand: "mild",
      expectedSeasons: ["spring", "fall"],
      preferredThicknesses: ["medium", "light"],
      wantsOuter: isRainy,
      wantsAccessories: false,
      isRainy,
      regionLabel: toText(weather.regionLabel) || "선택 지역",
    };
  }
  if (effectiveTemp <= 28) {
    return {
      effectiveTemp,
      tempBand: "warm",
      expectedSeasons: ["summer", "spring"],
      preferredThicknesses: ["light", "medium"],
      wantsOuter: isRainy,
      wantsAccessories: false,
      isRainy,
      regionLabel: toText(weather.regionLabel) || "선택 지역",
    };
  }
  return {
    effectiveTemp,
    tempBand: "hot",
    expectedSeasons: ["summer"],
    preferredThicknesses: ["light"],
    wantsOuter: false,
    wantsAccessories: false,
    isRainy,
    regionLabel: toText(weather.regionLabel) || "선택 지역",
  };
}

function pushReason(reasons: string[], text: string) {
  if (!reasons.includes(text)) reasons.push(text);
}

function scoreSeason(item: NormalizedItem, context: RecommendationContext, reasons: string[]): number {
  if (item.seasons.length === 0) return 0;
  if (item.seasons.some((season) => context.expectedSeasons.includes(season))) {
    pushReason(reasons, "계절이 잘 맞아요");
    return 18;
  }
  return -12;
}

function scoreThickness(item: NormalizedItem, context: RecommendationContext, reasons: string[]): number {
  if (!item.thickness) return 0;
  const index = context.preferredThicknesses.indexOf(item.thickness);
  if (index === 0) {
    pushReason(reasons, "두께가 잘 맞아요");
    return 18;
  }
  if (index === 1) return 10;
  if (item.thickness === "heavy" && (context.tempBand === "warm" || context.tempBand === "hot")) return -24;
  if (item.thickness === "light" && (context.tempBand === "freezing" || context.tempBand === "cold")) return -18;
  return -6;
}

function scoreDetail(item: NormalizedItem, slot: Slot, context: RecommendationContext, reasons: string[]): number {
  const detail = item.detailCategory;
  let score = 0;

  if (slot === "Outer") {
    if (context.isRainy && ["windbreaker", "jacket", "hood_zipup"].includes(detail)) {
      pushReason(reasons, "비 오는 날에 무난해요");
      score += 16;
    }
    if ((context.tempBand === "warm" || context.tempBand === "hot") && ["padding", "coat", "fleece"].includes(detail)) {
      score -= 28;
    }
    if ((context.tempBand === "freezing" || context.tempBand === "cold") && ["padding", "coat", "fleece", "leather_jacket"].includes(detail)) {
      pushReason(reasons, "보온감이 좋아요");
      score += 14;
    }
  }

  if (slot === "Top") {
    if ((context.tempBand === "warm" || context.tempBand === "hot") && ["short_sleeve_tshirt", "sleeveless"].includes(detail)) {
      pushReason(reasons, "가볍게 입기 좋아요");
      score += 16;
    }
    if ((context.tempBand === "freezing" || context.tempBand === "cold") && ["knit", "hoodie", "sweatshirt", "long_sleeve_tshirt"].includes(detail)) {
      pushReason(reasons, "추운 날에 잘 맞아요");
      score += 14;
    }
    if ((context.tempBand === "freezing" || context.tempBand === "cold") && ["sleeveless", "short_sleeve_tshirt"].includes(detail)) {
      score -= 22;
    }
  }

  if (slot === "Bottom") {
    if ((context.tempBand === "warm" || context.tempBand === "hot") && ["shorts", "skirt"].includes(detail)) {
      pushReason(reasons, "가볍게 입기 좋아요");
      score += 14;
    }
    if ((context.tempBand === "freezing" || context.tempBand === "cold") && ["leggings", "jeans", "slacks", "cotton_pants", "cargo_pants"].includes(detail)) {
      pushReason(reasons, "기온에 잘 맞아요");
      score += 12;
    }
    if ((context.tempBand === "freezing" || context.tempBand === "cold") && detail === "shorts") {
      score -= 24;
    }
  }

  if (slot === "Shoes" && context.isRainy && ["black", "brown", "navy", "charcoal"].includes(item.color)) {
    pushReason(reasons, "비 오는 날에 무난해요");
    score += 8;
  }

  if (slot === "ACC" && context.isRainy) {
    pushReason(reasons, "비 대비에 좋아요");
    score += 6;
  }

  return score;
}

function scoreColor(item: NormalizedItem, context: RecommendationContext, reasons: string[]): number {
  if (!item.color) return 0;
  if (context.isRainy && ["black", "navy", "gray", "charcoal", "brown", "khaki", "black_denim"].includes(item.color)) {
    pushReason(reasons, "비 오는 날에 무난해요");
    return 8;
  }
  if ((context.tempBand === "warm" || context.tempBand === "hot") && ["white", "ivory", "beige", "light_blue_denim"].includes(item.color)) {
    pushReason(reasons, "가벼운 색 조합이에요");
    return 8;
  }
  return 0;
}

function scoreWearHistory(item: NormalizedItem, reasons: string[]): number {
  const days = daysSince(item.recentWearDate);

  if (item.wearCount === 0) {
    pushReason(reasons, "아직 안 입은 아이템이에요");
    return 18;
  }
  if (days != null) {
    if (days <= 2) return -18;
    if (days <= 6) return -8;
    if (days >= 30) {
      pushReason(reasons, "최근 안 입은 아이템이에요");
      return 16;
    }
    if (days >= 14) {
      pushReason(reasons, "오랜만에 꺼내기 좋아요");
      return 10;
    }
  }
  if (item.wearCount >= 12) return -6;
  if (item.wearCount <= 2) {
    pushReason(reasons, "활용도를 높이기 좋아요");
    return 8;
  }
  return 0;
}

function shouldIncludeSlot(slot: Slot, context: RecommendationContext): boolean {
  if (slot === "Top" || slot === "Bottom" || slot === "Shoes") return true;
  if (slot === "Outer") return context.wantsOuter;
  return context.wantsAccessories;
}

function scoreItemForSlot(item: NormalizedItem, slot: Slot, context: RecommendationContext): Candidate | null {
  if (item.category !== slot) return null;

  const reasons: string[] = [];
  let score = 40;

  score += scoreSeason(item, context, reasons);
  score += scoreThickness(item, context, reasons);
  score += scoreDetail(item, slot, context, reasons);
  score += scoreColor(item, context, reasons);
  score += scoreWearHistory(item, reasons);

  if (slot === "Outer" && !context.wantsOuter) score -= 20;
  if (slot === "ACC" && !context.wantsAccessories) score -= 12;

  return { item, score, reasons };
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

function scoreColorPair(a: NormalizedItem | undefined, b: NormalizedItem | undefined, context: RecommendationContext) {
  if (!a || !b || !a.color || !b.color || a.id === b.id) {
    return { score: 0, reason: null as string | null };
  }

  const key = pairKey(a.color, b.color);
  if (GOOD_COLOR_PAIRS.has(key)) return { score: GOOD_COLOR_PAIRS.get(key) || 0, reason: "색 조합이 안정적이에요" };
  if (BAD_COLOR_PAIRS.has(key)) return { score: BAD_COLOR_PAIRS.get(key) || 0, reason: "색 조합이 강해서 호불호가 있어요" };

  if (NEUTRAL_COLORS.has(a.color) && NEUTRAL_COLORS.has(b.color)) {
    return { score: 10, reason: "무난한 색 조합이에요" };
  }

  if (
    [a.color, b.color].some((color) => color.includes("denim")) &&
    [a.color, b.color].some((color) => ["white", "ivory", "gray", "charcoal", "black", "navy", "beige"].includes(color))
  ) {
    return { score: 12, reason: "데님과 기본색 조합이에요" };
  }

  if (
    context.isRainy &&
    ["black", "navy", "gray", "charcoal", "brown", "khaki", "black_denim"].includes(a.color) &&
    ["black", "navy", "gray", "charcoal", "brown", "khaki", "black_denim"].includes(b.color)
  ) {
    return { score: 8, reason: "비 오는 날에 무난한 조합이에요" };
  }

  if (
    (context.tempBand === "warm" || context.tempBand === "hot") &&
    ["white", "ivory", "beige", "light_blue_denim"].includes(a.color) &&
    ["white", "ivory", "beige", "light_blue_denim", "blue"].includes(b.color)
  ) {
    return { score: 8, reason: "가벼운 색 조합이에요" };
  }

  if (VIVID_COLORS.has(a.color) && VIVID_COLORS.has(b.color)) {
    return { score: -8, reason: "포인트 색이 겹쳐 보여요" };
  }

  return { score: 0, reason: null as string | null };
}

function addComboBonus(parts: RecommendationPart[], context: RecommendationContext) {
  const normalizedBySlot = new Map<Slot, NormalizedItem>();
  const partBySlot = new Map<Slot, RecommendationPart>();

  parts.forEach((part) => {
    partBySlot.set(part.slot, part);
    normalizedBySlot.set(part.slot, {
      id: part.item.id,
      name: part.item.name,
      category: part.slot,
      detailCategory: part.item.detail_category || "",
      color: part.item.color || "",
      thickness: (part.item.thickness as NormalizedItem["thickness"]) || "",
      seasons: part.item.season,
      imagePath: part.item.image_path,
      wearCount: 0,
      recentWearDate: null,
    });
  });

  const pairs: Array<[Slot, Slot]> = [
    ["Top", "Bottom"],
    ["Top", "Outer"],
    ["Bottom", "Shoes"],
  ];

  pairs.forEach(([left, right]) => {
    const result = scoreColorPair(normalizedBySlot.get(left), normalizedBySlot.get(right), context);
    if (!result.reason || result.score === 0) return;
    const leftPart = partBySlot.get(left);
    const rightPart = partBySlot.get(right);
    if (!leftPart || !rightPart) return;
    leftPart.score += result.score;
    rightPart.score += result.score;
    pushReason(leftPart.reasons, result.reason);
    pushReason(rightPart.reasons, result.reason);
  });
}

function sameColorPenalty(parts: RecommendationPart[]): number {
  const counts = new Map<string, number>();
  parts.forEach((part) => {
    const color = part.item.color || "";
    if (!color) return;
    counts.set(color, (counts.get(color) || 0) + 1);
  });

  let score = 0;
  counts.forEach((count, color) => {
    if (count >= 3) {
      if (NEUTRAL_COLORS.has(color)) score += 4;
      else score -= 14;
    }
  });
  return score;
}

function detailComboScore(parts: RecommendationPart[], context: RecommendationContext): number {
  const bySlot = new Map(parts.map((part) => [part.slot, part]));
  const top = bySlot.get("Top");
  const bottom = bySlot.get("Bottom");
  const outer = bySlot.get("Outer");
  const shoes = bySlot.get("Shoes");

  let score = 0;

  if (top && bottom) {
    const topDetail = top.item.detail_category || "";
    const bottomDetail = bottom.item.detail_category || "";

    if (["shirt", "blouse", "knit", "polo_shirt"].includes(topDetail) && ["slacks", "skirt"].includes(bottomDetail)) {
      score += 12;
    }
    if (["hoodie", "sweatshirt"].includes(topDetail) && ["cargo_pants", "jeans", "jogger_pants"].includes(bottomDetail)) {
      score += 10;
    }
    if (topDetail === "sleeveless" && ["shorts", "skirt"].includes(bottomDetail)) {
      score += context.tempBand === "warm" || context.tempBand === "hot" ? 12 : -8;
    }
    if (["shirt", "blouse"].includes(topDetail) && ["jogger_pants", "cargo_pants"].includes(bottomDetail)) {
      score -= 10;
    }
  }

  if (outer && top) {
    const outerDetail = outer.item.detail_category || "";
    const topDetail = top.item.detail_category || "";

    if (["blazer", "jacket", "coat"].includes(outerDetail) && ["shirt", "blouse", "knit"].includes(topDetail)) {
      score += 12;
    }
    if (["windbreaker", "hood_zipup"].includes(outerDetail) && ["short_sleeve_tshirt", "long_sleeve_tshirt", "hoodie"].includes(topDetail)) {
      score += 8;
    }
    if ((context.tempBand === "warm" || context.tempBand === "hot") && ["padding", "fleece"].includes(outerDetail)) {
      score -= 16;
    }
  }

  if (bottom && shoes) {
    const bottomDetail = bottom.item.detail_category || "";
    const shoeColor = shoes.item.color || "";

    if (bottomDetail === "slacks" && ["black", "brown", "navy"].includes(shoeColor)) {
      score += 8;
    }
    if (bottomDetail === "shorts" && context.tempBand !== "warm" && context.tempBand !== "hot") {
      score -= 10;
    }
  }

  return score;
}

function candidateFreshnessBonus(candidate: Candidate): number {
  const days = daysSince(candidate.item.recentWearDate);
  if (candidate.item.wearCount === 0) return 18;
  if (days == null) return 0;
  if (days >= 30) return 16;
  if (days >= 14) return 10;
  if (days <= 2) return -12;
  return 0;
}

function profileLookBonus(selected: Candidate[], profile: Profile, stableIds: Set<number>): number {
  const ids = new Set(selected.map((candidate) => candidate.item.id));
  const neutralCount = selected.filter((candidate) => NEUTRAL_COLORS.has(candidate.item.color || "")).length;
  const vividCount = selected.filter((candidate) => VIVID_COLORS.has(candidate.item.color || "")).length;
  const freshScore = selected.reduce((sum, candidate) => sum + candidateFreshnessBonus(candidate), 0);
  const overlapCount = Array.from(ids).filter((id) => stableIds.has(id)).length;

  if (profile === "stable") {
    return neutralCount * 6 - vividCount * 4;
  }
  if (profile === "variation") {
    return vividCount * 10 - overlapCount * 8;
  }
  return freshScore - overlapCount * 6;
}

function scoreLook(selected: Candidate[], parts: RecommendationPart[], context: RecommendationContext, profile: Profile, stableIds: Set<number>) {
  return (
    parts.reduce((sum, part) => sum + part.score, 0) +
    sameColorPenalty(parts) +
    detailComboScore(parts, context) +
    profileLookBonus(selected, profile, stableIds)
  );
}

function profileAdjustment(item: NormalizedItem, profile: Profile, stableIds: Set<number>): number {
  const days = daysSince(item.recentWearDate) ?? 999;
  const isNeutral = NEUTRAL_COLORS.has(item.color);
  const isBold = VIVID_COLORS.has(item.color);

  if (profile === "stable") {
    let score = 0;
    if (isNeutral) score += 10;
    if (item.wearCount >= 3) score += 8;
    if (days <= 14) score += 4;
    if (isBold) score -= 6;
    return score;
  }

  if (profile === "variation") {
    let score = 0;
    if (isBold) score += 10;
    if (!isNeutral) score += 6;
    if (stableIds.has(item.id)) score -= 12;
    if (item.detailCategory.includes("cargo") || item.detailCategory.includes("leather") || item.detailCategory.includes("blazer")) {
      score += 8;
    }
    return score;
  }

  let score = 0;
  if (item.wearCount === 0) score += 18;
  else if (days >= 30) score += 16;
  else if (days >= 14) score += 10;
  if (stableIds.has(item.id)) score -= 12;
  return score;
}

function buildLookSummary(profile: Profile, context: RecommendationContext): string {
  if (profile === "stable") {
    return context.isRainy ? "비 오는 날에도 무난한 조합이에요." : "오늘 날씨에 가장 안정적으로 입기 좋은 조합이에요.";
  }
  if (profile === "variation") {
    return "기본 조합에서 조금 변화를 준 추천이에요.";
  }
  return "최근 덜 입은 아이템을 살린 추천이에요.";
}

function buildLookReasons(profile: Profile, parts: RecommendationPart[], context: RecommendationContext): string[] {
  const merged = Array.from(new Set(parts.flatMap((part) => part.reasons)));
  const reasons: string[] = [];

  if (profile === "stable") {
    reasons.push(context.isRainy ? "비 오는 날에 무난한 조합" : "오늘 날씨에 무난한 조합");
  } else if (profile === "variation") {
    reasons.push("기본 추천보다 분위기를 바꾼 조합");
  } else {
    reasons.push("최근 안 입은 아이템을 살린 조합");
  }

  const shortReasonMap: Array<[string, string]> = [
    ["가벼운 색 조합", "가벼운 색 조합"],
    ["무난한 색 조합", "무난한 색 조합"],
    ["비 오는 날", "비 오는 날에 무난한 조합"],
    ["최근 안 입은", "최근 안 입은 아이템 활용"],
    ["아직 안 입은", "아직 안 입은 아이템 활용"],
    ["오랜만에", "오랜만에 꺼내기 좋은 조합"],
    ["활용도를 높이기", "활용도를 높이기 좋은 조합"],
    ["보온감", "보온감 있는 조합"],
    ["가볍게 입기", "가볍게 입기 좋은 조합"],
    ["기온에 잘 맞", "기온에 맞는 조합"],
    ["계절이 잘 맞", "계절감이 맞는 조합"],
    ["두께가 잘 맞", "두께가 잘 맞는 조합"],
    ["데님과 기본색", "데님과 기본색 조합"],
  ];

  merged.forEach((reason) => {
    const match = shortReasonMap.find(([pattern]) => reason.includes(pattern));
    if (match) pushReason(reasons, match[1]);
  });

  return reasons.slice(0, 3);
}

function createLook(selected: Candidate[], missingSlots: string[], context: RecommendationContext, profile: Profile, stableIds: Set<number>): RecommendationLook {
  const parts: RecommendationPart[] = selected
    .map((candidate) => ({
      slot: candidate.item.category as Slot,
      item: {
        id: candidate.item.id,
        name: candidate.item.name,
        category: candidate.item.category || null,
        detail_category: candidate.item.detailCategory || null,
        color: candidate.item.color || null,
        thickness: candidate.item.thickness || null,
        season: candidate.item.seasons,
        image_path: candidate.item.imagePath,
      },
      score: candidate.score,
      reasons: candidate.reasons.slice(0, 2),
    }))
    .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));

  addComboBonus(parts, context);

  return {
    title: profile,
    summary: buildLookSummary(profile, context),
    reasons: buildLookReasons(profile, parts, context),
    parts,
    missingSlots,
    totalScore: scoreLook(selected, parts, context, profile, stableIds),
  };
}

function buildCombinations(requiredSlots: Slot[], candidatesBySlot: Map<Slot, Candidate[]>) {
  const combinations: Candidate[][] = [];

  function walk(index: number, current: Candidate[]) {
    if (index >= requiredSlots.length) {
      combinations.push([...current]);
      return;
    }

    const slot = requiredSlots[index];
    const slotCandidates = candidatesBySlot.get(slot) || [];
    if (slotCandidates.length === 0) {
      walk(index + 1, current);
      return;
    }

    slotCandidates.forEach((candidate) => {
      if (current.some((entry) => entry.item.id === candidate.item.id)) return;
      current.push(candidate);
      walk(index + 1, current);
      current.pop();
    });
  }

  walk(0, []);
  return combinations;
}

export function recommendOutfit(rows: RecommendationItemRow[], weather: RecommendationWeatherInput): RecommendationResult {
  const context = buildContext(weather);
  const items = rows.map(normalizeItem).filter((item) => item.id > 0 && item.category);
  const requiredSlots = SLOT_ORDER.filter((slot) => shouldIncludeSlot(slot, context));
  const candidatesBySlot = new Map<Slot, Candidate[]>();

  requiredSlots.forEach((slot) => {
    const slotCandidates = items
      .map((item) => scoreItemForSlot(item, slot, context))
      .filter((entry): entry is Candidate => Boolean(entry))
      .sort((a, b) => b.score - a.score || a.item.id - b.item.id)
      .slice(0, 4);
    candidatesBySlot.set(slot, slotCandidates);
  });

  const stableIds = new Set<number>();
  const looks: RecommendationLook[] = [];
  const profiles: Profile[] = ["stable", "variation", "underused"];
  const combinations = buildCombinations(requiredSlots, candidatesBySlot);

  profiles.forEach((profile) => {
    const missingSlots = requiredSlots.filter((slot) => (candidatesBySlot.get(slot) || []).length === 0);
    const selected =
      combinations
        .map((combination) => {
          const adjusted = combination.map((candidate, index) => ({
            ...candidate,
            score: candidate.score + profileAdjustment(candidate.item, profile, stableIds) - index,
          }));
          const previewParts: RecommendationPart[] = adjusted.map((candidate) => ({
            slot: candidate.item.category as Slot,
            item: {
              id: candidate.item.id,
              name: candidate.item.name,
              category: candidate.item.category || null,
              detail_category: candidate.item.detailCategory || null,
              color: candidate.item.color || null,
              thickness: candidate.item.thickness || null,
              season: candidate.item.seasons,
              image_path: candidate.item.imagePath,
            },
            score: candidate.score,
            reasons: candidate.reasons.slice(0, 2),
          }));
          addComboBonus(previewParts, context);
          return {
            adjusted,
            score: scoreLook(adjusted, previewParts, context, profile, stableIds),
          };
        })
        .sort((a, b) => b.score - a.score)[0]?.adjusted || [];

    if (selected.length === 0) return;
    if (profile === "stable") {
      selected.forEach((candidate) => stableIds.add(candidate.item.id));
    }

    looks.push(createLook(selected, missingSlots, context, profile, stableIds));
  });

  return {
    context: {
      effectiveTemp: context.effectiveTemp,
      tempBand: context.tempBand,
      isRainy: context.isRainy,
      regionLabel: context.regionLabel,
    },
    looks,
  };
}
