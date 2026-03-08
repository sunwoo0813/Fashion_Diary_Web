import { findRegionCoordinate } from "@/lib/korea-region-coordinates";

type CacheRecord<T> = {
  expiresAt: number;
  value: T;
};

export type ResolvedRegionCoordinate = {
  lat: number;
  lon: number;
  displayName: string;
};

const GEOCODER_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const RESOLVE_TTL_MS = 24 * 60 * 60 * 1000;
const ERR_TTL_MS = 5 * 60 * 1000;
const GEOCODER_COOLDOWN_MS = 1200;

const resolveCache = new Map<string, CacheRecord<ResolvedRegionCoordinate | null>>();
let lastGeocodeAt = 0;

const STATIC_REGION_COORDINATES: Record<string, ResolvedRegionCoordinate> = {
  "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uAC15\uB0A8\uAD6C": {
    lat: 37.517305,
    lon: 127.047502,
    displayName: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uAC15\uB0A8\uAD6C",
  },
  "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uC1A1\uD30C\uAD6C": {
    lat: 37.514543,
    lon: 127.106597,
    displayName: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uC1A1\uD30C\uAD6C",
  },
  "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uB9C8\uD3EC\uAD6C": {
    lat: 37.566324,
    lon: 126.901491,
    displayName: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uB9C8\uD3EC\uAD6C",
  },
  "\uBD80\uC0B0\uAD11\uC5ED\uC2DC \uD574\uC6B4\uB300\uAD6C": {
    lat: 35.163177,
    lon: 129.163634,
    displayName: "\uBD80\uC0B0\uAD11\uC5ED\uC2DC \uD574\uC6B4\uB300\uAD6C",
  },
  "\uB300\uAD6C\uAD11\uC5ED\uC2DC \uC218\uC131\uAD6C": {
    lat: 35.858165,
    lon: 128.630625,
    displayName: "\uB300\uAD6C\uAD11\uC5ED\uC2DC \uC218\uC131\uAD6C",
  },
  "\uACBD\uAE30\uB3C4 \uC131\uB0A8\uC2DC": {
    lat: 37.420026,
    lon: 127.126536,
    displayName: "\uACBD\uAE30\uB3C4 \uC131\uB0A8\uC2DC",
  },
  "\uC81C\uC8FC\uD2B9\uBCC4\uC790\uCE58\uB3C4 \uC81C\uC8FC\uC2DC": {
    lat: 33.499621,
    lon: 126.531188,
    displayName: "\uC81C\uC8FC\uD2B9\uBCC4\uC790\uCE58\uB3C4 \uC81C\uC8FC\uC2DC",
  },
};

const SIDO_FALLBACK_COORDINATES: Record<string, ResolvedRegionCoordinate> = {
  "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC": {
    lat: 37.5665,
    lon: 126.978,
    displayName: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC",
  },
  "\uC11C\uC6B8\uC2DC": {
    lat: 37.5665,
    lon: 126.978,
    displayName: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC",
  },
  "\uBD80\uC0B0\uAD11\uC5ED\uC2DC": {
    lat: 35.1796,
    lon: 129.0756,
    displayName: "\uBD80\uC0B0\uAD11\uC5ED\uC2DC",
  },
  "\uBD80\uC0B0\uC2DC": {
    lat: 35.1796,
    lon: 129.0756,
    displayName: "\uBD80\uC0B0\uAD11\uC5ED\uC2DC",
  },
  "\uB300\uAD6C\uAD11\uC5ED\uC2DC": {
    lat: 35.8714,
    lon: 128.6014,
    displayName: "\uB300\uAD6C\uAD11\uC5ED\uC2DC",
  },
  "\uB300\uAD6C\uC2DC": {
    lat: 35.8714,
    lon: 128.6014,
    displayName: "\uB300\uAD6C\uAD11\uC5ED\uC2DC",
  },
  "\uC778\uCC9C\uAD11\uC5ED\uC2DC": {
    lat: 37.4563,
    lon: 126.7052,
    displayName: "\uC778\uCC9C\uAD11\uC5ED\uC2DC",
  },
  "\uC778\uCC9C\uC2DC": {
    lat: 37.4563,
    lon: 126.7052,
    displayName: "\uC778\uCC9C\uAD11\uC5ED\uC2DC",
  },
  "\uAD11\uC8FC\uAD11\uC5ED\uC2DC": {
    lat: 35.1595,
    lon: 126.8526,
    displayName: "\uAD11\uC8FC\uAD11\uC5ED\uC2DC",
  },
  "\uAD11\uC8FC\uC2DC": {
    lat: 35.1595,
    lon: 126.8526,
    displayName: "\uAD11\uC8FC\uAD11\uC5ED\uC2DC",
  },
  "\uB300\uC804\uAD11\uC5ED\uC2DC": {
    lat: 36.3504,
    lon: 127.3845,
    displayName: "\uB300\uC804\uAD11\uC5ED\uC2DC",
  },
  "\uB300\uC804\uC2DC": {
    lat: 36.3504,
    lon: 127.3845,
    displayName: "\uB300\uC804\uAD11\uC5ED\uC2DC",
  },
  "\uC6B8\uC0B0\uAD11\uC5ED\uC2DC": {
    lat: 35.5384,
    lon: 129.3114,
    displayName: "\uC6B8\uC0B0\uAD11\uC5ED\uC2DC",
  },
  "\uC6B8\uC0B0\uC2DC": {
    lat: 35.5384,
    lon: 129.3114,
    displayName: "\uC6B8\uC0B0\uAD11\uC5ED\uC2DC",
  },
  "\uC138\uC885\uD2B9\uBCC4\uC790\uCE58\uC2DC": {
    lat: 36.48,
    lon: 127.289,
    displayName: "\uC138\uC885\uD2B9\uBCC4\uC790\uCE58\uC2DC",
  },
  "\uC138\uC885\uC2DC": {
    lat: 36.48,
    lon: 127.289,
    displayName: "\uC138\uC885\uD2B9\uBCC4\uC790\uCE58\uC2DC",
  },
  "\uACBD\uAE30\uB3C4": {
    lat: 37.2636,
    lon: 127.0286,
    displayName: "\uACBD\uAE30\uB3C4",
  },
  "\uAC15\uC6D0\uD2B9\uBCC4\uC790\uCE58\uB3C4": {
    lat: 37.8854,
    lon: 127.7298,
    displayName: "\uAC15\uC6D0\uD2B9\uBCC4\uC790\uCE58\uB3C4",
  },
  "\uAC15\uC6D0\uB3C4": {
    lat: 37.8854,
    lon: 127.7298,
    displayName: "\uAC15\uC6D0\uD2B9\uBCC4\uC790\uCE58\uB3C4",
  },
  "\uCDA9\uCCAD\uBD81\uB3C4": {
    lat: 36.6357,
    lon: 127.4917,
    displayName: "\uCDA9\uCCAD\uBD81\uB3C4",
  },
  "\uCDA9\uCCAD\uB0A8\uB3C4": {
    lat: 36.6588,
    lon: 126.6728,
    displayName: "\uCDA9\uCCAD\uB0A8\uB3C4",
  },
  "\uC804\uBD81\uD2B9\uBCC4\uC790\uCE58\uB3C4": {
    lat: 35.8242,
    lon: 127.148,
    displayName: "\uC804\uBD81\uD2B9\uBCC4\uC790\uCE58\uB3C4",
  },
  "\uC804\uB77C\uBD81\uB3C4": {
    lat: 35.8242,
    lon: 127.148,
    displayName: "\uC804\uBD81\uD2B9\uBCC4\uC790\uCE58\uB3C4",
  },
  "\uC804\uB0A8": {
    lat: 34.8161,
    lon: 126.4629,
    displayName: "\uC804\uB77C\uB0A8\uB3C4",
  },
  "\uC804\uB77C\uB0A8\uB3C4": {
    lat: 34.8161,
    lon: 126.4629,
    displayName: "\uC804\uB77C\uB0A8\uB3C4",
  },
  "\uACBD\uC0C1\uBD81\uB3C4": {
    lat: 36.576,
    lon: 128.5056,
    displayName: "\uACBD\uC0C1\uBD81\uB3C4",
  },
  "\uACBD\uBD81": {
    lat: 36.576,
    lon: 128.5056,
    displayName: "\uACBD\uC0C1\uBD81\uB3C4",
  },
  "\uACBD\uC0C1\uB0A8\uB3C4": {
    lat: 35.2279,
    lon: 128.6811,
    displayName: "\uACBD\uC0C1\uB0A8\uB3C4",
  },
  "\uACBD\uB0A8": {
    lat: 35.2279,
    lon: 128.6811,
    displayName: "\uACBD\uC0C1\uB0A8\uB3C4",
  },
  "\uC81C\uC8FC\uD2B9\uBCC4\uC790\uCE58\uB3C4": {
    lat: 33.4996,
    lon: 126.5312,
    displayName: "\uC81C\uC8FC\uD2B9\uBCC4\uC790\uCE58\uB3C4",
  },
  "\uC81C\uC8FC\uB3C4": {
    lat: 33.4996,
    lon: 126.5312,
    displayName: "\uC81C\uC8FC\uD2B9\uBCC4\uC790\uCE58\uB3C4",
  },
};

function cacheGet<T>(cache: Map<string, CacheRecord<T>>, key: string): T | undefined {
  const record = cache.get(key);
  if (!record) return undefined;
  if (record.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return record.value;
}

function cacheSet<T>(cache: Map<string, CacheRecord<T>>, key: string, value: T, ttlMs: number) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function toFloat(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
}

function unique(values: string[]): string[] {
  const set = new Set<string>();
  values.forEach((value) => {
    const trimmed = value.trim();
    if (trimmed) set.add(trimmed);
  });
  return Array.from(set);
}

function simplifyRegionName(value: string): string {
  return value
    .trim()
    .replace(/\uD2B9\uBCC4\uC790\uCE58\uB3C4/g, "\uB3C4")
    .replace(/\uD2B9\uBCC4\uC790\uCE58\uC2DC/g, "\uC2DC")
    .replace(/\uD2B9\uBCC4\uC2DC/g, "\uC2DC")
    .replace(/\uAD11\uC5ED\uC2DC/g, "\uC2DC");
}

function tokenFallbacks(regionLabel: string): string[] {
  const normalized = regionLabel.replace(/,/g, " ").split(/\s+/).filter(Boolean);
  if (normalized.length === 0) return [];

  const last = normalized[normalized.length - 1];
  const first = normalized[0];

  return unique([
    normalized.join(" "),
    normalized.map(simplifyRegionName).join(" "),
    `${simplifyRegionName(first)} ${last}`,
    last,
    last.replace(/\uC2DC$/, ""),
    last.replace(/\uAD70$/, ""),
    last.replace(/\uAD6C$/, ""),
  ]);
}

function candidateQueries(regionLabel: string): string[] {
  const raw = regionLabel.trim();
  if (!raw) return [];

  const simplified = simplifyRegionName(raw);
  const aliases = [raw, simplified, ...tokenFallbacks(raw)];

  return unique(aliases);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForGeocoderWindow() {
  const elapsed = Date.now() - lastGeocodeAt;
  if (elapsed < GEOCODER_COOLDOWN_MS) {
    await sleep(GEOCODER_COOLDOWN_MS - elapsed);
  }
  lastGeocodeAt = Date.now();
}

async function geocodeRegion(query: string): Promise<ResolvedRegionCoordinate | null> {
  const variants = unique([
    query,
    `${query}, South Korea`,
    `${query}, Korea`,
  ]);

  for (const value of variants) {
    const url = new URL(GEOCODER_ENDPOINT);
    url.searchParams.set("q", value);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("countrycodes", "kr");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "1");

    try {
      await waitForGeocoderWindow();
      const response = await fetch(url.toString(), {
        cache: "no-store",
        headers: {
          "User-Agent": "fashion-diary-weather/1.0 (+https://example.local)",
          "Accept-Language": "ko,en;q=0.8",
        },
      });
      if (response.status === 429) {
        return null;
      }
      if (!response.ok) continue;

      const payload = (await response.json()) as Array<Record<string, unknown>>;
      if (!Array.isArray(payload) || payload.length === 0) continue;

      const first = payload[0];
      const lat = toFloat(first.lat);
      const lon = toFloat(first.lon);
      if (lat == null || lon == null) continue;

      const displayNameRaw =
        (typeof first.display_name === "string" && first.display_name) || value;
      const displayName = displayNameRaw.split(",")[0].trim() || value;
      return { lat, lon, displayName };
    } catch {
      continue;
    }
  }

  return null;
}

export async function resolveRegionCoordinate(
  regionLabel: string,
): Promise<ResolvedRegionCoordinate | null> {
  const key = regionLabel.trim();
  if (!key) return null;

  const cached = cacheGet(resolveCache, key);
  if (cached !== undefined) return cached;

  const staticMatch = STATIC_REGION_COORDINATES[key];
  if (staticMatch) {
    cacheSet(resolveCache, key, staticMatch, RESOLVE_TTL_MS);
    return staticMatch;
  }

  const tokens = key.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const tableMatch = findRegionCoordinate(tokens[0], tokens.slice(1).join(" "));
    if (tableMatch) {
      cacheSet(resolveCache, key, tableMatch, RESOLVE_TTL_MS);
      return tableMatch;
    }
  }

  const primaryRegion = key.split(/\s+/)[0]?.trim();
  const simplifiedPrimaryRegion = primaryRegion ? simplifyRegionName(primaryRegion) : "";
  const sidoFallback =
    (primaryRegion && SIDO_FALLBACK_COORDINATES[primaryRegion]) ||
    (simplifiedPrimaryRegion && SIDO_FALLBACK_COORDINATES[simplifiedPrimaryRegion]) ||
    null;

  if (sidoFallback) {
    cacheSet(resolveCache, key, sidoFallback, RESOLVE_TTL_MS);
    return sidoFallback;
  }

  const queries = candidateQueries(key);
  for (const query of queries) {
    const result = await geocodeRegion(query);
    if (result) {
      cacheSet(resolveCache, key, result, RESOLVE_TTL_MS);
      return result;
    }
  }

  cacheSet(resolveCache, key, null, ERR_TTL_MS);
  return null;
}
