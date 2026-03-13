import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { makeDisplayNameFromFields, normalizePublicImagePath } from "@/lib/wardrobe";

import type { WardrobeItem } from "./wardrobe";

export type DiaryPhoto = {
  id: number;
  outfit_id: number;
  photo_path: string;
  created_at: string | null;
  tag_items: Array<{ id: number; name: string; category: string | null }>;
};

export type DiaryLinkedItem = {
  id: number;
  name: string;
  category: string | null;
};

export type DiaryOutfit = {
  id: number;
  user_id: number;
  date: string;
  note: string | null;
  t_min: number | null;
  t_max: number | null;
  humidity: number | null;
  rain: boolean | null;
  created_at: string | null;
  outfit_items: DiaryLinkedItem[];
  photos: DiaryPhoto[];
};

export type DiaryMonthData = {
  recordedDays: Set<number>;
  outfitCount: number;
};

export type DiaryDayData = {
  outfits: DiaryOutfit[];
  totalOutfits: number;
  totalItems: number;
};

export type DiaryFeedPost = {
  outfit_id: number;
  date: string;
  note: string | null;
  t_min: number | null;
  t_max: number | null;
  humidity: number | null;
  rain: boolean | null;
  created_at: string | null;
  outfit_items: DiaryLinkedItem[];
  photos: DiaryPhoto[];
};

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateRangeForMonth(year: number, month1to12: number) {
  const start = new Date(Date.UTC(year, month1to12 - 1, 1));
  const end = new Date(Date.UTC(year, month1to12, 1));
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

function parseDateDay(value: string): number | null {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCDate();
}

function mapOutfitRow(row: Record<string, unknown>): Omit<DiaryOutfit, "photos"> {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    date: String(row.date),
    note: typeof row.note === "string" ? row.note : null,
    t_min: typeof row.t_min === "number" ? row.t_min : row.t_min == null ? null : Number(row.t_min),
    t_max: typeof row.t_max === "number" ? row.t_max : row.t_max == null ? null : Number(row.t_max),
    humidity:
      typeof row.humidity === "number" ? row.humidity : row.humidity == null ? null : Number(row.humidity),
    rain: typeof row.rain === "boolean" ? row.rain : row.rain == null ? null : Boolean(row.rain),
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    outfit_items: [],
  };
}

async function fetchLinkedItemsByOutfitIds(appUserId: number, outfitIds: number[]) {
  const admin = createServiceRoleSupabaseClient();
  const outfitItemsByOutfitId: Record<number, DiaryLinkedItem[]> = {};
  if (outfitIds.length === 0) return outfitItemsByOutfitId;

  const { data: outfitItemRows, error: outfitItemError } = await admin
    .from("outfit_item")
    .select("outfit_id,item_id")
    .in("outfit_id", outfitIds);
  if (outfitItemError) {
    throw new Error(`Outfit item query failed: ${outfitItemError.message}`);
  }

  const itemIds = Array.from(
    new Set(
      (outfitItemRows || [])
        .map((row) => Number(row.item_id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  );

  const itemsById: Record<number, DiaryLinkedItem> = {};
  if (itemIds.length > 0) {
    const { data: itemRows, error: itemError } = await admin
      .from("item")
      .select("id,brand,product_name,category,user_id")
      .eq("user_id", appUserId)
      .in("id", itemIds);
    if (itemError) {
      throw new Error(`Outfit linked item lookup failed: ${itemError.message}`);
    }

    (itemRows || []).forEach((row) => {
      const id = Number(row.id);
      itemsById[id] = {
        id,
        name: makeDisplayNameFromFields(row.brand, row.product_name),
        category: row.category ? String(row.category) : null,
      };
    });
  }

  (outfitItemRows || []).forEach((row) => {
    const outfitId = Number(row.outfit_id);
    const itemId = Number(row.item_id);
    const item = itemsById[itemId];
    if (!item) return;
    if (!outfitItemsByOutfitId[outfitId]) outfitItemsByOutfitId[outfitId] = [];
    outfitItemsByOutfitId[outfitId].push(item);
  });

  return outfitItemsByOutfitId;
}

export async function getDiaryMonthData(
  appUserId: number,
  year: number,
  month1to12: number,
): Promise<DiaryMonthData> {
  const admin = createServiceRoleSupabaseClient();
  const { start, end } = dateRangeForMonth(year, month1to12);

  const { data, error } = await admin
    .from("outfit")
    .select("id,date")
    .eq("user_id", appUserId)
    .gte("date", start)
    .lt("date", end);
  if (error) {
    throw new Error(`Diary month query failed: ${error.message}`);
  }

  const recordedDays = new Set<number>();
  (data || []).forEach((row) => {
    const day = parseDateDay(String(row.date));
    if (day) recordedDays.add(day);
  });

  return {
    recordedDays,
    outfitCount: (data || []).length,
  };
}

export async function getUserWardrobeItems(appUserId: number): Promise<WardrobeItem[]> {
  const admin = createServiceRoleSupabaseClient();
  const { data, error } = await admin
    .from("item")
    .select("id,user_id,brand,product_name,category,size,size_detail,image_path,created_at")
    .eq("user_id", appUserId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Wardrobe item query failed: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: Number(row.id),
    user_id: Number(row.user_id),
    name: makeDisplayNameFromFields(row.brand, row.product_name),
    category: row.category ? String(row.category) : null,
    size: row.size ? String(row.size) : null,
    size_detail: row.size_detail ?? null,
    image_path: row.image_path ? normalizePublicImagePath(String(row.image_path)) : null,
    created_at: row.created_at ? String(row.created_at) : null,
  }));
}

export async function getDiaryDayData(appUserId: number, isoDate: string): Promise<DiaryDayData> {
  const admin = createServiceRoleSupabaseClient();

  const { data: outfitRows, error: outfitError } = await admin
    .from("outfit")
    .select("id,user_id,date,note,t_min,t_max,humidity,rain,created_at")
    .eq("user_id", appUserId)
    .eq("date", isoDate)
    .order("created_at", { ascending: false });
  if (outfitError) {
    throw new Error(`Diary day query failed: ${outfitError.message}`);
  }

  const totalsPromise = Promise.all([
    admin.from("outfit").select("*", { count: "exact", head: true }).eq("user_id", appUserId),
    admin.from("item").select("*", { count: "exact", head: true }).eq("user_id", appUserId),
  ]);

  const outfitsBase = (outfitRows || []).map(mapOutfitRow);
  const outfitIds = outfitsBase.map((row) => row.id);
  const linkedItemsByOutfitId = await fetchLinkedItemsByOutfitIds(appUserId, outfitIds);

  const photosByOutfitId: Record<number, DiaryPhoto[]> = {};
  const photoIdToOutfitId: Record<number, number> = {};
  if (outfitIds.length > 0) {
    const { data: photos, error: photosError } = await admin
      .from("outfit_photo")
      .select("id,outfit_id,photo_path,created_at")
      .in("outfit_id", outfitIds)
      .order("created_at", { ascending: true });
    if (photosError) {
      throw new Error(`Outfit photo query failed: ${photosError.message}`);
    }

    (photos || []).forEach((row) => {
      const photo: DiaryPhoto = {
        id: Number(row.id),
        outfit_id: Number(row.outfit_id),
        photo_path: String(row.photo_path || ""),
        created_at: row.created_at ? String(row.created_at) : null,
        tag_items: [],
      };
      if (!photosByOutfitId[photo.outfit_id]) photosByOutfitId[photo.outfit_id] = [];
      photosByOutfitId[photo.outfit_id].push(photo);
      photoIdToOutfitId[photo.id] = photo.outfit_id;
    });

    const photoIds = Object.keys(photoIdToOutfitId).map((id) => Number(id));
    if (photoIds.length > 0) {
      const { data: tagRows, error: tagError } = await admin
        .from("outfit_photo_item")
        .select("photo_id,item_id")
        .in("photo_id", photoIds);
      if (tagError) {
        throw new Error(`Outfit photo tag query failed: ${tagError.message}`);
      }

      const itemIds = Array.from(
        new Set((tagRows || []).map((row) => Number(row.item_id)).filter((id) => Number.isInteger(id) && id > 0)),
      );
      let itemsById: Record<number, { id: number; name: string; category: string | null }> = {};
      if (itemIds.length > 0) {
        const { data: itemRows, error: itemError } = await admin
          .from("item")
          .select("id,brand,product_name,category,user_id")
          .eq("user_id", appUserId)
          .in("id", itemIds);
        if (itemError) {
          throw new Error(`Outfit tag item query failed: ${itemError.message}`);
        }
        itemsById = (itemRows || []).reduce<Record<number, { id: number; name: string; category: string | null }>>(
          (acc, row) => {
            const id = Number(row.id);
            acc[id] = {
              id,
              name: makeDisplayNameFromFields(row.brand, row.product_name),
              category: row.category ? String(row.category) : null,
            };
            return acc;
          },
          {},
        );
      }

      const photoMap: Record<number, DiaryPhoto> = {};
      Object.values(photosByOutfitId).forEach((photos) => {
        photos.forEach((photo) => {
          photoMap[photo.id] = photo;
        });
      });

      (tagRows || []).forEach((row) => {
        const photoId = Number(row.photo_id);
        const itemId = Number(row.item_id);
        const photo = photoMap[photoId];
        const item = itemsById[itemId];
        if (!photo || !item) return;
        photo.tag_items.push(item);
      });
    }
  }

  const outfits: DiaryOutfit[] = outfitsBase.map((base) => ({
    ...base,
    outfit_items: linkedItemsByOutfitId[base.id] || [],
    photos: photosByOutfitId[base.id] || [],
  }));

  const [{ count: totalOutfitsCount, error: totalOutfitsError }, { count: totalItemsCount, error: totalItemsError }] =
    await totalsPromise;
  if (totalOutfitsError) throw new Error(`Total outfit count failed: ${totalOutfitsError.message}`);
  if (totalItemsError) throw new Error(`Total item count failed: ${totalItemsError.message}`);

  return {
    outfits,
    totalOutfits: totalOutfitsCount ?? 0,
    totalItems: totalItemsCount ?? 0,
  };
}

export async function getDiaryFeedData(appUserId: number, maxPosts = 120): Promise<DiaryFeedPost[]> {
  const admin = createServiceRoleSupabaseClient();
  const { data: outfitRows, error: outfitError } = await admin
    .from("outfit")
    .select("id,user_id,date,note,t_min,t_max,humidity,rain,created_at")
    .eq("user_id", appUserId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(Math.max(80, maxPosts * 2));

  if (outfitError) {
    throw new Error(`Diary feed outfit query failed: ${outfitError.message}`);
  }

  const outfits = (outfitRows || []).map(mapOutfitRow);
  const outfitIds = outfits.map((outfit) => outfit.id);
  if (outfitIds.length === 0) return [];
  const linkedItemsByOutfitId = await fetchLinkedItemsByOutfitIds(appUserId, outfitIds);

  const { data: photoRows, error: photoError } = await admin
    .from("outfit_photo")
    .select("id,outfit_id,photo_path,created_at")
    .in("outfit_id", outfitIds)
    .order("created_at", { ascending: false });
  if (photoError) {
    throw new Error(`Diary feed photo query failed: ${photoError.message}`);
  }

  const photos = (photoRows || []).map((row) => ({
    id: Number(row.id),
    outfit_id: Number(row.outfit_id),
    photo_path: String(row.photo_path || ""),
    created_at: row.created_at ? String(row.created_at) : null,
  }));
  const photosByOutfitId = photos.reduce<Record<number, DiaryPhoto[]>>((acc, photo) => {
    const entry: DiaryPhoto = {
      id: photo.id,
      outfit_id: photo.outfit_id,
      photo_path: photo.photo_path,
      created_at: photo.created_at,
      tag_items: [],
    };
    if (!acc[photo.outfit_id]) acc[photo.outfit_id] = [];
    acc[photo.outfit_id].push(entry);
    return acc;
  }, {});

  const posts: DiaryFeedPost[] = outfits
    .map((outfit) => ({
      outfit_id: outfit.id,
      date: outfit.date,
      note: outfit.note,
      t_min: outfit.t_min,
      t_max: outfit.t_max,
      humidity: outfit.humidity,
      rain: outfit.rain,
      created_at: outfit.created_at,
      outfit_items: linkedItemsByOutfitId[outfit.id] || [],
      photos: photosByOutfitId[outfit.id] || [],
    }))
    .filter((post) => post.photos.length > 0)
    .sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date);
      if (dateDiff !== 0) return dateDiff;
      return (b.created_at || "").localeCompare(a.created_at || "");
    });

  return posts.slice(0, maxPosts);
}

export async function getOutfitEditData(appUserId: number, outfitId: number) {
  const admin = createServiceRoleSupabaseClient();
  const { data: outfitRow, error: outfitError } = await admin
    .from("outfit")
    .select("id,user_id,date,note,t_min,t_max,humidity,rain,created_at")
    .eq("id", outfitId)
    .eq("user_id", appUserId)
    .maybeSingle();
  if (outfitError) {
    throw new Error(`Outfit lookup failed: ${outfitError.message}`);
  }
  if (!outfitRow) return null;

  const itemsPromise = getUserWardrobeItems(appUserId);
  const outfit: DiaryOutfit = {
    ...mapOutfitRow(outfitRow as Record<string, unknown>),
    outfit_items: [],
    photos: [],
  };
  const linkedItemsByOutfitId = await fetchLinkedItemsByOutfitIds(appUserId, [outfitId]);
  outfit.outfit_items = linkedItemsByOutfitId[outfitId] || [];

  const { data: photoRows, error: photoError } = await admin
    .from("outfit_photo")
    .select("id,outfit_id,photo_path,created_at")
    .eq("outfit_id", outfitId)
    .order("created_at", { ascending: true });
  if (photoError) {
    throw new Error(`Outfit photo lookup failed: ${photoError.message}`);
  }

  const photos: DiaryPhoto[] = (photoRows || []).map((row) => ({
    id: Number(row.id),
    outfit_id: Number(row.outfit_id),
    photo_path: String(row.photo_path || ""),
    created_at: row.created_at ? String(row.created_at) : null,
    tag_items: [],
  }));

  if (photos.length > 0) {
    const photoIds = photos.map((photo) => photo.id);
    const { data: tagRows, error: tagError } = await admin
      .from("outfit_photo_item")
      .select("photo_id,item_id")
      .in("photo_id", photoIds);
    if (tagError) {
      throw new Error(`Outfit photo tag query failed: ${tagError.message}`);
    }

    const itemIds = Array.from(
      new Set((tagRows || []).map((row) => Number(row.item_id)).filter((id) => Number.isInteger(id) && id > 0)),
    );
    let itemsById: Record<number, { id: number; name: string; category: string | null }> = {};
    if (itemIds.length > 0) {
      const { data: tagItemRows, error: tagItemError } = await admin
        .from("item")
        .select("id,brand,product_name,category,user_id")
        .eq("user_id", appUserId)
        .in("id", itemIds);
      if (tagItemError) {
        throw new Error(`Outfit tag item query failed: ${tagItemError.message}`);
      }

      itemsById = (tagItemRows || []).reduce<Record<number, { id: number; name: string; category: string | null }>>(
        (acc, row) => {
          const id = Number(row.id);
          acc[id] = {
            id,
            name: makeDisplayNameFromFields(row.brand, row.product_name),
            category: row.category ? String(row.category) : null,
          };
          return acc;
        },
        {},
      );
    }

    const photoMap = photos.reduce<Record<number, DiaryPhoto>>((acc, photo) => {
      acc[photo.id] = photo;
      return acc;
    }, {});

    (tagRows || []).forEach((row) => {
      const photoId = Number(row.photo_id);
      const itemId = Number(row.item_id);
      const photo = photoMap[photoId];
      const item = itemsById[itemId];
      if (!photo || !item) return;
      photo.tag_items.push(item);
    });
  }

  outfit.photos = photos;

  const items = await itemsPromise;
  return { outfit, items };
}
