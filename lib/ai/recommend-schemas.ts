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
