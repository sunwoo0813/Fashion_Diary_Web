export function deriveColorFamily(color: string | null | undefined) {
  const value = (color || "").trim().toLowerCase();
  if (!value) return undefined;

  const explicitMap: Record<string, string> = {
    light_blue_denim: "light_blue",
    medium_blue_denim: "blue",
    dark_blue_denim: "dark_blue",
    raw_denim: "deep_navy",
    black_denim: "black",
    gray_denim: "gray",
    white_denim: "white",
  };

  if (explicitMap[value]) return explicitMap[value];
  if (value.includes("denim")) return "denim";
  return value;
}

export function deriveColorTone(
  color: string | null | undefined,
  colorFamily?: string,
): "light" | "medium" | "dark" | undefined {
  const value = (color || "").trim().toLowerCase();
  const family = (colorFamily || deriveColorFamily(color) || "").trim().toLowerCase();
  const source = family || value;

  if (!source) return undefined;
  if (
    ["white", "ivory", "cream", "light_gray", "light_blue", "light_pink", "sky_blue", "mint"].includes(
      source,
    )
  ) {
    return "light";
  }
  if (
    ["black", "charcoal", "deep_navy", "dark_blue", "dark_brown", "burgundy", "wine", "forest_green"].includes(
      source,
    )
  ) {
    return "dark";
  }
  return "medium";
}

export function deriveColorRole(
  color: string | null | undefined,
  colorFamily?: string,
): "neutral" | "point" | undefined {
  const family = (colorFamily || deriveColorFamily(color) || "").trim().toLowerCase();
  if (!family) return undefined;
  if (
    [
      "black",
      "white",
      "gray",
      "charcoal",
      "navy",
      "deep_navy",
      "beige",
      "ivory",
      "brown",
      "khaki",
      "denim",
      "blue",
      "dark_blue",
      "light_blue",
    ].includes(family)
  ) {
    return "neutral";
  }
  return "point";
}

export function buildColorInterpretation(color: string | null | undefined) {
  const value = (color || "").trim().toLowerCase();
  if (!value) return undefined;

  const explicitMap: Record<string, string> = {
    light_blue_denim: "light blue denim",
    medium_blue_denim: "medium blue denim",
    dark_blue_denim: "dark blue denim",
    raw_denim: "raw denim",
    black_denim: "black denim",
    gray_denim: "gray denim",
    white_denim: "white denim",
  };

  return explicitMap[value] || value.replaceAll("_", " ");
}
