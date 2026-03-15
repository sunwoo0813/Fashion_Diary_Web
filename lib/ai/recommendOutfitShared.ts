import OpenAI from "openai";
import { z } from "zod";

export const weatherInputSchema = z.object({
  temperature: z.number(),
  feels_like: z.number(),
  min: z.number(),
  max: z.number(),
  condition: z.string().min(1),
  rain: z.boolean(),
  wind: z.string().min(1).optional().default("unknown"),
});

export const wardrobeItemSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive().optional(),
  category: z.string().min(1),
  detail_category: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  product_name: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  season: z.array(z.string()).optional().default([]),
  thickness: z.string().nullable().optional(),
  image_path: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  weather_fit_score: z.number().optional(),
  recommendation_hint: z.string().optional(),
  recent_worn_days_ago: z.number().nullable().optional(),
  wear_count: z.number().optional(),
  color_family: z.string().optional(),
  color_tone: z.enum(["light", "medium", "dark"]).optional(),
  color_role: z.enum(["neutral", "point"]).optional(),
  style_hint: z.string().optional(),
});

export const recommendOutfitInputSchema = z.object({
  weather: weatherInputSchema,
  userComment: z.string().trim().min(1),
  wardrobeItems: z.array(wardrobeItemSchema).min(1),
});

export const aiLookSchema = z.object({
  item_ids: z.array(z.number().int().positive()).min(1),
  summary: z.string().trim().min(1),
  reason: z.string().trim().min(1),
});

export const aiResponseSchema = z.object({
  summary: z.string().trim().min(1),
  look: aiLookSchema,
});

export const selectionResponseSchema = z.object({
  look: z.object({
    item_ids: z.array(z.number().int().positive()).min(1),
  }),
});

export const explanationResponseSchema = z.object({
  summary: z.string().trim().min(1),
  lookSummary: z.string().trim().min(1),
  reason: z.string().trim().min(1),
});

export const commentInterpretationSchema = z.object({
  mood: z.array(z.string().trim().min(1)).min(1).max(3),
  occasion: z.string().trim().min(1),
  formality: z.enum(["low", "medium", "high"]),
  comfort: z.enum(["low", "medium", "high"]),
  mobility: z.enum(["low", "medium", "high"]),
  styling_direction: z.string().trim().min(1),
  priorities: z.array(z.string().trim().min(1)).min(1).max(5),
});

export type WeatherInput = z.infer<typeof weatherInputSchema>;
export type WardrobeItem = z.infer<typeof wardrobeItemSchema>;
export type RecommendOutfitInput = z.infer<typeof recommendOutfitInputSchema>;
export type OutfitRecommendationResult = z.infer<typeof aiResponseSchema>;
export type CommentInterpretation = z.infer<typeof commentInterpretationSchema>;

export const DEFAULT_MODEL = process.env.OPENAI_OUTFIT_MODEL || "gpt-4.1-mini";

export const SELECTION_JSON_SCHEMA = {
  name: "outfit_selection",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      look: {
        type: "object",
        additionalProperties: false,
        properties: {
          item_ids: {
            type: "array",
            minItems: 1,
            maxItems: 5,
            items: { type: "integer" },
          },
        },
        required: ["item_ids"],
      },
    },
    required: ["look"],
  },
} as const;

export const EXPLANATION_JSON_SCHEMA = {
  name: "outfit_explanation",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      lookSummary: { type: "string" },
      reason: { type: "string" },
    },
    required: ["summary", "lookSummary", "reason"],
  },
} as const;

export const COMMENT_INTERPRETATION_JSON_SCHEMA = {
  name: "comment_interpretation",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      mood: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: { type: "string" },
      },
      occasion: { type: "string" },
      formality: { type: "string", enum: ["low", "medium", "high"] },
      comfort: { type: "string", enum: ["low", "medium", "high"] },
      mobility: { type: "string", enum: ["low", "medium", "high"] },
      styling_direction: { type: "string" },
      priorities: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: { type: "string" },
      },
    },
    required: [
      "mood",
      "occasion",
      "formality",
      "comfort",
      "mobility",
      "styling_direction",
      "priorities",
    ],
  },
} as const;

export const FALLBACK_TEXT = {
  summary: "오늘은 날씨와 요청을 함께 고려한 자연스럽고 실용적인 코디가 잘 어울립니다.",
  lookSummary: "오늘 조건에 맞게 편안함과 분위기를 함께 살린 코디입니다.",
  lookReason:
    "오늘 날씨와 사용자의 요청을 함께 반영해 실제로 입기 좋고 무리 없는 조합으로 골랐습니다.",
} as const;

export const FALLBACK_COMMENT_INTERPRETATION: CommentInterpretation = {
  mood: ["자연스러운 분위기", "무난한 인상"],
  occasion: "데일리",
  formality: "medium",
  comfort: "medium",
  mobility: "medium",
  styling_direction: "날씨에 맞으면서도 자연스럽게 입기 좋은 방향",
  priorities: ["날씨 적합성", "자연스러운 분위기", "편안한 착용감"],
};

export const GENERIC_MOOD_MAP: Record<string, string> = {
  깔끔함: "깔끔한 분위기",
  깔끔: "깔끔한 분위기",
  단정함: "단정한 분위기",
  단정: "단정한 분위기",
  차분함: "차분한 분위기",
  차분: "차분한 분위기",
  편안함: "편안한 분위기",
  편안: "편안한 분위기",
  캐주얼함: "캐주얼한 분위기",
  꾸밈: "꾸민 느낌",
  미니멀: "미니멀한 느낌",
  무난함: "자연스러운 분위기",
  무난: "자연스러운 분위기",
};

export const RETRY_RECOMMENDATION_APPEND_PROMPT = `

[재시도 규칙]
- 첫 추천이 부족하거나 어색하면 더 완성도 높은 코디를 다시 고른다.
- 가능한 경우 상의, 하의, 신발을 모두 포함한다.
- 비가 오거나 쌀쌀한 날에는 아우터 후보가 있으면 아우터도 적극 포함한다.
- 첫 시도보다 더 "실제로 오늘 바로 입고 나가기 좋은 조합"을 우선한다.
- 조합이 지나치게 단조롭거나 역할이 모호한 구성은 피한다.
- 요약과 이유는 짧지만 분명하게 쓰고, 오늘 조건을 어떻게 만족하는지 드러낸다.
`;

export const SELECTION_ONLY_APPEND_PROMPT = `

[Output override]
- Select the best outfit items first.
- Do not generate outfit explanation text in this step.
- Return only the final item_ids inside look.item_ids.
- The selected ids must represent the outfit you actually want to recommend.
`;

export function deriveColorFamily(color: string | null | undefined) {
  const value = (color || "").trim().toLowerCase();
  if (!value) return undefined;

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
  if (value.includes("denim")) return "denim";
  return value;
}

export function deriveColorTone(
  color: string | null | undefined,
  colorFamily?: string,
): "light" | "medium" | "dark" | undefined {
  const value = (color || "").trim().toLowerCase();
  const family = (colorFamily || deriveColorFamily(color) || "").trim().toLowerCase();
  const source = family || value;

  if (!source) return undefined;
  if (
    ["white", "ivory", "cream", "light_gray", "light_blue", "light_pink", "sky_blue", "mint"].includes(
      source,
    )
  ) {
    return "light";
  }
  if (
    ["black", "charcoal", "deep_navy", "dark_blue", "dark_brown", "burgundy", "wine", "forest_green"].includes(
      source,
    )
  ) {
    return "dark";
  }
  return "medium";
}

export function deriveColorRole(
  color: string | null | undefined,
  colorFamily?: string,
): "neutral" | "point" | undefined {
  const family = (colorFamily || deriveColorFamily(color) || "").trim().toLowerCase();
  if (!family) return undefined;
  if (
    [
      "black",
      "white",
      "gray",
      "charcoal",
      "navy",
      "deep_navy",
      "beige",
      "ivory",
      "brown",
      "khaki",
      "denim",
      "blue",
      "dark_blue",
      "light_blue",
    ].includes(family)
  ) {
    return "neutral";
  }
  return "point";
}

export function buildColorInterpretation(color: string | null | undefined) {
  const value = (color || "").trim().toLowerCase();
  if (!value) return undefined;

  const explicitMap: Record<string, string> = {
    light_blue_denim: "light blue denim",
    medium_blue_denim: "medium blue denim",
    dark_blue_denim: "dark blue denim",
    raw_denim: "raw denim",
    black_denim: "black denim",
    gray_denim: "gray denim",
    white_denim: "white denim",
  };

  return explicitMap[value] || value.replaceAll("_", " ");
}

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }
  return new OpenAI({ apiKey });
}

export function stripCodeFences(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function findFirstBalancedJsonObject(text: string) {
  const source = stripCodeFences(text);
  let startIndex = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") {
      if (depth === 0) startIndex = index;
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0 && startIndex !== -1) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  throw new Error("OpenAI response did not contain a balanced JSON object.");
}

export function extractResponseText(response: unknown) {
  const candidate = response as {
    output_text?: string;
    output_parsed?: unknown;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  if (candidate.output_parsed && typeof candidate.output_parsed === "object") {
    return JSON.stringify(candidate.output_parsed);
  }
  if (typeof candidate.output_text === "string" && candidate.output_text.trim()) {
    return candidate.output_text;
  }

  const textParts =
    candidate.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => (typeof content.text === "string" ? content.text : ""))
      .filter((value): value is string => value.trim().length > 0) ?? [];

  if (textParts.length > 0) {
    return textParts.join("\n");
  }

  throw new Error("OpenAI response did not contain readable text output.");
}

export function parseOpenAiJson(rawText: string) {
  const candidates = [stripCodeFences(rawText)];

  try {
    candidates.push(findFirstBalancedJsonObject(rawText));
  } catch {
    // keep trying plain text candidate
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // continue
    }
  }

  console.error("[recommendOutfit] failed to parse response text", rawText);
  throw new Error("OpenAI returned malformed JSON.");
}

export function sanitizeText(value: string | undefined, fallback: string) {
  return value?.trim() ? value.trim() : fallback;
}

export function normalizeMoodValues(values: string[]) {
  const normalized = values
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => GENERIC_MOOD_MAP[value] || value)
    .filter((value) => !["좋은 느낌", "어울리는 느낌"].includes(value));

  const deduped = Array.from(new Set(normalized));
  return deduped.length > 0 ? deduped.slice(0, 3) : [...FALLBACK_COMMENT_INTERPRETATION.mood];
}

export function stripItemIdsFromText(text: string, wardrobeItems: WardrobeItem[]) {
  const itemIds = wardrobeItems
    .map((item) => item.id)
    .filter((id) => Number.isInteger(id) && id > 0)
    .sort((a, b) => String(b).length - String(a).length);

  let sanitized = text;

  itemIds.forEach((id) => {
    const escaped = String(id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    sanitized = sanitized.replace(new RegExp(`\\b${escaped}번?\\b`, "g"), "");
    sanitized = sanitized.replace(new RegExp(`\\(${escaped}\\)`, "g"), "");
    sanitized = sanitized.replace(new RegExp(`\\[${escaped}\\]`, "g"), "");
  });

  return sanitized
    .replace(/\[\s*(?:\d+\s*,\s*)+\d+\s*\]/g, "")
    .replace(/\(\s*(?:\d+\s*,\s*)+\d+\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.)\]])/g, "$1")
    .trim();
}

export function createStructuredResponse(
  client: OpenAI,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  jsonSchema: {
    name: string;
    strict: boolean;
    schema: Record<string, unknown>;
  },
) {
  return client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: systemPrompt }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: userPrompt }],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        ...jsonSchema,
      },
    },
  });
}

export function ensureValidItemIds(itemIds: number[], wardrobeItems: WardrobeItem[]) {
  const validIdSet = new Set(wardrobeItems.map((item) => item.id));
  const uniqueIds = Array.from(new Set(itemIds));
  const invalidIds = uniqueIds.filter((id) => !validIdSet.has(id));
  const validIds = uniqueIds.filter((id) => validIdSet.has(id));

  if (invalidIds.length > 0) {
    console.error("[recommendOutfit] invalid item ids from OpenAI", {
      invalidIds,
      validWardrobeIds: Array.from(validIdSet),
    });
  }

  if (validIds.length === 0) {
    throw new Error("OpenAI returned no valid wardrobe item ids.");
  }

  return validIds.slice(0, 5);
}

export function scoreCandidateForPostProcess(item: WardrobeItem) {
  let score = item.weather_fit_score ?? 0;
  score += Math.max(0, 12 - (item.wear_count ?? 0));

  if (item.recent_worn_days_ago == null) {
    score += 6;
  } else if (item.recent_worn_days_ago >= 14) {
    score += 10;
  } else if (item.recent_worn_days_ago <= 2) {
    score -= 8;
  }

  return score;
}

export function isNeutralColor(colorFamily: string | undefined) {
  return Boolean(
    colorFamily &&
      ["black", "white", "gray", "charcoal", "navy", "beige", "ivory", "deep_navy"].includes(
        colorFamily,
      ),
  );
}

export function colorCompatibilityBonus(left?: string, right?: string) {
  if (!left || !right) return 0;
  if (left === right) return isNeutralColor(left) ? 6 : -4;
  if (isNeutralColor(left) || isNeutralColor(right)) return 8;
  if (
    (left === "blue" && right === "white") ||
    (left === "white" && right === "blue") ||
    (left === "deep_navy" && right === "beige") ||
    (left === "beige" && right === "deep_navy") ||
    (left === "black" && right === "gray") ||
    (left === "gray" && right === "black")
  ) {
    return 8;
  }
  if (
    (left === "red" && right === "orange") ||
    (left === "orange" && right === "red") ||
    (left === "green" && right === "red") ||
    (left === "red" && right === "green")
  ) {
    return -12;
  }
  return 0;
}

export function detailCompatibilityBonus(baseItems: WardrobeItem[], candidate: WardrobeItem) {
  const top = baseItems.find((item) => item.category === "Top");
  const bottom = baseItems.find((item) => item.category === "Bottom");
  const detail = candidate.detail_category || "";

  if (candidate.category === "Shoes") {
    if (bottom?.detail_category === "slacks") {
      if (["loafer", "derby", "boots"].includes(detail)) return 8;
      if (["sneakers", "running_shoes"].includes(detail)) return -2;
    }
    if (["jeans", "cargo_pants", "jogger_pants"].includes(bottom?.detail_category || "")) {
      if (["sneakers", "running_shoes", "boots"].includes(detail)) return 8;
    }
  }

  if (candidate.category === "Outer") {
    if (["hoodie", "sweatshirt"].includes(top?.detail_category || "")) {
      if (["jacket", "windbreaker", "hood_zipup"].includes(detail)) return 6;
      if (["blazer", "coat"].includes(detail)) return -4;
    }
    if (["shirt", "blouse", "knit", "polo_shirt"].includes(top?.detail_category || "")) {
      if (["blazer", "coat", "cardigan", "jacket"].includes(detail)) return 6;
    }
  }

  return 0;
}

export function scoreAdditionalCandidate(baseItems: WardrobeItem[], candidate: WardrobeItem) {
  const candidateColor = candidate.color_family || deriveColorFamily(candidate.color);
  const candidateTone = candidate.color_tone || deriveColorTone(candidate.color, candidateColor);
  const candidateRole = candidate.color_role || deriveColorRole(candidate.color, candidateColor);
  const baseColors = baseItems
    .map((item) => item.color_family || deriveColorFamily(item.color))
    .filter((value): value is string => Boolean(value));
  const baseTones = baseItems
    .map((item) => item.color_tone || deriveColorTone(item.color, item.color_family))
    .filter((value): value is "light" | "medium" | "dark" => Boolean(value));
  const baseRoles = baseItems
    .map((item) => item.color_role || deriveColorRole(item.color, item.color_family))
    .filter((value): value is "neutral" | "point" => Boolean(value));

  let score = scoreCandidateForPostProcess(candidate);
  score += detailCompatibilityBonus(baseItems, candidate);

  baseColors.forEach((baseColor) => {
    score += colorCompatibilityBonus(baseColor, candidateColor);
  });

  const pointCount = baseRoles.filter((role) => role === "point").length + (candidateRole === "point" ? 1 : 0);
  if (pointCount >= 2) score -= 6;

  const darkCount = baseTones.filter((tone) => tone === "dark").length + (candidateTone === "dark" ? 1 : 0);
  if (darkCount >= 3) score -= 5;

  if (candidateTone === "light" && baseTones.includes("dark")) score += 4;
  if (candidateTone === "dark" && baseTones.includes("light")) score += 4;

  return score;
}

export function buildCombinationScore(items: WardrobeItem[]) {
  let score = 0;
  const top = items.find((item) => item.category === "Top");
  const bottom = items.find((item) => item.category === "Bottom");
  const outer = items.find((item) => item.category === "Outer");
  const shoes = items.find((item) => item.category === "Shoes");
  const colors = items
    .map((item) => item.color_family || deriveColorFamily(item.color))
    .filter((value): value is string => Boolean(value));
  const tones = items
    .map((item) => item.color_tone || deriveColorTone(item.color, item.color_family))
    .filter((value): value is "light" | "medium" | "dark" => Boolean(value));
  const roles = items
    .map((item) => item.color_role || deriveColorRole(item.color, item.color_family))
    .filter((value): value is "neutral" | "point" => Boolean(value));

  items.forEach((item) => {
    score += scoreCandidateForPostProcess(item);
  });

  if (top && bottom) {
    score += colorCompatibilityBonus(
      top.color_family || deriveColorFamily(top.color),
      bottom.color_family || deriveColorFamily(bottom.color),
    );
  }

  if (top && outer) {
    score += colorCompatibilityBonus(
      top.color_family || deriveColorFamily(top.color),
      outer.color_family || deriveColorFamily(outer.color),
    );
    score += detailCompatibilityBonus([top, bottom].filter(Boolean) as WardrobeItem[], outer);
  }

  if (bottom && shoes) {
    score += colorCompatibilityBonus(
      bottom.color_family || deriveColorFamily(bottom.color),
      shoes.color_family || deriveColorFamily(shoes.color),
    );
    score += detailCompatibilityBonus([top, bottom].filter(Boolean) as WardrobeItem[], shoes);
  }

  const nonNeutralCount = colors.filter((color) => !isNeutralColor(color)).length;
  if (nonNeutralCount >= 3) score -= 10;
  if (nonNeutralCount === 2) score -= 3;

  const pointCount = roles.filter((role) => role === "point").length;
  if (pointCount >= 3) score -= 12;
  if (pointCount === 2) score -= 4;

  const darkCount = tones.filter((tone) => tone === "dark").length;
  if (darkCount >= 3) score -= 6;
  if (tones.includes("light") && tones.includes("dark")) score += 5;

  if (
    top &&
    bottom &&
    ["hoodie", "sweatshirt"].includes(top.detail_category || "") &&
    ["cargo_pants", "jogger_pants"].includes(bottom.detail_category || "")
  ) {
    score -= 8;
  }

  if (
    outer &&
    top &&
    ["blazer", "coat"].includes(outer.detail_category || "") &&
    ["hoodie", "sweatshirt"].includes(top.detail_category || "")
  ) {
    score -= 6;
  }

  return score;
}

export function getCategoryLimit(category: string, weather: WeatherInput) {
  const effectiveTemp = weather.feels_like ?? weather.temperature;

  if (category === "Top" || category === "Bottom") return 4;
  if (category === "Shoes") return 3;
  if (category === "Outer") return weather.rain || effectiveTemp <= 17 ? 3 : 1;
  if (category === "ACC") return 1;
  return 2;
}

export function buildBaseCategorySelection(itemIds: number[], wardrobeItems: WardrobeItem[], weather: WeatherInput) {
  const itemMap = new Map(wardrobeItems.map((item) => [item.id, item]));
  const selected = itemIds
    .map((id) => itemMap.get(id))
    .filter((item): item is WardrobeItem => Boolean(item));

  const byCategory = new Map<string, WardrobeItem>();
  selected.forEach((item) => {
    if (!byCategory.has(item.category)) {
      byCategory.set(item.category, item);
    }
  });

  const needsOuter = weather.rain || weather.feels_like <= 17;
  const requiredCategories = ["Top", "Bottom", "Shoes", ...(needsOuter ? ["Outer"] : [])];

  function pickBestCandidate(category: string) {
    const currentItems = Array.from(byCategory.values());
    return wardrobeItems
      .filter((item) => item.category === category)
      .sort(
        (left, right) =>
          scoreAdditionalCandidate(currentItems, right) - scoreAdditionalCandidate(currentItems, left) ||
          left.id - right.id,
      )[0];
  }

  requiredCategories.forEach((category) => {
    if (byCategory.has(category)) return;
    const candidate = pickBestCandidate(category);
    if (candidate) {
      byCategory.set(category, candidate);
    }
  });

  return byCategory;
}

export function pickTopCategoryCandidates(
  category: string,
  wardrobeItems: WardrobeItem[],
  weather: WeatherInput,
) {
  return wardrobeItems
    .filter((item) => item.category === category)
    .sort(
      (left, right) =>
        scoreCandidateForPostProcess(right) - scoreCandidateForPostProcess(left) ||
        (right.weather_fit_score ?? 0) - (left.weather_fit_score ?? 0) ||
        left.id - right.id,
    )
    .slice(0, getCategoryLimit(category, weather));
}

export function buildBestCategorySelection(
  itemIds: number[],
  wardrobeItems: WardrobeItem[],
  weather: WeatherInput,
) {
  const byCategory = buildBaseCategorySelection(itemIds, wardrobeItems, weather);
  const needsOuter = weather.rain || weather.feels_like <= 17;

  const topCandidates = byCategory.has("Top")
    ? [byCategory.get("Top")!]
    : pickTopCategoryCandidates("Top", wardrobeItems, weather);
  const bottomCandidates = byCategory.has("Bottom")
    ? [byCategory.get("Bottom")!]
    : pickTopCategoryCandidates("Bottom", wardrobeItems, weather);
  const shoesCandidates = byCategory.has("Shoes")
    ? [byCategory.get("Shoes")!]
    : pickTopCategoryCandidates("Shoes", wardrobeItems, weather);
  const outerCandidates = !needsOuter
    ? byCategory.has("Outer")
      ? [byCategory.get("Outer")!]
      : []
    : byCategory.has("Outer")
      ? [byCategory.get("Outer")!]
      : pickTopCategoryCandidates("Outer", wardrobeItems, weather);

  const combinations: WardrobeItem[][] = [];

  topCandidates.forEach((top) => {
    bottomCandidates.forEach((bottom) => {
      const shoePool = shoesCandidates.length > 0 ? shoesCandidates : [undefined];
      const outerPool = outerCandidates.length > 0 ? outerCandidates : [undefined];

      shoePool.forEach((shoes) => {
        outerPool.forEach((outer) => {
          const combo = [top, bottom, outer, shoes].filter(
            (item): item is WardrobeItem => Boolean(item),
          );
          combinations.push(combo);
        });
      });
    });
  });

  const best = combinations.sort((left, right) => buildCombinationScore(right) - buildCombinationScore(left))[0];

  if (!best || best.length === 0) {
    return byCategory;
  }

  const finalSelection = new Map<string, WardrobeItem>();
  best.forEach((item) => {
    if (!finalSelection.has(item.category)) {
      finalSelection.set(item.category, item);
    }
  });

  return finalSelection;
}

export function sortIdsByDisplayOrder(itemIds: number[], itemMap: Map<number, WardrobeItem>) {
  const slotOrder = new Map([
    ["Top", 0],
    ["Bottom", 1],
    ["Outer", 2],
    ["Shoes", 3],
    ["ACC", 4],
  ]);

  return [...itemIds].sort((left, right) => {
    const leftCategory = itemMap.get(left)?.category || "ACC";
    const rightCategory = itemMap.get(right)?.category || "ACC";
    const leftRank = slotOrder.get(leftCategory) ?? 99;
    const rightRank = slotOrder.get(rightCategory) ?? 99;
    return leftRank - rightRank;
  });
}

export function postProcessItemIds(
  itemIds: number[],
  wardrobeItems: WardrobeItem[],
  weather: WeatherInput,
) {
  const itemMap = new Map(wardrobeItems.map((item) => [item.id, item]));
  const baseSelection = buildBestCategorySelection(itemIds, wardrobeItems, weather);
  const processedIds = Array.from(baseSelection.values()).map((item) => item.id);
  const sortedIds = sortIdsByDisplayOrder(processedIds, itemMap);
  return sortedIds.slice(0, 5);
}

export function finalizeSelectedItemIds(
  itemIds: number[],
  wardrobeItems: WardrobeItem[],
  weather: WeatherInput,
) {
  return postProcessItemIds(
    ensureValidItemIds(itemIds, wardrobeItems),
    wardrobeItems,
    weather,
  );
}

export function hasCategory(items: WardrobeItem[], category: string) {
  return items.some((item) => item.category === category);
}

export function isWeakRecommendation(
  itemIds: number[],
  wardrobeItems: WardrobeItem[],
  weather: WeatherInput,
) {
  const selectedItems = itemIds
    .map((id) => wardrobeItems.find((item) => item.id === id))
    .filter((item): item is WardrobeItem => Boolean(item));
  const selectedCategories = new Set(selectedItems.map((item) => item.category));
  const needsOuter = weather.rain || weather.feels_like <= 17;
  const hasShoesCandidate = hasCategory(wardrobeItems, "Shoes");
  const hasOuterCandidate = hasCategory(wardrobeItems, "Outer");

  if (!selectedCategories.has("Top")) return true;
  if (!selectedCategories.has("Bottom")) return true;
  if (hasShoesCandidate && !selectedCategories.has("Shoes")) return true;
  if (needsOuter && hasOuterCandidate && !selectedCategories.has("Outer")) return true;
  if (itemIds.length < 3 && (hasShoesCandidate || hasOuterCandidate)) return true;

  return false;
}

export function textIncludesAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern));
}
