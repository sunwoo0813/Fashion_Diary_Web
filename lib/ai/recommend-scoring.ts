import { deriveColorFamily, deriveColorRole, deriveColorTone } from "@/lib/ai/recommend-color";
import type { WardrobeItem, WeatherInput } from "@/lib/ai/recommend-schemas";

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
