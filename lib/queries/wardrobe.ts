import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { makeDisplayNameFromFields, normalizePublicImagePath, resolveCategoryFilter } from "@/lib/wardrobe";

export type WardrobeItem = {
  id: number;
  user_id: number;
  name: string;
  category: string | null;
  detail_category: string | null;
  season: string[];
  thickness: string | null;
  size: string | null;
  size_detail: unknown;
  image_path: string | null;
  created_at: string | null;
};

type GetWardrobePageDataInput = {
  appUserId: number;
  query: string;
  category: string;
};

type WardrobePageData = {
  items: WardrobeItem[];
  wearCounts: Record<number, number>;
  recentWearDates: Record<number, string>;
  favoriteIds: number[];
  hasFilters: boolean;
};

const WARDROBE_CACHE_TTL_MS = 10_000;

type WardrobeCacheEntry = {
  data: WardrobePageData;
  expiresAt: number;
};

const wardrobePageCache = new Map<string, WardrobeCacheEntry>();

function countById(ids: number[]) {
  const counts: Record<number, number> = {};
  ids.forEach((id) => {
    counts[id] = (counts[id] ?? 0) + 1;
  });
  return counts;
}

function mergeCounts(target: Record<number, number>, add: Record<number, number>) {
  Object.entries(add).forEach(([idText, count]) => {
    const id = Number(idText);
    target[id] = (target[id] ?? 0) + count;
  });
}

function cleanupWardrobeCache(now: number) {
  for (const [key, entry] of wardrobePageCache.entries()) {
    if (entry.expiresAt <= now) {
      wardrobePageCache.delete(key);
    }
  }
}

function buildWardrobeCacheKey(appUserId: number, query: string, category: string): string {
  return `${appUserId}|q=${query}|c=${category}`;
}

function cloneWardrobePageData(data: WardrobePageData): WardrobePageData {
  return {
    items: data.items.map((item) => ({ ...item })),
    wearCounts: { ...data.wearCounts },
    recentWearDates: { ...data.recentWearDates },
    favoriteIds: [...data.favoriteIds],
    hasFilters: data.hasFilters,
  };
}

export async function getWardrobePageData({
  appUserId,
  query,
  category,
}: GetWardrobePageDataInput): Promise<WardrobePageData> {
  const admin = createServiceRoleSupabaseClient();
  const normalizedQuery = query.trim();
  const normalizedCategory = category.trim();
  const now = Date.now();
  cleanupWardrobeCache(now);

  const cacheKey = buildWardrobeCacheKey(appUserId, normalizedQuery, normalizedCategory);
  const cached = wardrobePageCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cloneWardrobePageData(cached.data);
  }

  let itemsQuery = admin
    .from("item")
    .select("id,user_id,brand,product_name,category,detail_category,season,thickness,size,size_detail,image_path,created_at")
    .eq("user_id", appUserId)
    .order("created_at", { ascending: false });

  if (normalizedQuery) {
    const escaped = normalizedQuery.replace(/,/g, "\\,");
    itemsQuery = itemsQuery.or(`brand.ilike.%${escaped}%,product_name.ilike.%${escaped}%,category.ilike.%${escaped}%`);
  }

  if (normalizedCategory) {
    const categories = resolveCategoryFilter(normalizedCategory);
    if (categories && categories.length > 0) {
      if (categories.length === 1) {
        itemsQuery = itemsQuery.eq("category", categories[0]);
      } else {
        itemsQuery = itemsQuery.in("category", categories);
      }
    }
  }

  const { data: rawItems, error: itemsError } = await itemsQuery;
  if (itemsError) {
    throw new Error(`Wardrobe item query failed: ${itemsError.message}`);
  }

  const items = (rawItems || []).map((row) => ({
    id: Number(row.id),
    user_id: Number(row.user_id),
    name: makeDisplayNameFromFields(row.brand, row.product_name),
    category: row.category ? String(row.category) : null,
    detail_category: row.detail_category ? String(row.detail_category) : null,
    season: Array.isArray(row.season) ? row.season.map((value) => String(value)).filter(Boolean) : [],
    thickness: row.thickness ? String(row.thickness) : null,
    size: row.size ? String(row.size) : null,
    size_detail: row.size_detail ?? null,
    image_path: row.image_path ? normalizePublicImagePath(String(row.image_path)) : null,
    created_at: row.created_at ? String(row.created_at) : null,
  }));

  const wearCounts: Record<number, number> = {};
  const recentWearDates: Record<number, string> = {};
  const itemIds = items.map((item) => item.id);
  if (itemIds.length > 0) {
    const [
      { data: outfitItems, error: outfitItemError },
      { data: photoItems, error: photoItemError },
      { data: outfitRows, error: outfitError },
      { data: outfitPhotoRows, error: outfitPhotoError },
    ] = await Promise.all([
      admin.from("outfit_item").select("item_id,outfit_id").in("item_id", itemIds),
      admin.from("outfit_photo_item").select("item_id,photo_id").in("item_id", itemIds),
      admin.from("outfit").select("id,date"),
      admin.from("outfit_photo").select("id,outfit_id"),
    ]);
    if (outfitItemError) {
      throw new Error(`Outfit item lookup failed: ${outfitItemError.message}`);
    }
    if (photoItemError) {
      throw new Error(`Outfit photo item lookup failed: ${photoItemError.message}`);
    }
    if (outfitError) {
      throw new Error(`Outfit lookup failed: ${outfitError.message}`);
    }
    if (outfitPhotoError) {
      throw new Error(`Outfit photo lookup failed: ${outfitPhotoError.message}`);
    }

    const outfitItemCounts = countById(
      (outfitItems || []).map((row) => Number(row.item_id)).filter((id) => Number.isFinite(id)),
    );
    mergeCounts(wearCounts, outfitItemCounts);

    const photoItemCounts = countById(
      (photoItems || []).map((row) => Number(row.item_id)).filter((id) => Number.isFinite(id)),
    );
    mergeCounts(wearCounts, photoItemCounts);

    const outfitDateById = new Map<number, string>();
    (outfitRows || []).forEach((row) => {
      const id = Number(row.id);
      const date = row.date ? String(row.date).slice(0, 10) : "";
      if (Number.isFinite(id) && date) {
        outfitDateById.set(id, date);
      }
    });

    const outfitIdByPhotoId = new Map<number, number>();
    (outfitPhotoRows || []).forEach((row) => {
      const photoId = Number(row.id);
      const outfitId = Number(row.outfit_id);
      if (Number.isFinite(photoId) && Number.isFinite(outfitId)) {
        outfitIdByPhotoId.set(photoId, outfitId);
      }
    });

    function assignRecentWearDate(itemId: number, nextDate: string) {
      if (!nextDate) return;
      const currentDate = recentWearDates[itemId] || "";
      if (!currentDate || nextDate > currentDate) {
        recentWearDates[itemId] = nextDate;
      }
    }

    (outfitItems || []).forEach((row) => {
      const itemId = Number(row.item_id);
      const outfitId = Number(row.outfit_id);
      if (!Number.isFinite(itemId) || !Number.isFinite(outfitId)) return;
      assignRecentWearDate(itemId, outfitDateById.get(outfitId) || "");
    });

    (photoItems || []).forEach((row) => {
      const itemId = Number(row.item_id);
      const photoId = Number(row.photo_id);
      if (!Number.isFinite(itemId) || !Number.isFinite(photoId)) return;
      const outfitId = outfitIdByPhotoId.get(photoId);
      if (!outfitId) return;
      assignRecentWearDate(itemId, outfitDateById.get(outfitId) || "");
    });
  }

  const favoriteIds = Object.entries(wearCounts)
    .map(([idText, count]) => ({ id: Number(idText), count }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.id - b.id)
    .slice(0, 3)
    .map((row) => row.id);

  const result: WardrobePageData = {
    items,
    wearCounts,
    recentWearDates,
    favoriteIds,
    hasFilters: Boolean(normalizedQuery || normalizedCategory),
  };

  wardrobePageCache.set(cacheKey, {
    data: result,
    expiresAt: now + WARDROBE_CACHE_TTL_MS,
  });

  return cloneWardrobePageData(result);
}
