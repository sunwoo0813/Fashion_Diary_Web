import { interpretUserComment } from "@/lib/ai/commentInterpretation";
import { generateFinalExplanation } from "@/lib/ai/outfitExplanation";
import { requestRecommendationWithRetry } from "@/lib/ai/outfitSelection";
import {
  getOpenAIClient,
  recommendOutfitInputSchema,
  type CommentInterpretation,
  type OutfitRecommendationResult,
  type RecommendOutfitInput,
} from "@/lib/ai/recommendOutfitShared";

export {
  commentInterpretationSchema,
  recommendOutfitInputSchema,
  weatherInputSchema,
  wardrobeItemSchema,
} from "@/lib/ai/recommendOutfitShared";

export type {
  CommentInterpretation,
  OutfitRecommendationResult,
  RecommendOutfitInput,
  WardrobeItem,
  WeatherInput,
} from "@/lib/ai/recommendOutfitShared";

export async function recommendOutfit(
  input: RecommendOutfitInput,
): Promise<OutfitRecommendationResult> {
  const parsedInput = recommendOutfitInputSchema.parse(input);
  const client = getOpenAIClient();

  try {
    const interpretedComment: CommentInterpretation = await interpretUserComment(
      client,
      parsedInput.userComment,
    );

    const finalItemIds = await requestRecommendationWithRetry(
      client,
      parsedInput,
      interpretedComment,
    );

    const explanation = await generateFinalExplanation(
      client,
      parsedInput,
      interpretedComment,
      finalItemIds,
    );

    return {
      summary: explanation.summary,
      look: {
        item_ids: finalItemIds,
        summary: explanation.lookSummary,
        reason: explanation.reason,
      },
    };
  } catch (error) {
    console.error("[recommendOutfit] failed", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to generate outfit recommendation.");
  }
}
