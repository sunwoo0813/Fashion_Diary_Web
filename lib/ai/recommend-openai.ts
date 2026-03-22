import OpenAI from "openai";

import {
  FALLBACK_COMMENT_INTERPRETATION,
  GENERIC_MOOD_MAP,
  type CommentInterpretation,
  type WardrobeItem,
} from "@/lib/ai/recommend-schemas";

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

export type { CommentInterpretation };
