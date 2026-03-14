import { resolveCategoryFilter } from "@/lib/wardrobe";

export type WardrobeCategoryFilter = {
  label: string;
  value: string;
  aliases?: string[];
};

export const CATEGORY_FILTERS: WardrobeCategoryFilter[] = [
  { label: "전체", value: "" },
  { label: "아우터", value: "Outerwear" },
  { label: "상의", value: "Top", aliases: ["Tops"] },
  { label: "하의", value: "Bottom", aliases: ["Bottoms"] },
  { label: "신발", value: "Footwear" },
  { label: "액세서리", value: "Accessories" },
];

export function isCategoryActive(currentCategory: string, filter: WardrobeCategoryFilter): boolean {
  if (!filter.value) return !currentCategory;
  return currentCategory === filter.value || (filter.aliases || []).includes(currentCategory);
}

export function buildWardrobeFilterHref(query: string, categoryValue: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (categoryValue) params.set("category", categoryValue);
  const queryString = params.toString();
  return queryString ? `/wardrobe?${queryString}` : "/wardrobe";
}

export function buildWardrobeCategoryCounts(
  categories: Array<string | null | undefined>,
): Record<string, number> {
  const counts: Record<string, number> = { "": categories.length };

  CATEGORY_FILTERS.forEach((filter) => {
    if (!filter.value) return;
    counts[filter.value] = 0;
  });

  categories.forEach((rawCategory) => {
    const category = String(rawCategory || "").trim();
    if (!category) return;

    const matchedFilter = CATEGORY_FILTERS.find((filter) => {
      if (!filter.value) return false;
      const resolved = resolveCategoryFilter(filter.value) ?? [filter.value];
      return resolved.includes(category);
    });

    if (matchedFilter) {
      counts[matchedFilter.value] = (counts[matchedFilter.value] ?? 0) + 1;
    }
  });

  return counts;
}
