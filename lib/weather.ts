import { getWeatherApiKey, hasWeatherApiKey } from "@/lib/env";

type CacheRecord<T> = {
  expiresAt: number;
  value: T;
};

type GridCoord = {
  nx: number;
  ny: number;
  displayName: string;
};

export type WeatherSummary = {
  city: string;
  t_min: number;
  t_max: number;
  humidity: number;
  rain: boolean;
  desc: string;
  icon: string;
};

const GEO_TTL_MS = 24 * 60 * 60 * 1000;
const GEO_ERR_TTL_MS = 5 * 60 * 1000;
const WEATHER_TTL_MS = 10 * 60 * 1000;
const WEATHER_ERR_TTL_MS = 60 * 1000;

const KMA_ENDPOINT =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
const GEOCODER_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];

const CITY_GRID: Record<string, [number, number, string]> = {
  seoul: [60, 127, "Seoul"],
  busan: [98, 76, "Busan"],
  incheon: [55, 124, "Incheon"],
  daegu: [89, 90, "Daegu"],
  gwangju: [58, 74, "Gwangju"],
  daejeon: [67, 100, "Daejeon"],
  ulsan: [102, 84, "Ulsan"],
  sejong: [66, 103, "Sejong"],
  suwon: [60, 121, "Suwon"],
  changwon: [91, 77, "Changwon"],
  goyang: [57, 128, "Goyang"],
  yongin: [64, 120, "Yongin"],
  cheongju: [69, 106, "Cheongju"],
  jeonju: [63, 89, "Jeonju"],
  pohang: [102, 94, "Pohang"],
  cheonan: [63, 110, "Cheonan"],
  jeju: [52, 38, "Jeju"],
};

const RE = 6371.00877;
const GRID = 5.0;
const SLAT1 = 30.0;
const SLAT2 = 60.0;
const OLON = 126.0;
const OLAT = 38.0;
const XO = 43;
const YO = 136;

const geoCache = new Map<string, CacheRecord<GridCoord | null>>();
const weatherCache = new Map<string, CacheRecord<WeatherSummary | null>>();

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
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function cityKey(value: string): string {
  return value.trim().toLowerCase();
}

function toFloat(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
}

function toInt(value: unknown): number | null {
  const num = toFloat(value);
  if (num == null) return null;
  return Math.trunc(num);
}

function weatherDesc(pty: number, sky: number): string {
  if (pty === 1) return "Rain";
  if (pty === 2) return "Rain/Snow";
  if (pty === 3) return "Snow";
  if (pty === 4) return "Shower";
  if (sky === 1) return "Sunny";
  if (sky === 3) return "Mostly Cloudy";
  if (sky === 4) return "Cloudy";
  return "Clear";
}

function latLonToGrid(lat: number, lon: number): { nx: number; ny: number } {
  const degToRad = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * degToRad;
  const slat2 = SLAT2 * degToRad;
  const olon = OLON * degToRad;
  const olat = OLAT * degToRad;

  let sn =
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
    Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (sf ** sn) * Math.cos(slat1) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / (ro ** sn);

  let ra = Math.tan(Math.PI * 0.25 + (lat * degToRad) * 0.5);
  ra = re * sf / (ra ** sn);
  let theta = lon * degToRad - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx, ny };
}

function latestBaseDate(now = new Date()): { baseDate: string; baseTime: string } {
  const reference = new Date(now.getTime() - 15 * 60 * 1000);
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const day = reference.getDate();
  const minute = reference.getMinutes();
  const currentHour = reference.getHours();

  for (let i = BASE_HOURS.length - 1; i >= 0; i -= 1) {
    const hour = BASE_HOURS[i];
    if (currentHour > hour || (currentHour === hour && minute >= 0)) {
      const date = new Date(year, month, day, hour, 0, 0, 0);
      const baseDate = date.toISOString().slice(0, 10).replace(/-/g, "");
      const baseTime = `${String(hour).padStart(2, "0")}00`;
      return { baseDate, baseTime };
    }
  }

  const prev = new Date(year, month, day - 1, 23, 0, 0, 0);
  return {
    baseDate: prev.toISOString().slice(0, 10).replace(/-/g, ""),
    baseTime: "2300",
  };
}

function unique(values: string[]): string[] {
  const set = new Set<string>();
  values.forEach((value) => {
    const v = value.trim();
    if (v) set.add(v);
  });
  return Array.from(set);
}

function candidateQueries(cityName: string): string[] {
  const raw = cityName.trim();
  if (!raw) return [];
  const normalized = raw.replace(/,/g, " ").split(/\s+/).filter(Boolean).join(" ");
  const tokens = normalized.split(" ").filter(Boolean);

  const list: string[] = [raw, normalized];
  list.push(...tokens);
  if (tokens.length > 0) {
    list.push(tokens[tokens.length - 1]);
    list.push(tokens[0]);
  }
  return unique(list);
}

async function geocodeQuery(query: string): Promise<GridCoord | null> {
  const variants = [query];
  const lowered = query.toLowerCase();
  if (!lowered.includes("korea")) {
    variants.push(`${query}, South Korea`);
    variants.push(`${query}, Korea`);
  }

  for (const value of variants) {
    const url = new URL(GEOCODER_ENDPOINT);
    url.searchParams.set("q", value);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("countrycodes", "kr");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "1");

    try {
      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "fashion-diary-weather/1.0 (+https://example.local)",
          "Accept-Language": "ko,en;q=0.8",
        },
        cache: "no-store",
      });
      if (!response.ok) continue;
      const data = (await response.json()) as Array<Record<string, unknown>>;
      if (!Array.isArray(data) || data.length === 0) continue;
      const first = data[0];
      const lat = toFloat(first.lat);
      const lon = toFloat(first.lon);
      if (lat == null || lon == null) continue;
      const { nx, ny } = latLonToGrid(lat, lon);

      const displayNameRaw =
        (typeof first.display_name === "string" && first.display_name) || value;
      const displayName = displayNameRaw.split(",")[0].trim() || value;
      return { nx, ny, displayName };
    } catch {
      continue;
    }
  }
  return null;
}

async function getCoordinates(cityName: string): Promise<GridCoord | null> {
  const key = cityKey(cityName);
  const cached = cacheGet(geoCache, key);
  if (cached !== undefined) return cached;

  const queries = candidateQueries(cityName);

  for (const query of queries) {
    const mapped = CITY_GRID[query.toLowerCase()];
    if (mapped) {
      const coord: GridCoord = { nx: mapped[0], ny: mapped[1], displayName: mapped[2] };
      cacheSet(geoCache, key, coord, GEO_TTL_MS);
      return coord;
    }
  }

  for (const query of queries) {
    const coord = await geocodeQuery(query);
    if (coord) {
      cacheSet(geoCache, key, coord, GEO_TTL_MS);
      return coord;
    }
  }

  cacheSet(geoCache, key, null, GEO_ERR_TTL_MS);
  return null;
}

export async function getTodayWeatherSummary(cityName: string): Promise<WeatherSummary | null> {
  if (!hasWeatherApiKey()) return null;
  const key = `${new Date().toISOString().slice(0, 10)}::${cityKey(cityName || "Seoul")}`;
  const cached = cacheGet(weatherCache, key);
  if (cached !== undefined) return cached;

  const coord = await getCoordinates(cityName || "Seoul");
  if (!coord) {
    cacheSet(weatherCache, key, null, WEATHER_ERR_TTL_MS);
    return null;
  }

  const { baseDate, baseTime } = latestBaseDate(new Date());
  const url = new URL(KMA_ENDPOINT);
  url.searchParams.set("serviceKey", getWeatherApiKey());
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "1200");
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("base_date", baseDate);
  url.searchParams.set("base_time", baseTime);
  url.searchParams.set("nx", String(coord.nx));
  url.searchParams.set("ny", String(coord.ny));

  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        "User-Agent": "fashion-diary-weather/1.0 (+https://example.local)",
      },
    });
    if (!response.ok) {
      cacheSet(weatherCache, key, null, WEATHER_ERR_TTL_MS);
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const body = ((data.response as Record<string, unknown>)?.body || {}) as Record<string, unknown>;
    const items = (((body.items as Record<string, unknown>)?.item as unknown[]) || []) as Array<
      Record<string, unknown>
    >;
    if (!Array.isArray(items) || items.length === 0) {
      cacheSet(weatherCache, key, null, WEATHER_ERR_TTL_MS);
      return null;
    }

    const todayKey = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const todayItems = items.filter((item) => String(item.fcstDate || "") === todayKey);
    if (todayItems.length === 0) {
      cacheSet(weatherCache, key, null, WEATHER_ERR_TTL_MS);
      return null;
    }

    const temps: number[] = [];
    const hums: number[] = [];
    const dailyMin: number[] = [];
    const dailyMax: number[] = [];
    let rainFlag = false;
    const slotMap: Record<string, Record<string, unknown>> = {};

    todayItems.forEach((item) => {
      const category = String(item.category || "");
      const fcstTime = String(item.fcstTime || "");
      const fcstValue = item.fcstValue;

      if (fcstTime) {
        if (!slotMap[fcstTime]) slotMap[fcstTime] = {};
        slotMap[fcstTime][category] = fcstValue;
      }

      if (category === "TMP") {
        const value = toFloat(fcstValue);
        if (value != null) temps.push(value);
      } else if (category === "REH") {
        const value = toInt(fcstValue);
        if (value != null) hums.push(value);
      } else if (category === "TMN") {
        const value = toFloat(fcstValue);
        if (value != null) dailyMin.push(value);
      } else if (category === "TMX") {
        const value = toFloat(fcstValue);
        if (value != null) dailyMax.push(value);
      } else if (category === "PTY") {
        const value = toInt(fcstValue);
        if ((value ?? 0) > 0) rainFlag = true;
      }
    });

    if (temps.length === 0 && dailyMin.length === 0 && dailyMax.length === 0) {
      cacheSet(weatherCache, key, null, WEATHER_ERR_TTL_MS);
      return null;
    }

    const minRaw = dailyMin.length > 0 ? Math.min(...dailyMin) : Math.min(...temps);
    const maxRaw = dailyMax.length > 0 ? Math.max(...dailyMax) : Math.max(...temps);
    const tMin = Math.round(minRaw * 10) / 10;
    const tMax = Math.round(maxRaw * 10) / 10;
    const humidity = hums.length > 0 ? Math.round(hums.reduce((a, b) => a + b, 0) / hums.length) : 0;

    const nowHHMM = `${String(new Date().getHours()).padStart(2, "0")}${String(
      new Date().getMinutes(),
    ).padStart(2, "0")}`;
    const times = Object.keys(slotMap).filter((time) => /^\d{4}$/.test(time)).sort();
    let targetTime = times.find((time) => time >= nowHHMM) || times[0] || "";
    if (!targetTime) targetTime = "0000";
    const target = slotMap[targetTime] || {};
    const ptyNow = toInt(target.PTY) ?? 0;
    const skyNow = toInt(target.SKY) ?? 1;

    const result: WeatherSummary = {
      city: coord.displayName,
      t_min: Math.min(tMin, tMax),
      t_max: Math.max(tMin, tMax),
      humidity,
      rain: rainFlag,
      desc: weatherDesc(ptyNow, skyNow),
      icon: "",
    };
    cacheSet(weatherCache, key, result, WEATHER_TTL_MS);
    return result;
  } catch {
    cacheSet(weatherCache, key, null, WEATHER_ERR_TTL_MS);
    return null;
  }
}
