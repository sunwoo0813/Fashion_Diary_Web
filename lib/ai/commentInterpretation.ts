import OpenAI from "openai";

import {
  COMMENT_INTERPRETATION_JSON_SCHEMA,
  DEFAULT_MODEL,
  FALLBACK_COMMENT_INTERPRETATION,
  type CommentInterpretation,
  commentInterpretationSchema,
  createStructuredResponse,
  extractResponseText,
  normalizeMoodValues,
  parseOpenAiJson,
} from "@/lib/ai/recommendOutfitShared";

const COMMENT_INTERPRETATION_SYSTEM_PROMPT = `너는 사용자의 코멘트에서 오늘 코디의 핵심 의도를 구조화하는 분석 AI다.

역할:
- 사용자의 자연어 코멘트를 읽고, 오늘 코디 추천에 필요한 의도를 짧고 명확한 구조화 데이터로 변환한다.
- 패션 추천이나 아이템 추천은 하지 않는다.
- 코멘트에 직접 드러난 내용만 우선 반영하고, 과도한 추측은 하지 않는다.

목표:
- 오늘 원하는 분위기
- 오늘의 상황
- 단정함 수준
- 편안함 중요도
- 활동성 / 많이 걷는 정도
- 스타일 방향 요약
- 오늘 코디에서 중요한 우선조건
을 일관된 JSON 형식으로 반환한다.

해석 원칙:
- 코멘트에서 직접 읽히는 내용 위주로 정리한다.
- 명확하지 않은 정보는 과하게 상상하지 않는다.
- 여러 의미가 섞여 있으면 오늘 코디 판단에 더 중요한 쪽으로 정리한다.
- 날씨 자체를 추론하지 않는다. 날씨 관련 표현이 코멘트에 직접 있을 때만 반영한다.
- mood는 시각적 분위기나 인상 중심으로 해석한다.
- comfort는 착용감이나 편한 정도를 뜻한다.
- mobility는 활동량, 이동량, 오래 걷는 정도를 뜻한다.
- formality는 격식이나 단정함 수준을 뜻한다.

출력 규칙:
- 반드시 JSON만 반환한다.
- mood는 반드시 배열로 반환한다.
- priorities는 반드시 배열로 반환한다.
- 값이 모호해도 필수 필드는 모두 채운다.
`;

function buildCommentInterpretationUserPrompt(userComment: string) {
  return JSON.stringify({ user_comment: userComment }, null, 2);
}

function parseAndValidateCommentInterpretation(rawText: string) {
  const parsedJson = parseOpenAiJson(rawText);
  const normalizedJson =
    parsedJson &&
    typeof parsedJson === "object" &&
    !Array.isArray(parsedJson) &&
    typeof (parsedJson as { mood?: unknown }).mood === "string"
      ? {
          ...(parsedJson as Record<string, unknown>),
          mood: [(parsedJson as { mood: string }).mood],
        }
      : parsedJson;

  const parsed = commentInterpretationSchema.safeParse(normalizedJson);

  if (!parsed.success) {
    console.error("[recommendOutfit] comment interpretation zod validation failed", parsed.error.flatten());
    return FALLBACK_COMMENT_INTERPRETATION;
  }

  return {
    ...parsed.data,
    mood: normalizeMoodValues(parsed.data.mood),
  };
}

export async function interpretUserComment(client: OpenAI, userComment: string): Promise<CommentInterpretation> {
  try {
    const response = await createStructuredResponse(
      client,
      DEFAULT_MODEL,
      COMMENT_INTERPRETATION_SYSTEM_PROMPT,
      buildCommentInterpretationUserPrompt(userComment),
      COMMENT_INTERPRETATION_JSON_SCHEMA,
    );

    const rawText = extractResponseText(response);
    return parseAndValidateCommentInterpretation(rawText);
  } catch (error) {
    console.error("[recommendOutfit] comment interpretation failed", error);
    return FALLBACK_COMMENT_INTERPRETATION;
  }
}
