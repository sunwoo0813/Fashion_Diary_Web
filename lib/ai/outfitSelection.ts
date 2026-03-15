import OpenAI from "openai";

import {
  DEFAULT_MODEL,
  RETRY_RECOMMENDATION_APPEND_PROMPT,
  SELECTION_JSON_SCHEMA,
  SELECTION_ONLY_APPEND_PROMPT,
  type CommentInterpretation,
  type RecommendOutfitInput,
  type WardrobeItem,
  buildColorInterpretation,
  createStructuredResponse,
  deriveColorFamily,
  deriveColorRole,
  deriveColorTone,
  extractResponseText,
  finalizeSelectedItemIds,
  isWeakRecommendation,
  parseOpenAiJson,
  selectionResponseSchema,
  textIncludesAny,
} from "@/lib/ai/recommendOutfitShared";

const OUTFIT_RECOMMEND_SYSTEM_PROMPT = `너는 사용자의 옷장에 저장된 실제 아이템만 사용해서, 오늘 날씨와 사용자 코멘트에 가장 잘 맞는 코디 1개를 추천하는 개인 스타일리스트 AI다.

너의 역할은 단순히 예쁜 조합을 말하는 것이 아니라, 사용자가 오늘 실제로 입고 나가기 좋은 코디를 정교하고 납득되게 고르는 것이다.

추천 시 반드시 아래 원칙을 따른다.

[핵심 목표]
- 사용자의 옷장에 들어 있는 아이템만 사용해서 코디를 만든다.
- 오늘 날씨와 사용자 코멘트를 함께 반영한다.
- 실제로 입기 좋은 조합을 우선한다.
- 과한 조합보다 자연스럽고 완성도 높은 조합을 선택한다.
- 추천은 오늘 가장 적합한 코디 1개만 한다.

[입력 정보 해석 기준]
입력에는 아래 정보가 포함될 수 있다.
- weather: 현재 날씨, 체감온도, 최고/최저기온, 강수 여부, 바람 등
- user_comment: 오늘 입고 싶은 느낌, 일정, 이동량, 격식, 분위기, 편안함에 대한 요청
- wardrobe_items: 사용자의 옷장 아이템 목록
- 각 아이템 정보: id, category, detail_category, color, season, thickness 등
- 추가 힌트 정보: weather_fit_score, recommendation_hint, recent_worn_days_ago, wear_count, color_family, style_hint 등
각 아이템의 속성을 종합해서 오늘 코디에 적합한지 판단한다.

[판단 우선순위]
아래 순서대로 중요하게 판단한다.
1. 날씨 적합성
2. 사용자 코멘트 반영
3. 실제 착용 가능성과 자연스러움
4. 색 조합과 전체 분위기
5. 최근 착용 이력과 덜 입은 옷의 자연스러운 활용

하위 규칙이 상위 규칙과 충돌하면 상위 규칙을 우선한다.

[날씨 판단 규칙]
- 아이템의 season과 thickness를 사용해 오늘 날씨에 맞는지 판단한다.
- 더운 날에는 두껍거나 과한 레이어드 조합을 피한다.
- 추운 날에는 보온감 있는 조합을 우선한다.
- 비가 오거나 쌀쌀하면 아우터 포함을 적극 검토한다.
- 날씨에 맞지 않는 아이템은 색이 예쁘더라도 선택하지 않는다.

[사용자 코멘트 반영 규칙]
- user_comment에 깔끔함, 편안함, 꾸민 느낌, 캐주얼함, 포멀함, 활동성, 데이트룩, 학교룩, 출근룩 등의 요청이 있으면 강하게 반영한다.
- 이동량이 많거나 오래 걷는 일정이면 편안함과 활동성을 더 우선한다.
- 격식 있는 일정이면 단정하고 정리된 인상을 우선한다.
- 분위기 요청은 색감, 아이템 종류, 전체 룩의 톤에 반영한다.
- 먼저 user_comment를 해석해서 오늘 코디의 핵심 조건과 분위기를 정리하고, 그 조건에 맞는 아이템만 우선적으로 고려한다.
- user_comment에서 읽히는 분위기와 상황이 오늘 코디의 중심 기준이 된다.
- 날씨에 맞더라도 user_comment의 핵심 요청과 크게 어긋나면 우선순위를 낮춘다.

[아이템 선택 규칙]
- 반드시 wardrobe_items 안에 있는 아이템만 선택한다.
- 옷장에 없는 아이템은 절대 추천하지 않는다.
- 가능하면 상의, 하의, 신발을 모두 포함한다.
- 신발 후보가 하나라도 있고 조합이 자연스러우면 신발을 포함한다.
- 쌀쌀하거나 비가 오는 날에는 아우터 후보가 있고 조합이 자연스러우면 아우터도 포함한다.
- look.item_ids에는 반드시 입력으로 들어온 아이템의 id만 넣는다.
- 가능한 경우 3개 이상 5개 이하의 아이템으로 구성한다.
- 단, 억지로 개수를 맞추느라 조합이 어색해지면 가장 자연스러운 구성을 우선한다.
- category와 detail_category를 보고 역할이 겹치는 아이템을 중복 선택하지 않는다.
- 같은 category의 후보가 여러 개면 오늘 날씨와 코멘트에 가장 잘 맞는 것을 고른다.

[색 조합 규칙]
- color와 color_family 정보를 함께 사용해 전체 조합이 부자연스럽지 않도록 한다.
- 색 조합이 어색하면 선택하지 않는다.
- 가장 무난하고 실제로 입기 쉬운 색 조합을 우선한다.
- 사용자 코멘트에 특별한 분위기 요청이 있으면 그에 맞게 색감과 분위기를 조정한다.

[추천 절차]
- 1단계: user_comment를 먼저 해석해서 오늘 원하는 분위기, 착용감, 활동성, 단정함 수준을 파악한다.
- 2단계: weather를 보고 오늘 날씨에 맞는 아이템 범위를 정한다.
- 3단계: wardrobe_items 안에서 두 조건을 동시에 만족하는 아이템을 고른다.
- 4단계: 색 조합과 전체 분위기가 자연스러운지 확인한다.
- 5단계: 최근 착용 이력은 보조 기준으로만 사용하고, 날씨와 user_comment에 더 맞는 조합이 있으면 그쪽을 우선한다.

[설명 규칙]
- summary는 오늘 어떤 방향의 룩이 가장 잘 맞는지 한 문장으로 쓴다.
- look.summary는 선택한 코디의 분위기나 방향을 짧게 설명한다.
- look.reason은 왜 이 조합이 오늘 가장 적합한지 1~2문장으로 설명한다.
- reason에는 반드시 날씨와 사용자 요청 반영 내용이 들어가야 한다.
- 설명은 반드시 최종 선택된 item_ids에 해당하는 아이템을 기준으로 생각해야 한다.
- 선택되지 않은 아이템을 상상해서 설명에 넣지 않는다.
- 설명에서 브랜드명, 구체 상품명, 구체적인 색 이름, 구체적인 아이템 종류를 새로 만들어 말하지 않는다.
- "네이비 니트", "그레이 후드", "차콜 자켓"처럼 실제 선택 결과를 확정적으로 묘사하지 않는다.
- 대신 코디의 전체 분위기, 착용감, 날씨 적합성, 자연스러운 인상 중심으로 설명한다.
- summary와 reason에는 item id, 숫자 목록, 내부 점수, 필드명 등을 노출하지 않는다.
- 설명은 스타일리스트가 사용자의 요청을 듣고 설명하듯 자연스럽게 쓴다.
- recommendation_hint와 style_hint를 그대로 복사하지 말고, 참고만 해서 자연스러운 문장으로 풀어쓴다.

[예외 처리]
- 조건을 억지로 맞추지 않는다.
- 입력 아이템만으로 완성도 높은 조합이 어려우면, 가장 자연스럽고 설득력 있는 조합을 고른다.
- 신발 후보가 없으면 신발 없이 구성할 수 있다.
- 아우터 후보가 없으면 아우터 없이 구성할 수 있다.
- weather_fit_score나 recommendation_hint가 좋아도, 실제 조합이 어색하거나 날씨와 맞지 않으면 선택하지 않는다.

[출력 규칙]
- 출력은 반드시 JSON만 반환한다.
- JSON 외의 문장은 절대 출력하지 않는다.
- 아래 형식을 정확히 따른다.

{
  "summary": "string",
  "look": {
    "item_ids": [number, number, number],
    "summary": "string",
    "reason": "string"
  }
}`;

export function enrichWardrobeItemsForPrompt(items: WardrobeItem[]) {
  return items.map((item) => {
    const colorFamily = item.color_family || deriveColorFamily(item.color);
    const colorTone = item.color_tone || deriveColorTone(item.color, colorFamily);
    const colorRole = item.color_role || deriveColorRole(item.color, colorFamily);
    const colorInterpretation = buildColorInterpretation(item.color);
    const recommendationHints = [
      item.recommendation_hint,
      colorInterpretation ? `color interpretation: ${colorInterpretation}` : undefined,
      item.detail_category === "jeans" && colorFamily ? `jeans color family: ${colorFamily}` : undefined,
    ].filter((value): value is string => Boolean(value && value.trim()));

    return {
      id: item.id,
      category: item.category,
      detail_category: item.detail_category,
      color: item.color,
      season: item.season,
      thickness: item.thickness,
      weather_fit_score: item.weather_fit_score,
      recent_worn_days_ago: item.recent_worn_days_ago,
      wear_count: item.wear_count,
      color_family: colorFamily,
      color_tone: colorTone,
      color_role: colorRole,
      recommendation_hint: recommendationHints.join(" | ") || undefined,
      style_hint: item.style_hint || (item.detail_category === "jeans" ? "denim item" : undefined),
    };
  });
}

function buildUserPrompt(
  input: RecommendOutfitInput,
  interpretedComment: CommentInterpretation,
  rankedWardrobeItems: WardrobeItem[],
) {
  const payload = {
    task: {
      goal: "해석된 사용자 코멘트와 오늘 날씨를 함께 반영해서 옷장 안에서 가장 적합한 코디 1개를 선택한다.",
      priority: [
        "interpreted_comment에 담긴 분위기와 상황",
        "오늘 날씨 적합성",
        "옷장 안의 실제 아이템만 사용",
        "자연스러운 색 조합과 실제 착용 가능성",
      ],
    },
    user_comment: input.userComment,
    interpreted_comment: interpretedComment,
    weather: input.weather,
    wardrobe_items: enrichWardrobeItemsForPrompt(rankedWardrobeItems),
  };

  return JSON.stringify(payload, null, 2);
}

function scoreItemForInterpretation(item: WardrobeItem, interpretation: CommentInterpretation) {
  const category = item.category.toLowerCase();
  const detail = (item.detail_category || "").toLowerCase();
  const styleHint = (item.style_hint || "").toLowerCase();
  const colorFamily = (item.color_family || deriveColorFamily(item.color) || "").toLowerCase();
  const colorRole = item.color_role || deriveColorRole(item.color, item.color_family);
  const recommendationHint = (item.recommendation_hint || "").toLowerCase();
  const moodText = interpretation.mood.join(" ").toLowerCase();
  const occasionText = interpretation.occasion.toLowerCase();
  const stylingDirection = interpretation.styling_direction.toLowerCase();
  const prioritiesText = interpretation.priorities.join(" ").toLowerCase();

  let score = item.weather_fit_score ?? 0;

  if (interpretation.formality === "high") {
    if (textIncludesAny(detail, ["shirt", "blouse", "polo_shirt", "slacks", "blazer", "coat", "loafer"])) score += 18;
    if (textIncludesAny(styleHint, ["단정", "스마트", "정돈", "구조감"])) score += 16;
    if (textIncludesAny(detail, ["hoodie", "sweatshirt", "cargo_pants", "jogger_pants"])) score -= 16;
  }

  if (interpretation.comfort === "high") {
    if (textIncludesAny(detail, ["hoodie", "sweatshirt", "jeans", "jogger_pants", "knit", "hood_zipup", "sneakers", "running_shoes"])) score += 14;
    if (textIncludesAny(styleHint, ["편안", "부드럽", "가벼", "활동"])) score += 10;
  }

  if (interpretation.mobility === "high") {
    if (textIncludesAny(detail, ["jogger_pants", "cargo_pants", "jeans", "short_sleeve_tshirt", "hoodie", "windbreaker", "sneakers", "running_shoes"])) score += 14;
    if (category === "shoes") score += 12;
    if (textIncludesAny(detail, ["coat", "padding", "blazer"])) score -= 8;
  }

  if (textIncludesAny(moodText, ["깔끔", "차분", "정돈"])) {
    if (textIncludesAny(styleHint, ["깔끔", "단정", "스마트", "정돈"])) score += 16;
    if (textIncludesAny(colorFamily, ["black", "white", "gray", "charcoal", "navy", "beige", "ivory", "deep_navy"])) score += 8;
  }

  if (textIncludesAny(moodText, ["편안", "캐주얼", "가벼", "자연"])) {
    if (textIncludesAny(styleHint, ["편안", "캐주얼", "가벼"])) score += 16;
    if (textIncludesAny(detail, ["hoodie", "sweatshirt", "jeans", "shorts", "jogger_pants", "sneakers", "running_shoes"])) score += 10;
  }

  if (textIncludesAny(occasionText, ["데이트", "약속", "모임"])) {
    if (textIncludesAny(styleHint, ["부드럽", "깔끔", "정돈", "스마트"])) score += 12;
    if (textIncludesAny(detail, ["cargo_pants", "jogger_pants"])) score -= 8;
  }

  if (textIncludesAny(occasionText, ["출근"])) {
    if (textIncludesAny(detail, ["shirt", "blouse", "slacks", "blazer", "coat", "loafer"])) score += 14;
  }

  if (textIncludesAny(occasionText, ["학교", "산책", "걷", "이동"])) {
    if (category === "shoes") score += 14;
    if (textIncludesAny(recommendationHint, ["편안", "가벼"])) score += 8;
  }

  if (textIncludesAny(stylingDirection, ["단정", "깔끔", "스마트", "정돈"])) {
    if (textIncludesAny(styleHint, ["깔끔", "단정", "스마트", "정돈"])) score += 10;
    if (textIncludesAny(detail, ["shirt", "blouse", "slacks", "blazer", "coat", "loafer"])) score += 8;
  }

  if (textIncludesAny(stylingDirection, ["편안", "가볍", "활동", "부담 없"])) {
    if (textIncludesAny(styleHint, ["편안", "가볍", "캐주얼"])) score += 10;
    if (textIncludesAny(detail, ["hoodie", "sweatshirt", "jeans", "jogger_pants", "sneakers", "running_shoes"])) score += 8;
  }

  if (textIncludesAny(prioritiesText, ["날씨 적합성"])) {
    score += Math.round((item.weather_fit_score ?? 0) * 0.12);
  }

  if (textIncludesAny(prioritiesText, ["깔끔", "단정"])) {
    if (textIncludesAny(styleHint, ["깔끔", "단정", "스마트"])) score += 10;
  }

  if (textIncludesAny(prioritiesText, ["편안", "활동성"])) {
    if (textIncludesAny(styleHint, ["편안", "가볍", "캐주얼"])) score += 10;
    if (category === "shoes") score += 6;
  }

  if (textIncludesAny(prioritiesText, ["과하지 않은", "자연스러운"]) && colorRole === "neutral") {
    score += 6;
  }

  if (item.recent_worn_days_ago != null) {
    if (item.recent_worn_days_ago <= 2) score -= 10;
    if (item.recent_worn_days_ago >= 14) score += 6;
  }

  if ((item.wear_count ?? 0) === 0) score += 4;

  return score;
}

function shouldKeepByWeather(item: WardrobeItem, weather: RecommendOutfitInput["weather"]) {
  const score = item.weather_fit_score ?? 0;
  const category = item.category;
  const effectiveTemp = weather.feels_like ?? weather.temperature;

  if (score >= 45) return true;
  if (category === "ACC") return score >= 35;
  if (category === "Outer") {
    return weather.rain || effectiveTemp <= 17 ? score >= 35 : score >= 55;
  }
  if (category === "Shoes") return score >= 30;
  return score >= 40;
}

function getCategoryLimit(category: string, weather: RecommendOutfitInput["weather"]) {
  const effectiveTemp = weather.feels_like ?? weather.temperature;

  if (category === "Top" || category === "Bottom") return 4;
  if (category === "Shoes") return 3;
  if (category === "Outer") return weather.rain || effectiveTemp <= 17 ? 3 : 1;
  if (category === "ACC") return 1;
  return 2;
}

function buildCandidateKey(item: WardrobeItem) {
  return [item.category, item.detail_category || "", item.color_family || item.color || ""].join("|");
}

export function selectWardrobeCandidates(
  items: WardrobeItem[],
  interpretation: CommentInterpretation,
  weather: RecommendOutfitInput["weather"],
) {
  const scored = items
    .filter((item) => shouldKeepByWeather(item, weather))
    .map((item) => ({
      item,
      score: scoreItemForInterpretation(item, interpretation),
    }))
    .sort((a, b) => b.score - a.score || a.item.id - b.item.id);

  const byCategory = new Map<string, WardrobeItem[]>();
  scored.forEach(({ item }) => {
    const key = item.category;
    const list = byCategory.get(key) || [];
    list.push(item);
    byCategory.set(key, list);
  });

  const selected: WardrobeItem[] = [];
  const seenKeys = new Set<string>();
  const pushUnique = (item: WardrobeItem) => {
    const candidateKey = buildCandidateKey(item);
    if (seenKeys.has(candidateKey)) return;
    if (!selected.some((entry) => entry.id === item.id)) selected.push(item);
    seenKeys.add(candidateKey);
  };

  ["Top", "Bottom", "Shoes", "Outer", "ACC"].forEach((category) => {
    (byCategory.get(category) || []).slice(0, getCategoryLimit(category, weather)).forEach(pushUnique);
  });

  scored.slice(0, 14).forEach(({ item }) => pushUnique(item));
  return selected.slice(0, 14);
}

function parseAndValidateSelection(
  rawText: string,
  wardrobeItems: WardrobeItem[],
  weather: RecommendOutfitInput["weather"],
) {
  const parsedJson = parseOpenAiJson(rawText);
  const parsed = selectionResponseSchema.safeParse(parsedJson);

  if (!parsed.success) {
    console.error("[recommendOutfit] selection zod validation failed", parsed.error.flatten());
    throw new Error("OpenAI selection response did not match the expected schema.");
  }

  return finalizeSelectedItemIds(parsed.data.look.item_ids, wardrobeItems, weather);
}

export async function requestRecommendation(
  client: OpenAI,
  input: RecommendOutfitInput,
  interpretedComment: CommentInterpretation,
  systemPrompt: string,
) {
  const rankedWardrobeItems = selectWardrobeCandidates(
    input.wardrobeItems,
    interpretedComment,
    input.weather,
  );

  const response = await createStructuredResponse(
    client,
    DEFAULT_MODEL,
    `${systemPrompt}${SELECTION_ONLY_APPEND_PROMPT}`,
    buildUserPrompt(input, interpretedComment, rankedWardrobeItems),
    SELECTION_JSON_SCHEMA,
  );

  const rawText = extractResponseText(response);
  return parseAndValidateSelection(rawText, input.wardrobeItems, input.weather);
}

export async function requestRecommendationWithRetry(
  client: OpenAI,
  input: RecommendOutfitInput,
  interpretedComment: CommentInterpretation,
) {
  const firstRecommendation = await requestRecommendation(
    client,
    input,
    interpretedComment,
    OUTFIT_RECOMMEND_SYSTEM_PROMPT,
  );

  if (!isWeakRecommendation(firstRecommendation, input.wardrobeItems, input.weather)) {
    return firstRecommendation;
  }

  try {
    const retriedRecommendation = await requestRecommendation(
      client,
      input,
      interpretedComment,
      `${OUTFIT_RECOMMEND_SYSTEM_PROMPT}${RETRY_RECOMMENDATION_APPEND_PROMPT}`,
    );

    return isWeakRecommendation(retriedRecommendation, input.wardrobeItems, input.weather)
      ? firstRecommendation
      : retriedRecommendation;
  } catch (retryError) {
    console.error("[recommendOutfit] retry recommendation failed", retryError);
    return firstRecommendation;
  }
}
