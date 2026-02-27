import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { resolveCategoryFilter } from "@/lib/wardrobe";

export type WardrobeItem = {
  id: number;
  user_id: number;
  name: string;
  category: string | null;
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
    .select("id,user_id,name,category,size,size_detail,image_path,created_at")
    .eq("user_id", appUserId)
    .order("created_at", { ascending: false });

  if (normalizedQuery) {
    const escaped = normalizedQuery.replace(/,/g, "\\,");
    itemsQuery = itemsQuery.or(`name.ilike.%${escaped}%,category.ilike.%${escaped}%`);
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
    name: String(row.name || "Untitled"),
    category: row.category ? String(row.category) : null,
    size: row.size ? String(row.size) : null,
    size_detail: row.size_detail ?? null,
    image_path: row.image_path ? String(row.image_path) : null,
    created_at: row.created_at ? String(row.created_at) : null,
  }));

  const wearCounts: Record<number, number> = {};
  const itemIds = items.map((item) => item.id);
  if (itemIds.length > 0) {
    const [{ data: outfitItems, error: outfitItemError }, { data: photoItems, error: photoItemError }] =
      await Promise.all([
        admin.from("outfit_item").select("item_id").in("item_id", itemIds),
        admin.from("outfit_photo_item").select("item_id").in("item_id", itemIds),
      ]);
    if (outfitItemError) {
      throw new Error(`Outfit item lookup failed: ${outfitItemError.message}`);
    }
    if (photoItemError) {
      throw new Error(`Outfit photo item lookup failed: ${photoItemError.message}`);
    }

    const outfitItemCounts = countById(
      (outfitItems || []).map((row) => Number(row.item_id)).filter((id) => Number.isFinite(id)),
    );
    mergeCounts(wearCounts, outfitItemCounts);

    const photoItemCounts = countById(
      (photoItems || []).map((row) => Number(row.item_id)).filter((id) => Number.isFinite(id)),
    );
    mergeCounts(wearCounts, photoItemCounts);
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
    favoriteIds,
    hasFilters: Boolean(normalizedQuery || normalizedCategory),
  };

  wardrobePageCache.set(cacheKey, {
    data: result,
    expiresAt: now + WARDROBE_CACHE_TTL_MS,
  });

  return cloneWardrobePageData(result);
}
