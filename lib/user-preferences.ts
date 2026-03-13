export type PreferredRegion = {
  sidoId: string;
  sigunguId: string;
};

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function readPreferredRegionFromMetadata(metadata: unknown): PreferredRegion | null {
  if (!metadata || typeof metadata !== "object") return null;

  const source = metadata as Record<string, unknown>;
  const nested =
    source.preferred_region && typeof source.preferred_region === "object"
      ? (source.preferred_region as Record<string, unknown>)
      : null;

  const sidoId = toText(nested?.sidoId ?? source.preferred_region_sido_id);
  const sigunguId = toText(nested?.sigunguId ?? source.preferred_region_sigungu_id);

  if (!sidoId || !sigunguId) return null;
  return { sidoId, sigunguId };
}

export function mergePreferredRegionMetadata(
  metadata: unknown,
  preferredRegion: PreferredRegion | null,
): Record<string, unknown> {
  const source =
    metadata && typeof metadata === "object" ? { ...(metadata as Record<string, unknown>) } : {};

  if (!preferredRegion) {
    delete source.preferred_region;
    delete source.preferred_region_sido_id;
    delete source.preferred_region_sigungu_id;
    return source;
  }

  source.preferred_region = {
    sidoId: preferredRegion.sidoId,
    sigunguId: preferredRegion.sigunguId,
  };
  source.preferred_region_sido_id = preferredRegion.sidoId;
  source.preferred_region_sigungu_id = preferredRegion.sigunguId;
  return source;
}
