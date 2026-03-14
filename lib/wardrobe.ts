import { getSupabaseBucket, getSupabaseUrl } from "@/lib/env";

const categoryMap: Record<string, string[]> = {
  Top: ["Top", "Tops"],
  Bottom: ["Bottom", "Bottoms"],
  Outerwear: ["Outerwear", "Outer"],
  Footwear: ["Footwear", "Shoes"],
  Accessories: ["Accessories", "Accessory", "ACC"],
};

export type ProductSearchRow = {
  brand?: string | null;
  name?: string | null;
  category?: string | null;
  size_table?: unknown;
  image_path?: string | null;
};

export function toText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

export function resolveCategoryFilter(category: string): string[] | null {
  const normalized = category.trim();
  if (!normalized) return null;
  return categoryMap[normalized] ?? [normalized];
}

export function normalizePublicImagePath(path: string, bucketName?: string): string {
  const raw = toText(path);
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

  const supabaseUrl = getSupabaseUrl().replace(/\/+$/, "");
  const bucket = toText(bucketName) || getSupabaseBucket();
  if (raw.startsWith("/storage/v1/object/public/")) {
    return `${supabaseUrl}${raw}`;
  }
  if (raw.startsWith("storage/v1/object/public/")) {
    return `${supabaseUrl}/${raw}`;
  }
  if (raw.startsWith(`${bucket}/`)) {
    return `${supabaseUrl}/storage/v1/object/public/${raw}`;
  }
  if (raw.startsWith("uploads/") || raw.startsWith("product-assets/")) {
    return `${supabaseUrl}/storage/v1/object/public/${raw}`;
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${raw}`;
}

export function normalizeSizeTable(value: unknown): unknown {
  if (value == null) return "";
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === "object" && parsed !== null) return parsed;
    } catch {
      // Keep string fallback.
    }
    return raw;
  }
  return value;
}

export function normalizeProductSearchRows(rows: ProductSearchRow[]) {
  return rows.map((row) => ({
    brand: toText(row.brand),
    name: toText(row.name),
    category: toText(row.category),
    size_table: normalizeSizeTable(row.size_table),
    image_path: normalizePublicImagePath(toText(row.image_path), "product-assets"),
  }));
}

export function makeDisplayName(brand: string, product: string): string {
  const value = `${brand.trim()} ${product.trim()}`.trim();
  return value || "Untitled";
}

export function makeDisplayNameFromFields(brand: unknown, productName: unknown): string {
  return makeDisplayName(toText(brand), toText(productName));
}

export function coerceSizeDetail(value: string): Record<string, unknown> | null {
  const raw = value.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

export function pickSizeValue(
  explicitSize: string,
  sizeDetail: Record<string, unknown> | null,
): string | null {
  const size = explicitSize.trim();
  if (size) return size;

  if (!sizeDetail) return null;
  const values = sizeDetail.values;
  if (Array.isArray(values) && values.length > 0) {
    const first = toText(values[0]);
    return first || null;
  }
  return null;
}

export function extractStorageObjectPath(publicUrlOrPath: string, bucketName?: string): string | null {
  const raw = toText(publicUrlOrPath);
  if (!raw) return null;

  const bucket = toText(bucketName) || getSupabaseBucket();
  const supabaseUrl = getSupabaseUrl().replace(/\/+$/, "");

  const absolutePrefix = `${supabaseUrl}/storage/v1/object/public/${bucket}/`;
  if (raw.startsWith(absolutePrefix)) {
    return raw.slice(absolutePrefix.length);
  }

  const relativePrefix = `/storage/v1/object/public/${bucket}/`;
  if (raw.startsWith(relativePrefix)) {
    return raw.slice(relativePrefix.length);
  }

  if (raw.startsWith(`${bucket}/`)) {
    return raw.slice(bucket.length + 1);
  }

  return null;
}
