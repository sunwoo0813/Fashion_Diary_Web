import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { makeDisplayNameFromFields, normalizePublicImagePath } from "@/lib/wardrobe";

const CHUNK_SIZE = 200;
const STATS_CACHE_TTL_MS = 20_000;

type OutfitRow = {
  id: number;
  date: string;
};

type ItemMeta = {
  id: number;
  name: string;
  category: string | null;
  image_path: string | null;
};

type OutfitPhotoRow = {
  id: number;
  outfitId: number;
};

type WearLink = {
  itemId: number;
  outfitId: number;
};

export type StatsTopItem = {
  id: number;
  name: string;
  category: string | null;
  image_path: string | null;
  count: number;
};

export type StatsDormantItem = {
  id: number;
  name: string;
  category: string | null;
  image_path: string | null;
  wearCount: number;
  recentWearDate: string | null;
};

export type StatsCategoryCount = {
  category: string;
  ownedCount: number;
  wearCount: number;
};

export type StatsPageData = {
  topItems: StatsTopItem[];
  dormantItems: StatsDormantItem[];
  categorySorted: StatsCategoryCount[];
  totalItems: number;
  totalOutfits: number;
  totalPhotos: number;
  activeItemRate: number;
  dormantItemCount: number;
  recentActiveItemCount: number;
};

type StatsCacheEntry = {
  data: StatsPageData;
  expiresAt: number;
};

const statsPageCache = new Map<number, StatsCacheEntry>();

function normalizeCategory(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text || "미분류";
}

function toNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function toInt(value: unknown): number | null {
  const parsed = toNumber(value);
  if (parsed == null) return null;
  return Math.trunc(parsed);
}

function toDateOnly(value: unknown): string | null {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function cleanupStatsCache(now: number) {
  for (const [key, value] of statsPageCache.entries()) {
    if (value.expiresAt <= now) {
      statsPageCache.delete(key);
    }
  }
}

function cloneStatsPageData(data: StatsPageData): StatsPageData {
  return {
    ...data,
    topItems: data.topItems.map((item) => ({ ...item })),
    dormantItems: data.dormantItems.map((item) => ({ ...item })),
    categorySorted: data.categorySorted.map((row) => ({ ...row })),
  };
}

async function fetchPhotosByOutfitIds(outfitIds: number[]): Promise<OutfitPhotoRow[]> {
  if (outfitIds.length === 0) return [];

  const admin = createServiceRoleSupabaseClient();
  const photos: OutfitPhotoRow[] = [];

  for (const idChunk of chunks(outfitIds, CHUNK_SIZE)) {
    const { data, error } = await admin.from("outfit_photo").select("id,outfit_id").in("outfit_id", idChunk);
    if (error) {
      throw new Error(`Outfit photo query failed: ${error.message}`);
    }

    (data || []).forEach((row) => {
      const photoId = toInt(row.id);
      const outfitId = toInt(row.outfit_id);
      if (!photoId || !outfitId) return;
      photos.push({ id: photoId, outfitId });
    });
  }

  return photos;
}

async function fetchWearLinks(outfitIds: number[], photos: OutfitPhotoRow[]): Promise<WearLink[]> {
  const admin = createServiceRoleSupabaseClient();
  const links: WearLink[] = [];

  if (outfitIds.length > 0) {
    for (const chunkIds of chunks(outfitIds, CHUNK_SIZE)) {
      const { data, error } = await admin.from("outfit_item").select("item_id,outfit_id").in("outfit_id", chunkIds);
      if (error) {
        throw new Error(`Outfit wear query failed: ${error.message}`);
      }

      (data || []).forEach((row) => {
        const itemId = toInt(row.item_id);
        const outfitId = toInt(row.outfit_id);
        if (!itemId || !outfitId) return;
        links.push({ itemId, outfitId });
      });
    }
  }

  if (photos.length > 0) {
    const outfitIdByPhotoId = new Map<number, number>();
    photos.forEach((photo) => {
      outfitIdByPhotoId.set(photo.id, photo.outfitId);
    });

    for (const photoChunk of chunks(
      photos.map((photo) => photo.id),
      CHUNK_SIZE,
    )) {
      const { data, error } = await admin.from("outfit_photo_item").select("item_id,photo_id").in("photo_id", photoChunk);
      if (error) {
        throw new Error(`Outfit photo wear query failed: ${error.message}`);
      }

      (data || []).forEach((row) => {
        const itemId = toInt(row.item_id);
        const photoId = toInt(row.photo_id);
        const outfitId = photoId ? outfitIdByPhotoId.get(photoId) : null;
        if (!itemId || !outfitId) return;
        links.push({ itemId, outfitId });
      });
    }
  }

  return links;
}

export async function getStatsPageData(appUserId: number): Promise<StatsPageData> {
  const admin = createServiceRoleSupabaseClient();
  const now = Date.now();
  cleanupStatsCache(now);

  const cached = statsPageCache.get(appUserId);
  if (cached && cached.expiresAt > now) {
    return cloneStatsPageData(cached.data);
  }

  const today = new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setDate(cutoffDate.getDate() - 30);
  const cutoffIso = cutoffDate.toISOString().slice(0, 10);

  const [{ data: itemRows, error: itemError }, { data: outfitRowsRaw, error: outfitError }] = await Promise.all([
    admin.from("item").select("id,brand,product_name,category,image_path").eq("user_id", appUserId),
    admin.from("outfit").select("id,date").eq("user_id", appUserId).order("date", { ascending: false }),
  ]);

  if (itemError) {
    throw new Error(`Stats item query failed: ${itemError.message}`);
  }
  if (outfitError) {
    throw new Error(`Stats outfit query failed: ${outfitError.message}`);
  }

  const items: ItemMeta[] = (itemRows || [])
    .map((row) => ({
      id: toInt(row.id) ?? 0,
      name: makeDisplayNameFromFields(row.brand, row.product_name),
      category: typeof row.category === "string" && row.category.trim() ? row.category.trim() : null,
      image_path:
        typeof row.image_path === "string" && row.image_path.trim()
          ? normalizePublicImagePath(row.image_path.trim())
          : null,
    }))
    .filter((item) => item.id > 0);

  const outfits: OutfitRow[] = (outfitRowsRaw || [])
    .map((row) => ({
      id: toInt(row.id) ?? 0,
      date: toDateOnly(row.date) || "",
    }))
    .filter((row) => row.id > 0 && row.date);

  const totalItems = items.length;
  const totalOutfits = outfits.length;
  const outfitIds = outfits.map((row) => row.id);
  const photos = await fetchPhotosByOutfitIds(outfitIds);
  const totalPhotos = photos.length;
  const wearLinks = await fetchWearLinks(outfitIds, photos);

  const outfitDateById = new Map<number, string>();
  outfits.forEach((outfit) => {
    outfitDateById.set(outfit.id, outfit.date);
  });

  const itemById = new Map<number, ItemMeta>();
  const categoryOwnedCounts: Record<string, number> = {};
  items.forEach((item) => {
    itemById.set(item.id, item);
    const category = normalizeCategory(item.category);
    categoryOwnedCounts[category] = (categoryOwnedCounts[category] ?? 0) + 1;
  });

  const recentWearCounts: Record<number, number> = {};
  const totalWearCounts: Record<number, number> = {};
  const recentWearDates: Record<number, string> = {};
  const categoryWearCounts: Record<string, number> = {};

  wearLinks.forEach((link) => {
    const item = itemById.get(link.itemId);
    const outfitDate = outfitDateById.get(link.outfitId) || "";
    if (!item || !outfitDate) return;

    totalWearCounts[link.itemId] = (totalWearCounts[link.itemId] ?? 0) + 1;
    const category = normalizeCategory(item.category);
    categoryWearCounts[category] = (categoryWearCounts[category] ?? 0) + 1;

    const currentRecentDate = recentWearDates[link.itemId] || "";
    if (!currentRecentDate || outfitDate > currentRecentDate) {
      recentWearDates[link.itemId] = outfitDate;
    }

    if (outfitDate >= cutoffIso) {
      recentWearCounts[link.itemId] = (recentWearCounts[link.itemId] ?? 0) + 1;
    }
  });

  const categoryKeys = Array.from(new Set([...Object.keys(categoryOwnedCounts), ...Object.keys(categoryWearCounts)]));
  const categorySorted = categoryKeys
    .map((category) => ({
      category,
      ownedCount: categoryOwnedCounts[category] ?? 0,
      wearCount: categoryWearCounts[category] ?? 0,
    }))
    .sort((a, b) => b.ownedCount - a.ownedCount || b.wearCount - a.wearCount || a.category.localeCompare(b.category));

  const topItems = Object.entries(recentWearCounts)
    .map(([idText, count]) => ({ id: Number(idText), count }))
    .filter((row) => row.id > 0 && row.count > 0)
    .sort((a, b) => b.count - a.count || a.id - b.id)
    .slice(0, 5)
    .map((row) => {
      const item = itemById.get(row.id);
      return {
        id: row.id,
        name: item?.name || "아이템",
        category: item?.category || null,
        image_path: item?.image_path || null,
        count: row.count,
      };
    });

  const dormantItems = items
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      image_path: item.image_path,
      wearCount: totalWearCounts[item.id] ?? 0,
      recentWearDate: recentWearDates[item.id] || null,
    }))
    .sort((a, b) => {
      if (a.wearCount !== b.wearCount) return a.wearCount - b.wearCount;
      if (!a.recentWearDate && !b.recentWearDate) return a.name.localeCompare(b.name);
      if (!a.recentWearDate) return -1;
      if (!b.recentWearDate) return 1;
      return a.recentWearDate.localeCompare(b.recentWearDate);
    })
    .slice(0, 5);

  const wornItemCount = Object.keys(totalWearCounts).filter((idText) => (totalWearCounts[Number(idText)] ?? 0) > 0).length;
  const recentActiveItemCount = Object.keys(recentWearCounts).filter(
    (idText) => (recentWearCounts[Number(idText)] ?? 0) > 0,
  ).length;
  const activeItemRate = totalItems > 0 ? Math.round((wornItemCount / totalItems) * 100) : 0;
  const dormantItemCount = Math.max(0, totalItems - wornItemCount);

  const result: StatsPageData = {
    topItems,
    dormantItems,
    categorySorted,
    totalItems,
    totalOutfits,
    totalPhotos,
    activeItemRate,
    dormantItemCount,
    recentActiveItemCount,
  };

  statsPageCache.set(appUserId, {
    data: result,
    expiresAt: now + STATS_CACHE_TTL_MS,
  });

  return cloneStatsPageData(result);
}
