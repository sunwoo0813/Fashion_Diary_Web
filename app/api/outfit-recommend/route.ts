import { NextRequest, NextResponse } from "next/server";

import {
  recommendOutfit,
  recommendOutfitInputSchema,
} from "@/lib/ai/recommendOutfit";

type ApiSuccessResponse = {
  ok: true;
  data: Awaited<ReturnType<typeof recommendOutfit>>;
};

type ApiErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

function buildErrorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const payload: ApiErrorResponse = {
    ok: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };

  return NextResponse.json(payload, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = recommendOutfitInputSchema.safeParse(body);

    if (!parsed.success) {
      console.error("[POST /api/outfit-recommend] invalid request body", parsed.error.flatten());
      return buildErrorResponse(
        400,
        "INVALID_REQUEST_BODY",
        "Request body validation failed.",
        parsed.error.flatten(),
      );
    }

    const recommendation = await recommendOutfit(parsed.data);
    const payload: ApiSuccessResponse = {
      ok: true,
      data: recommendation,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[POST /api/outfit-recommend] failed", error);

    const message =
      error instanceof Error ? error.message : "Failed to generate outfit recommendation.";

    return buildErrorResponse(500, "OUTFIT_RECOMMENDATION_FAILED", message);
  }
}
