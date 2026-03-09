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

export type RecommendationResult = {
  summary: string;
  context: {
    effectiveTemp: number;
    tempBand: string;
    isRainy: boolean;
    regionLabel: string;
  };
  parts: RecommendationPart[];
  missingSlots: string[];
};

type Slot = RecommendationPart["slot"];

type NormalizedItem = {
  id: number;
  name: string;
  category: Slot | "";
  detailCategory: string;
  color: string;
  thickness: "light" | "medium" | "heavy" | "";
  seasons: string[];
  imagePath: string | null;
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

type SelectedCandidate = {
  item: NormalizedItem;
  score: number;
  reasons: string[];
};

const SLOT_ORDER: Slot[] = ["Top", "Bottom", "Outer", "Shoes", "ACC"];
const NEUTRAL_COLORS = new Set(["black", "white", "gray", "ivory", "beige", "brown", "navy"]);

const GOOD_COLOR_PAIRS = new Map<string, number>([
  ["black|white", 14],
  ["black|gray", 12],
  ["black|beige", 10],
  ["navy|white", 14],
  ["navy|beige", 12],
  ["gray|white", 10],
  ["beige|brown", 14],
  ["khaki|beige", 12],
  ["blue|white", 10],
  ["light_blue_denim|white", 16],
  ["medium_blue_denim|white", 14],
  ["dark_blue_denim|white", 12],
  ["light_blue_denim|ivory", 14],
  ["medium_blue_denim|beige", 12],
  ["black_denim|gray", 12],
  ["white_denim|navy", 12],
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

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
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
  return {
    id: Number(row.id),
    name: makeDisplayNameFromFields(row.brand, row.product_name),
    category: normalizeCategory(row.category),
    detailCategory: toText(row.detail_category).toLowerCase(),
    color: toText(row.color).toLowerCase(),
    thickness: normalizeThickness(row.thickness),
    seasons: normalizeSeasons(row.season),
    imagePath: toText(row.image_path) ? normalizePublicImagePath(toText(row.image_path)) : null,
  };
}

function buildContext(weather: RecommendationWeatherInput): RecommendationContext {
  const current = toFiniteNumber(weather.current_temp);
  const feelsLike = toFiniteNumber(weather.feels_like);
  const tMin = toFiniteNumber(weather.t_min);
  const tMax = toFiniteNumber(weather.t_max);
  const fallbackAverage = tMin != null && tMax != null ? (tMin + tMax) / 2 : current ?? 20;
  const effectiveTemp = feelsLike ?? current ?? fallbackAverage;
  const precipType = toText(weather.precipitation_type).toLowerCase();
  const isRainy = Boolean(weather.rain) || ["rain", "shower", "snow", "drizzle"].some((token) => precipType.includes(token));
  const regionLabel = toText(weather.regionLabel) || "선택 지역";

  if (effectiveTemp <= 4) {
    return {
      effectiveTemp,
      tempBand: "freezing",
      expectedSeasons: ["winter"],
      preferredThicknesses: ["heavy", "medium"],
      wantsOuter: true,
      wantsAccessories: true,
      isRainy,
      regionLabel,
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
      regionLabel,
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
      regionLabel,
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
      regionLabel,
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
    regionLabel,
  };
}

function scoreSeason(item: NormalizedItem, context: RecommendationContext, reasons: string[]): number {
  if (item.seasons.length === 0) return 0;
  if (item.seasons.some((season) => context.expectedSeasons.includes(season))) {
    reasons.push("현재 계절대와 잘 맞아요");
    return 18;
  }
  return -12;
}

function scoreThickness(item: NormalizedItem, context: RecommendationContext, reasons: string[]): number {
  if (!item.thickness) return 0;
  const index = context.preferredThicknesses.indexOf(item.thickness);
  if (index === 0) {
    reasons.push("두께감이 날씨에 잘 맞아요");
    return 20;
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
      reasons.push("비 오는 날에 어울리는 아우터예요");
      score += 18;
    }
    if ((context.tempBand === "warm" || context.tempBand === "hot") && ["padding", "coat", "fleece"].includes(detail)) {
      score -= 28;
    }
    if ((context.tempBand === "freezing" || context.tempBand === "cold") && ["padding", "coat", "fleece", "leather_jacket"].includes(detail)) {
      score += 16;
    }
  }

  if (slot === "Top") {
    if ((context.tempBand === "warm" || context.tempBand === "hot") && ["short_sleeve_tshirt", "sleeveless"].includes(detail)) {
      reasons.push("더운 날씨에 어울리는 상의예요");
      score += 18;
    }
    if ((context.tempBand === "freezing" || context.tempBand === "cold") && ["knit", "hoodie", "sweatshirt", "long_sleeve_tshirt"].includes(detail)) {
      reasons.push("선선한 날씨에 어울리는 상의예요");
      score += 16;
    }
    if ((context.tempBand === "freezing" || context.tempBand === "cold") && ["sleeveless", "short_sleeve_tshirt"].includes(detail)) {
      score -= 22;
    }
  }

  if (slot === "Bottom") {
    if ((context.tempBand === "warm" || context.tempBand === "hot") && ["shorts", "skirt"].includes(detail)) {
      reasons.push("가벼운 하의가 적절해요");
      score += 14;
    }
    if ((context.tempBand === "freezing" || context.tempBand === "cold") && ["leggings", "jeans", "slacks", "cotton_pants"].includes(detail)) {
      reasons.push("기온에 맞는 하의예요");
      score += 12;
    }
    if ((context.tempBand === "freezing" || context.tempBand === "cold") && detail === "shorts") {
      score -= 24;
    }
  }

  if (slot === "Shoes" && context.isRainy && ["black", "brown", "navy"].includes(item.color)) {
    reasons.push("비 오는 날 부담이 적은 톤이에요");
    score += 8;
  }

  if (slot === "ACC" && context.isRainy) {
    score += 6;
  }

  return score;
}

function scoreColor(item: NormalizedItem, context: RecommendationContext, reasons: string[]): number {
  if (!item.color) return 0;
  if (context.isRainy && ["black", "navy", "gray", "brown", "khaki", "black_denim"].includes(item.color)) {
    reasons.push("비 오는 날 무난한 컬러예요");
    return 8;
  }
  if ((context.tempBand === "warm" || context.tempBand === "hot") && ["white", "ivory", "beige", "light_blue_denim"].includes(item.color)) {
    reasons.push("가벼운 계절감의 컬러예요");
    return 8;
  }
  return 0;
}

function shouldIncludeSlot(slot: Slot, context: RecommendationContext): boolean {
  if (slot === "Top" || slot === "Bottom") return true;
  if (slot === "Outer") return context.wantsOuter;
  if (slot === "Shoes") return true;
  return context.wantsAccessories;
}

function scoreItemForSlot(item: NormalizedItem, slot: Slot, context: RecommendationContext) {
  if (item.category !== slot) return null;

  const reasons: string[] = [];
  let score = 40;

  score += scoreSeason(item, context, reasons);
  score += scoreThickness(item, context, reasons);
  score += scoreDetail(item, slot, context, reasons);
  score += scoreColor(item, context, reasons);

  if (slot === "Outer" && !context.wantsOuter) score -= 20;
  if (slot === "ACC" && !context.wantsAccessories) score -= 12;

  return { score, reasons };
}

function scoreColorPair(a: NormalizedItem | undefined, b: NormalizedItem | undefined, context: RecommendationContext): { score: number; reason: string | null } {
  if (!a || !b || !a.color || !b.color) return { score: 0, reason: null };
  if (a.id === b.id) return { score: -100, reason: null };

  const key = pairKey(a.color, b.color);
  if (GOOD_COLOR_PAIRS.has(key)) {
    return { score: GOOD_COLOR_PAIRS.get(key) || 0, reason: "색 조합이 안정적이에요" };
  }
  if (BAD_COLOR_PAIRS.has(key)) {
    return { score: BAD_COLOR_PAIRS.get(key) || 0, reason: "색 조합이 다소 강하게 충돌해요" };
  }

  if (NEUTRAL_COLORS.has(a.color) && NEUTRAL_COLORS.has(b.color)) {
    return { score: 10, reason: "무난한 뉴트럴 조합이에요" };
  }

  const denimPair = [a.color, b.color];
  if (denimPair.some((color) => color.includes("denim")) && denimPair.some((color) => ["white", "ivory", "gray", "black", "navy", "beige"].includes(color))) {
    return { score: 12, reason: "데님과 기본 컬러의 조합이 잘 어울려요" };
  }

  if (context.isRainy && ["black", "navy", "gray", "brown", "khaki", "black_denim"].includes(a.color) && ["black", "navy", "gray", "brown", "khaki", "black_denim"].includes(b.color)) {
    return { score: 8, reason: "비 오는 날에 어울리는 톤 조합이에요" };
  }

  if ((context.tempBand === "warm" || context.tempBand === "hot") && ["white", "ivory", "beige", "light_blue_denim"].includes(a.color) && ["white", "ivory", "beige", "light_blue_denim", "blue"].includes(b.color)) {
    return { score: 8, reason: "가벼운 계절감의 색 조합이에요" };
  }

  const vividColors = ["red", "orange", "yellow", "green", "pink", "purple"];
  if (vividColors.includes(a.color) && vividColors.includes(b.color)) {
    return { score: -8, reason: "강한 포인트 컬러가 겹쳐 보여요" };
  }

  return { score: 0, reason: null };
}

function addColorComboBonus(
  parts: RecommendationPart[],
  bySlot: Partial<Record<Slot, RecommendationPart>>,
  context: RecommendationContext,
) {
  const combos: Array<[Slot, Slot]> = [
    ["Top", "Bottom"],
    ["Top", "Outer"],
    ["Bottom", "Shoes"],
  ];

  combos.forEach(([left, right]) => {
    const leftPart = bySlot[left];
    const rightPart = bySlot[right];
    if (!leftPart || !rightPart) return;

    const result = scoreColorPair(
      {
        id: leftPart.item.id,
        name: leftPart.item.name,
        category: leftPart.slot,
        detailCategory: leftPart.item.detail_category || "",
        color: leftPart.item.color || "",
        thickness: (leftPart.item.thickness as NormalizedItem["thickness"]) || "",
        seasons: leftPart.item.season,
        imagePath: leftPart.item.image_path,
      },
      {
        id: rightPart.item.id,
        name: rightPart.item.name,
        category: rightPart.slot,
        detailCategory: rightPart.item.detail_category || "",
        color: rightPart.item.color || "",
        thickness: (rightPart.item.thickness as NormalizedItem["thickness"]) || "",
        seasons: rightPart.item.season,
        imagePath: rightPart.item.image_path,
      },
      context,
    );

    if (result.score === 0 || !result.reason) return;
    leftPart.score += result.score;
    rightPart.score += result.score;
    if (!leftPart.reasons.includes(result.reason)) leftPart.reasons.push(result.reason);
    if (!rightPart.reasons.includes(result.reason)) rightPart.reasons.push(result.reason);
  });

  parts.sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
}

function buildSummary(parts: RecommendationPart[], context: RecommendationContext): string {
  const names = parts.map((part) => part.item.name);
  const rainText = context.isRainy ? "비 가능성을 고려했고" : "비 영향은 크지 않고";
  return `${context.regionLabel} 기준 체감 ${context.effectiveTemp.toFixed(1)}도예요. ${rainText} ${names.join(", ")} 조합을 추천해요.`;
}

export function recommendOutfit(
  rows: RecommendationItemRow[],
  weather: RecommendationWeatherInput,
): RecommendationResult {
  const context = buildContext(weather);
  const items = rows.map(normalizeItem).filter((item) => item.id > 0 && item.category);
  const usedIds = new Set<number>();
  const selected: RecommendationPart[] = [];
  const bySlot: Partial<Record<Slot, RecommendationPart>> = {};
  const missingSlots: string[] = [];

  for (const slot of SLOT_ORDER) {
    if (!shouldIncludeSlot(slot, context)) continue;

    const candidate = items
      .filter((item) => !usedIds.has(item.id))
      .map((item) => {
        const scored = scoreItemForSlot(item, slot, context);
        return scored ? { item, ...scored } : null;
      })
      .filter((entry): entry is SelectedCandidate => Boolean(entry))
      .sort((a, b) => b.score - a.score || a.item.id - b.item.id)[0];

    if (!candidate) {
      missingSlots.push(slot);
      continue;
    }

    usedIds.add(candidate.item.id);
    const part: RecommendationPart = {
      slot,
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
    };
    selected.push(part);
    bySlot[slot] = part;
  }

  addColorComboBonus(selected, bySlot, context);

  selected.forEach((part) => {
    part.reasons = part.reasons.slice(0, 3);
  });

  return {
    summary: buildSummary(selected, context),
    context: {
      effectiveTemp: context.effectiveTemp,
      tempBand: context.tempBand,
      isRainy: context.isRainy,
      regionLabel: context.regionLabel,
    },
    parts: selected,
    missingSlots,
  };
}
