import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TEMP_BUCKET_ORDER = ["0-4C", "5-13C", "14-22C", "23-28C", "29C+"] as const;
const CHUNK_SIZE = 200;

type TempBucketKey = (typeof TEMP_BUCKET_ORDER)[number];

type OutfitRow = {
  id: number;
  date: string;
  t_min: number | null;
  t_max: number | null;
  humidity: number | null;
  rain: boolean;
};

export type StatsTopItem = {
  id: number;
  name: string;
  category: string | null;
  image_path: string | null;
  count: number;
};

export type StatsCategoryCount = {
  category: string;
  count: number;
};

export type StatsMonthPair = {
  label: string;
  count: number;
};

export type StatsTempBucket = {
  label: TempBucketKey;
  count: number;
};

export type StatsPageData = {
  topItems: StatsTopItem[];
  monthPairs: StatsMonthPair[];
  tempBuckets: StatsTempBucket[];
  categorySorted: StatsCategoryCount[];
  totalItems: number;
  totalOutfits: number;
  totalPhotos: number;
  maxMonthCount: number;
  weatherTotal: number;
  rainCount: number;
  clearCount: number;
  rainRatio: number;
  maxTempCount: number;
  efficiencyRate: number;
  curationPercent: number;
  topCategory: string;
  currentYear: number;
};

const STATS_CACHE_TTL_MS = 20_000;

type StatsCacheEntry = {
  data: StatsPageData;
  expiresAt: number;
};

type OutfitPhotoRow = {
  id: number;
  outfitId: number;
};

const statsPageCache = new Map<number, StatsCacheEntry>();

function normalizeCategory(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text || "Unknown";
}

function toNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function toInt(value: unknown): number | null {
  const n = toNumber(value);
  if (n == null) return null;
  return Math.trunc(n);
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  return false;
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
  const out: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    out.push(values.slice(i, i + size));
  }
  return out;
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
    monthPairs: data.monthPairs.map((pair) => ({ ...pair })),
    tempBuckets: data.tempBuckets.map((bucket) => ({ ...bucket })),
    categorySorted: data.categorySorted.map((row) => ({ ...row })),
  };
}

async function fetchPhotosByOutfitIds(outfitIds: number[]): Promise<OutfitPhotoRow[]> {
  if (outfitIds.length === 0) return [];
  const admin = createServiceRoleSupabaseClient();
  const photos: OutfitPhotoRow[] = [];

  for (const idChunk of chunks(outfitIds, CHUNK_SIZE)) {
    const { data, error } = await admin
      .from("outfit_photo")
      .select("id,outfit_id")
      .in("outfit_id", idChunk);
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

async function fetchRecentWearCounts(
  recentOutfitIds: number[],
  recentPhotoIds: number[],
  allowedItemIds: Set<number>,
): Promise<Record<number, number>> {
  const wearCounts: Record<number, number> = {};
  if (allowedItemIds.size === 0) return wearCounts;

  const admin = createServiceRoleSupabaseClient();

  if (recentOutfitIds.length > 0) {
    for (const outfitChunk of chunks(recentOutfitIds, CHUNK_SIZE)) {
      const { data, error } = await admin
        .from("outfit_item")
        .select("item_id")
        .in("outfit_id", outfitChunk);
      if (error) {
        throw new Error(`Outfit wear query failed: ${error.message}`);
      }
      (data || []).forEach((row) => {
        const itemId = toInt(row.item_id);
        if (!itemId || !allowedItemIds.has(itemId)) return;
        wearCounts[itemId] = (wearCounts[itemId] ?? 0) + 1;
      });
    }
  }

  if (recentPhotoIds.length > 0) {
    for (const photoChunk of chunks(recentPhotoIds, CHUNK_SIZE)) {
      const { data, error } = await admin
        .from("outfit_photo_item")
        .select("item_id")
        .in("photo_id", photoChunk);
      if (error) {
        throw new Error(`Outfit photo wear query failed: ${error.message}`);
      }
      (data || []).forEach((row) => {
        const itemId = toInt(row.item_id);
        if (!itemId || !allowedItemIds.has(itemId)) return;
        wearCounts[itemId] = (wearCounts[itemId] ?? 0) + 1;
      });
    }
  }

  return wearCounts;
}

function bucketKey(avgTemp: number): TempBucketKey {
  if (avgTemp <= 4) return "0-4C";
  if (avgTemp <= 13) return "5-13C";
  if (avgTemp <= 22) return "14-22C";
  if (avgTemp <= 28) return "23-28C";
  return "29C+";
}

export async function getStatsPageData(appUserId: number): Promise<StatsPageData> {
  const admin = createServiceRoleSupabaseClient();
  const today = new Date();
  const currentYear = today.getFullYear();
  const now = Date.now();
  cleanupStatsCache(now);

  const cached = statsPageCache.get(appUserId);
  if (cached && cached.expiresAt > now) {
    return cloneStatsPageData(cached.data);
  }

  const yearStart = `${currentYear}-01-01`;
  const nextYearStart = `${currentYear + 1}-01-01`;
  const cutoffDate = new Date(today);
  cutoffDate.setDate(cutoffDate.getDate() - 30);
  const cutoffIso = cutoffDate.toISOString().slice(0, 10);

  const [{ data: itemRows, error: itemError }, { data: outfitRowsRaw, error: outfitError }] =
    await Promise.all([
      admin.from("item").select("id,name,category,image_path").eq("user_id", appUserId),
      admin
        .from("outfit")
        .select("id,date,t_min,t_max,humidity,rain")
        .eq("user_id", appUserId)
        .order("date", { ascending: false }),
    ]);

  if (itemError) {
    throw new Error(`Stats item query failed: ${itemError.message}`);
  }
  if (outfitError) {
    throw new Error(`Stats outfit query failed: ${outfitError.message}`);
  }

  const itemRowsSafe = (itemRows || []).map((row) => ({
    id: toInt(row.id) ?? 0,
    name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : "Item",
    category: typeof row.category === "string" && row.category.trim() ? row.category.trim() : null,
    image_path: typeof row.image_path === "string" && row.image_path.trim() ? row.image_path.trim() : null,
  }));

  const outfitRows: OutfitRow[] = (outfitRowsRaw || [])
    .map((row) => ({
      id: toInt(row.id) ?? 0,
      date: toDateOnly(row.date) || "",
      t_min: toNumber(row.t_min),
      t_max: toNumber(row.t_max),
      humidity: toInt(row.humidity),
      rain: toBoolean(row.rain),
    }))
    .filter((row) => row.id > 0 && row.date);

  const totalItems = itemRowsSafe.length;
  const totalOutfits = outfitRows.length;
  const outfitIds = outfitRows.map((row) => row.id);
  const photos = await fetchPhotosByOutfitIds(outfitIds);
  const totalPhotos = photos.length;

  const categoryCounts: Record<string, number> = {};
  const itemById: Record<number, (typeof itemRowsSafe)[number]> = {};
  itemRowsSafe.forEach((item) => {
    if (item.id <= 0) return;
    itemById[item.id] = item;
    const key = normalizeCategory(item.category);
    categoryCounts[key] = (categoryCounts[key] ?? 0) + 1;
  });
  const categorySorted = Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  const monthCounts: Record<number, number> = {};
  for (let month = 1; month <= 12; month += 1) {
    monthCounts[month] = 0;
  }
  outfitRows
    .filter((row) => row.date >= yearStart && row.date < nextYearStart)
    .forEach((row) => {
      const month = Number(row.date.slice(5, 7));
      if (month >= 1 && month <= 12) {
        monthCounts[month] = (monthCounts[month] ?? 0) + 1;
      }
    });
  const monthPairs = MONTH_LABELS.map((label, index) => ({
    label,
    count: monthCounts[index + 1] ?? 0,
  }));
  const maxMonthCount = Math.max(0, ...monthPairs.map((pair) => pair.count));

  let weatherTotal = 0;
  let rainCount = 0;
  let clearCount = 0;
  const tempBucketCounts: Record<TempBucketKey, number> = {
    "0-4C": 0,
    "5-13C": 0,
    "14-22C": 0,
    "23-28C": 0,
    "29C+": 0,
  };

  outfitRows.forEach((row) => {
    if (row.t_min == null || row.t_max == null) return;
    const humidity = row.humidity ?? null;
    if (row.t_min === 0 && row.t_max === 0 && (humidity == null || humidity === 0)) return;

    weatherTotal += 1;
    if (row.rain) rainCount += 1;
    else clearCount += 1;

    const avgTemp = (row.t_min + row.t_max) / 2;
    const key = bucketKey(avgTemp);
    tempBucketCounts[key] += 1;
  });

  const rainRatio = weatherTotal > 0 ? Math.round((rainCount / weatherTotal) * 100) : 0;
  const tempBuckets = TEMP_BUCKET_ORDER.map((label) => ({ label, count: tempBucketCounts[label] }));
  const maxTempCount = Math.max(0, ...tempBuckets.map((bucket) => bucket.count));

  const allowedItemIds = new Set(itemRowsSafe.map((row) => row.id).filter((id) => id > 0));
  const recentOutfitIds = outfitRows
    .filter((row) => row.date >= cutoffIso)
    .map((row) => row.id);
  const recentOutfitIdSet = new Set(recentOutfitIds);
  const recentPhotoIds = photos
    .filter((photo) => recentOutfitIdSet.has(photo.outfitId))
    .map((photo) => photo.id);
  const wearCounts = await fetchRecentWearCounts(recentOutfitIds, recentPhotoIds, allowedItemIds);
  const topItems = Object.entries(wearCounts)
    .map(([idText, count]) => ({
      id: Number(idText),
      count,
    }))
    .filter((row) => row.count > 0 && Number.isInteger(row.id) && row.id > 0)
    .sort((a, b) => b.count - a.count || a.id - b.id)
    .slice(0, 5)
    .map((row) => {
      const item = itemById[row.id];
      return {
        id: row.id,
        name: item?.name || "Item",
        category: item?.category || null,
        image_path: item?.image_path || null,
        count: row.count,
      };
    });

  const efficiencyRate = totalItems > 0 ? Math.min(100, Math.round((totalOutfits / totalItems) * 100)) : 0;
  const curationPercent = totalItems > 0 ? Math.min(100, Math.round(60 + efficiencyRate * 0.4)) : 0;
  const topCategory = categorySorted[0]?.category || "Unknown";

  const result: StatsPageData = {
    topItems,
    monthPairs,
    tempBuckets,
    categorySorted,
    totalItems,
    totalOutfits,
    totalPhotos,
    maxMonthCount,
    weatherTotal,
    rainCount,
    clearCount,
    rainRatio,
    maxTempCount,
    efficiencyRate,
    curationPercent,
    topCategory,
    currentYear,
  };

  statsPageCache.set(appUserId, {
    data: result,
    expiresAt: now + STATS_CACHE_TTL_MS,
  });

  return cloneStatsPageData(result);
}
