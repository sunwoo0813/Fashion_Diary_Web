import OpenAI from "openai";

import {
  DEFAULT_MODEL,
  EXPLANATION_JSON_SCHEMA,
  FALLBACK_TEXT,
  type CommentInterpretation,
  type RecommendOutfitInput,
  type WardrobeItem,
  createStructuredResponse,
  deriveColorFamily,
  deriveColorRole,
  deriveColorTone,
  explanationResponseSchema,
  extractResponseText,
  parseOpenAiJson,
  sanitizeText,
  stripItemIdsFromText,
} from "@/lib/ai/recommendOutfitShared";

const FINAL_EXPLANATION_SYSTEM_PROMPT = `
너는 최종 선택된 코디가 왜 적절한지 설명하는 스타일리스트 AI다.

역할:
- 서버가 이미 확정한 최종 선택 상품만 기준으로 설명한다.
- 코디를 바꾸거나 새 아이템을 제안하지 않는다.
- 선택되지 않은 아이템을 상상해서 언급하지 않는다.
- 실제로 전달받은 정보만 바탕으로 설명한다.

설명 기준:
- 오늘 날씨가 이 코디에 어떤 영향을 줬는지 자연스럽게 드러낸다.
- 사용자가 입력한 코멘트가 이 코디에 어떻게 반영됐는지 짚어준다.
- 최종 선택된 아이템 구성이 왜 무난하고 실용적인지 설명한다.
- 상품명을 나열하기보다 코디의 분위기, 착용감, 활용성을 중심으로 말한다.

문체 규칙:
- 반드시 한국어로 작성한다.
- 서비스 안에서 바로 보여줄 문장처럼 짧고 자연스럽게 쓴다.
- 과장하거나 광고처럼 쓰지 않는다.
- 사용자가 읽었을 때 바로 납득할 수 있는 이유를 말한다.
- 브랜드명, 상품명, item id, 내부 점수, 필드명은 쓰지 않는다.
- 실제로 전달된 정보보다 더 구체적인 색상이나 아이템 이름을 상상해 쓰지 않는다.
- summary와 lookSummary는 서로 같은 말을 반복하지 않는다.
- reason은 1~2문장으로 쓰고, 날씨와 코멘트 반영 근거가 모두 들어가야 한다.

출력 규칙:
- summary: 오늘 어떤 방향의 룩이 잘 맞는지 한 문장
- lookSummary: 최종 코디의 분위기나 인상을 짧게 설명하는 한 문장
- reason: 왜 이 코디가 오늘 적절한지 1~2문장
- 반드시 JSON만 반환한다.
`;

function buildExplanationPrompt(
  input: RecommendOutfitInput,
  interpretedComment: CommentInterpretation,
  selectedItems: WardrobeItem[],
) {
  const categoryOrder = ["Top", "Bottom", "Outer", "Shoes", "ACC"];
  const sortedItems = [...selectedItems].sort(
    (left, right) => categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category),
  );

  const payload = {
    user_comment: input.userComment,
    interpreted_comment: interpretedComment,
    weather: input.weather,
    outfit_structure: sortedItems.map((item) => item.category),
    selected_items: sortedItems.map((item) => ({
      id: item.id,
      category: item.category,
      detail_category: item.detail_category,
      color: item.color,
      season: item.season,
      thickness: item.thickness,
      weather_fit_score: item.weather_fit_score,
      recent_worn_days_ago: item.recent_worn_days_ago,
      wear_count: item.wear_count,
      color_family: item.color_family || deriveColorFamily(item.color),
      color_tone: item.color_tone || deriveColorTone(item.color, item.color_family),
      color_role: item.color_role || deriveColorRole(item.color, item.color_family),
      recommendation_hint: item.recommendation_hint,
      style_hint: item.style_hint,
    })),
  };

  return JSON.stringify(payload, null, 2);
}

function parseAndValidateExplanation(rawText: string, wardrobeItems: WardrobeItem[]) {
  const parsedJson = parseOpenAiJson(rawText);
  const parsed = explanationResponseSchema.safeParse(parsedJson);

  if (!parsed.success) {
    console.error("[recommendOutfit] explanation zod validation failed", parsed.error.flatten());
    return {
      summary: FALLBACK_TEXT.summary,
      lookSummary: FALLBACK_TEXT.lookSummary,
      reason: FALLBACK_TEXT.lookReason,
    };
  }

  const summary = stripItemIdsFromText(
    sanitizeText(parsed.data.summary, FALLBACK_TEXT.summary),
    wardrobeItems,
  );
  const lookSummary = stripItemIdsFromText(
    sanitizeText(parsed.data.lookSummary, FALLBACK_TEXT.lookSummary),
    wardrobeItems,
  );
  const reason = stripItemIdsFromText(
    sanitizeText(parsed.data.reason, FALLBACK_TEXT.lookReason),
    wardrobeItems,
  );

  return {
    summary: summary || FALLBACK_TEXT.summary,
    lookSummary: lookSummary || FALLBACK_TEXT.lookSummary,
    reason: reason || FALLBACK_TEXT.lookReason,
  };
}

export async function generateFinalExplanation(
  client: OpenAI,
  input: RecommendOutfitInput,
  interpretedComment: CommentInterpretation,
  itemIds: number[],
) {
  const itemMap = new Map(input.wardrobeItems.map((item) => [item.id, item]));
  const selectedItems = itemIds
    .map((id) => itemMap.get(id))
    .filter((item): item is WardrobeItem => Boolean(item));

  const response = await createStructuredResponse(
    client,
    DEFAULT_MODEL,
    FINAL_EXPLANATION_SYSTEM_PROMPT,
    buildExplanationPrompt(input, interpretedComment, selectedItems),
    EXPLANATION_JSON_SCHEMA,
  );

  const rawText = extractResponseText(response);
  return parseAndValidateExplanation(rawText, input.wardrobeItems);
}
