import { ensureValidItemIds } from "@/lib/ai/recommend-openai";
import type { WardrobeItem, WeatherInput } from "@/lib/ai/recommend-schemas";
import {
  buildCombinationScore,
  getCategoryLimit,
  scoreAdditionalCandidate,
  scoreCandidateForPostProcess,
} from "@/lib/ai/recommend-scoring";

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
