import { getWeatherApiKey, hasWeatherApiKey } from "@/lib/env";
import { resolveRegionCoordinate } from "@/lib/region-coordinates";

type CacheRecord<T> = {
  expiresAt: number;
  value: T;
};

type GridCoord = {
  nx: number;
  ny: number;
  displayName: string;
};

type WeatherLocationInput = {
  lat: number;
  lon: number;
  displayName?: string;
};

type ForecastItem = Record<string, unknown>;

export type WeatherSummary = {
  city: string;
  current_temp: number;
  feels_like: number;
  t_min: number;
  t_max: number;
  humidity: number;
  rain: boolean;
  desc: string;
  icon: string;
  precipitation_type: string;
  precipitation_probability: number;
  precipitation_amount: string;
};

const GEO_TTL_MS = 24 * 60 * 60 * 1000;
const GEO_ERR_TTL_MS = 5 * 60 * 1000;
const WEATHER_TTL_MS = 10 * 60 * 1000;
const WEATHER_ERR_TTL_MS = 60 * 1000;

const SHORT_FORECAST_ENDPOINT =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
const ULTRA_FORECAST_ENDPOINT =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst";
const ULTRA_NOWCAST_ENDPOINT =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst";
const GEOCODER_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const SHORT_BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];

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

function roundToOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function nowDateKey(now = new Date()): string {
  return toYYYYMMDD(now);
}

function toYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function toHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}`;
}

function currentForecastTime(now = new Date()): string {
  return toHHMM(now);
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

function precipitationTypeLabel(pty: number): string {
  if (pty === 1) return "Rain";
  if (pty === 2) return "Rain / Snow";
  if (pty === 3) return "Snow";
  if (pty === 4) return "Shower";
  return "None";
}

function precipitationAmountLabel(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }

  const numeric = toFloat(value);
  if (numeric == null) return "-";
  if (numeric <= 0) return "0mm";
  return `${roundToOne(numeric)}mm`;
}

function feelsLikeCelsius(tempC: number, humidity: number, windSpeedMs: number): number {
  const windKph = windSpeedMs * 3.6;

  if (tempC <= 10 && windKph > 4.8) {
    const result =
      13.12 +
      0.6215 * tempC -
      11.37 * windKph ** 0.16 +
      0.3965 * tempC * windKph ** 0.16;
    return roundToOne(result);
  }

  if (tempC >= 27 && humidity >= 40) {
    const tempF = tempC * (9 / 5) + 32;
    const resultF =
      -42.379 +
      2.04901523 * tempF +
      10.14333127 * humidity -
      0.22475541 * tempF * humidity -
      0.00683783 * tempF * tempF -
      0.05481717 * humidity * humidity +
      0.00122874 * tempF * tempF * humidity +
      0.00085282 * tempF * humidity * humidity -
      0.00000199 * tempF * tempF * humidity * humidity;
    return roundToOne((resultF - 32) * (5 / 9));
  }

  return roundToOne(tempC);
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

function latestShortBase(now = new Date()): { baseDate: string; baseTime: string } {
  const reference = new Date(now.getTime() - 15 * 60 * 1000);
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const day = reference.getDate();
  const minute = reference.getMinutes();
  const currentHour = reference.getHours();

  for (let i = SHORT_BASE_HOURS.length - 1; i >= 0; i -= 1) {
    const hour = SHORT_BASE_HOURS[i];
    if (currentHour > hour || (currentHour === hour && minute >= 0)) {
      const date = new Date(year, month, day, hour, 0, 0, 0);
      return {
        baseDate: toYYYYMMDD(date),
        baseTime: `${String(hour).padStart(2, "0")}00`,
      };
    }
  }

  const prev = new Date(year, month, day - 1, 23, 0, 0, 0);
  return {
    baseDate: toYYYYMMDD(prev),
    baseTime: "2300",
  };
}

function latestUltraBase(now = new Date()): { baseDate: string; baseTime: string } {
  const reference = new Date(now.getTime() - 45 * 60 * 1000);
  return {
    baseDate: toYYYYMMDD(reference),
    baseTime: `${String(reference.getHours()).padStart(2, "0")}00`,
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

function regionAliases(value: string): string[] {
  const aliases = [value];
  const replacements: Array<[RegExp, string]> = [
    [/\uAC15\uC6D0\uD2B9\uBCC4\uC790\uCE58\uB3C4/g, "\uAC15\uC6D0\uB3C4"],
    [/\uC804\uBD81\uD2B9\uBCC4\uC790\uCE58\uB3C4/g, "\uC804\uB77C\uBD81\uB3C4"],
    [/\uC81C\uC8FC\uD2B9\uBCC4\uC790\uCE58\uB3C4/g, "\uC81C\uC8FC\uB3C4"],
    [/\uC138\uC885\uD2B9\uBCC4\uC790\uCE58\uC2DC/g, "\uC138\uC885\uC2DC"],
    [/\uC11C\uC6B8\uD2B9\uBCC4\uC2DC/g, "\uC11C\uC6B8\uC2DC"],
    [/\uBD80\uC0B0\uAD11\uC5ED\uC2DC/g, "\uBD80\uC0B0\uC2DC"],
    [/\uB300\uAD6C\uAD11\uC5ED\uC2DC/g, "\uB300\uAD6C\uC2DC"],
    [/\uC778\uCC9C\uAD11\uC5ED\uC2DC/g, "\uC778\uCC9C\uC2DC"],
    [/\uAD11\uC8FC\uAD11\uC5ED\uC2DC/g, "\uAD11\uC8FC\uC2DC"],
    [/\uB300\uC804\uAD11\uC5ED\uC2DC/g, "\uB300\uC804\uC2DC"],
    [/\uC6B8\uC0B0\uAD11\uC5ED\uC2DC/g, "\uC6B8\uC0B0\uC2DC"],
  ];

  replacements.forEach(([pattern, replacement]) => {
    if (pattern.test(value)) {
      aliases.push(value.replace(pattern, replacement));
    }
  });

  return unique(aliases);
}

function candidateQueries(cityName: string): string[] {
  const raw = cityName.trim();
  if (!raw) return [];
  const normalized = raw.replace(/,/g, " ").split(/\s+/).filter(Boolean).join(" ");
  const baseVariants = unique([raw, normalized, ...regionAliases(raw), ...regionAliases(normalized)]);
  const list: string[] = [];

  baseVariants.forEach((variant) => {
    const tokens = variant.split(" ").filter(Boolean);
    list.push(variant);
    list.push(...tokens);

    if (tokens.length > 1) {
      list.push(tokens.slice(0, 2).join(" "));
      list.push(tokens.slice(-2).join(" "));
    }

    if (tokens.length > 0) {
      list.push(tokens[tokens.length - 1]);
      list.push(tokens[0]);
    }
  });

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

function coordinatesFromLocation(location: WeatherLocationInput): GridCoord {
  const grid = latLonToGrid(location.lat, location.lon);
  return {
    ...grid,
    displayName: location.displayName?.trim() || `${location.lat},${location.lon}`,
  };
}

function weatherCacheKey(cityName: string, location?: WeatherLocationInput): string {
  const dateKey = toYYYYMMDD(new Date());
  if (location) {
    return `${dateKey}::${roundToOne(location.lat)}::${roundToOne(location.lon)}::${
      location.displayName?.trim() || ""
    }`;
  }
  return `${dateKey}::${cityKey(cityName || "Seoul")}`;
}

async function fetchKmaItems(
  endpoint: string,
  params: Record<string, string>,
): Promise<ForecastItem[] | null> {
  const url = new URL(endpoint);
  url.searchParams.set("serviceKey", getWeatherApiKey());
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "1200");
  url.searchParams.set("dataType", "JSON");

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const retryDelays = [0, 700, 1400];

  for (const delay of retryDelays) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        "User-Agent": "fashion-diary-weather/1.0 (+https://example.local)",
      },
    });
    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) {
        continue;
      }
      return null;
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const header = ((payload.response as Record<string, unknown>)?.header || {}) as Record<
      string,
      unknown
    >;
    const resultCode = String(header.resultCode || "");
    if (resultCode && resultCode !== "00") {
      if (resultCode === "03" || resultCode === "22") {
        continue;
      }
      return null;
    }

    const body = ((payload.response as Record<string, unknown>)?.body || {}) as Record<
      string,
      unknown
    >;
    const items = (((body.items as Record<string, unknown>)?.item as unknown[]) || []) as ForecastItem[];
    return Array.isArray(items) ? items : null;
  }

  return null;
}

function buildTimeMap(
  items: ForecastItem[],
  dateField: "baseDate" | "fcstDate",
  timeField: "baseTime" | "fcstTime",
  categoryField: "category",
  valueField: "obsrValue" | "fcstValue",
  dateFilter?: string,
): Record<string, Record<string, unknown>> {
  const map: Record<string, Record<string, unknown>> = {};

  items.forEach((item) => {
    const dateValue = String(item[dateField] || "");
    if (dateFilter && dateValue !== dateFilter) return;

    const time = String(item[timeField] || "");
    const category = String(item[categoryField] || "");
    if (!time || !category) return;

    if (!map[time]) map[time] = {};
    map[time][category] = item[valueField];
  });

  return map;
}

function findNearestTime(times: string[], nowHHMM: string): string {
  if (times.length === 0) return "0000";

  const pastOrCurrent = times.filter((time) => time <= nowHHMM);
  if (pastOrCurrent.length > 0) {
    return pastOrCurrent[pastOrCurrent.length - 1];
  }

  return times[0];
}

function findNearestFutureTime(times: string[], nowHHMM: string): string {
  if (times.length === 0) return "0000";

  const futureOrCurrent = times.filter((time) => time >= nowHHMM);
  if (futureOrCurrent.length > 0) {
    return futureOrCurrent[0];
  }

  return times[times.length - 1];
}

function minMaxFromShortForecast(items: ForecastItem[], dateKey: string): { min: number; max: number } | null {
  const todayItems = items.filter((item) => String(item.fcstDate || "") === dateKey);
  if (todayItems.length === 0) return null;

  const tmnValues = todayItems
    .filter((item) => String(item.category || "") === "TMN")
    .map((item) => toFloat(item.fcstValue))
    .filter((value): value is number => value != null);
  const tmxValues = todayItems
    .filter((item) => String(item.category || "") === "TMX")
    .map((item) => toFloat(item.fcstValue))
    .filter((value): value is number => value != null);
  const tmpValues = todayItems
    .filter((item) => String(item.category || "") === "TMP")
    .map((item) => toFloat(item.fcstValue))
    .filter((value): value is number => value != null);

  if (tmnValues.length === 0 && tmxValues.length === 0 && tmpValues.length === 0) return null;

  const minSource = tmnValues.length > 0 ? tmnValues : tmpValues;
  const maxSource = tmxValues.length > 0 ? tmxValues : tmpValues;
  if (minSource.length === 0 || maxSource.length === 0) return null;

  return {
    min: roundToOne(Math.min(...minSource)),
    max: roundToOne(Math.max(...maxSource)),
  };
}

function currentPtyFromNowcast(nowcast: Record<string, unknown>): number {
  const pty = toInt(nowcast.PTY);
  if (pty != null) return pty;

  const rainAmount = precipitationAmountLabel(nowcast.RN1);
  return rainAmount !== "0mm" && rainAmount !== "-" ? 1 : 0;
}

export async function getTodayWeatherSummary(
  cityName: string,
  location?: WeatherLocationInput,
): Promise<WeatherSummary | null> {
  if (!hasWeatherApiKey()) return null;

  const key = weatherCacheKey(cityName, location);
  const cached = cacheGet(weatherCache, key);
  if (cached !== undefined) return cached;

  const coord = location ? coordinatesFromLocation(location) : null;
  const regionResolved = location
    ? null
    : await resolveRegionCoordinate(cityName || "Seoul");
  const effectiveCoord =
    coord ??
    (regionResolved
      ? coordinatesFromLocation({
          lat: regionResolved.lat,
          lon: regionResolved.lon,
          displayName: regionResolved.displayName,
        })
      : await getCoordinates(cityName || "Seoul"));

  if (!effectiveCoord) {
    cacheSet(weatherCache, key, null, WEATHER_ERR_TTL_MS);
    return null;
  }

  const now = new Date();
  const todayKey = nowDateKey(now);
  const ultraBase = latestUltraBase(now);
  const shortBase = latestShortBase(now);

  try {
    const nowcastItems = await fetchKmaItems(ULTRA_NOWCAST_ENDPOINT, {
      base_date: ultraBase.baseDate,
      base_time: ultraBase.baseTime,
      nx: String(effectiveCoord.nx),
      ny: String(effectiveCoord.ny),
    });
    const ultraForecastItems = await fetchKmaItems(ULTRA_FORECAST_ENDPOINT, {
      base_date: ultraBase.baseDate,
      base_time: ultraBase.baseTime,
      nx: String(effectiveCoord.nx),
      ny: String(effectiveCoord.ny),
    });
    const shortForecastItems = await fetchKmaItems(SHORT_FORECAST_ENDPOINT, {
      base_date: shortBase.baseDate,
      base_time: shortBase.baseTime,
      nx: String(effectiveCoord.nx),
      ny: String(effectiveCoord.ny),
    });

    if (!nowcastItems || !ultraForecastItems || !shortForecastItems) {
      cacheSet(weatherCache, key, null, WEATHER_ERR_TTL_MS);
      return null;
    }

    const nowcastMap = buildTimeMap(
      nowcastItems,
      "baseDate",
      "baseTime",
      "category",
      "obsrValue",
      ultraBase.baseDate,
    );
    const ultraForecastMap = buildTimeMap(
      ultraForecastItems,
      "fcstDate",
      "fcstTime",
      "category",
      "fcstValue",
      todayKey,
    );
    const shortForecastMap = buildTimeMap(
      shortForecastItems,
      "fcstDate",
      "fcstTime",
      "category",
      "fcstValue",
      todayKey,
    );

    const nowHHMM = currentForecastTime(now);
    const nowcastTimes = Object.keys(nowcastMap).filter((time) => /^\d{4}$/.test(time)).sort();
    const ultraForecastTimes = Object.keys(ultraForecastMap)
      .filter((time) => /^\d{4}$/.test(time))
      .sort();
    const shortForecastTimes = Object.keys(shortForecastMap)
      .filter((time) => /^\d{4}$/.test(time))
      .sort();

    const nowcastTime = findNearestTime(nowcastTimes, nowHHMM);
    const ultraForecastTime = findNearestFutureTime(ultraForecastTimes, nowHHMM);
    const shortForecastTime = findNearestFutureTime(shortForecastTimes, nowHHMM);

    const nowcast = nowcastMap[nowcastTime] || {};
    const ultraForecast = ultraForecastMap[ultraForecastTime] || {};
    const shortForecast = shortForecastMap[shortForecastTime] || {};
    const minMax = minMaxFromShortForecast(shortForecastItems, todayKey);

    const currentTemp =
      roundToOne(
        toFloat(nowcast.T1H) ??
          toFloat(ultraForecast.T1H) ??
          toFloat(shortForecast.TMP) ??
          0,
      );
    const humidity =
      toInt(nowcast.REH) ??
      toInt(ultraForecast.REH) ??
      toInt(shortForecast.REH) ??
      0;
    const windSpeed =
      toFloat(nowcast.WSD) ??
      toFloat(ultraForecast.WSD) ??
      toFloat(shortForecast.WSD) ??
      0;
    const ptyNow =
      toInt(ultraForecast.PTY) ??
      currentPtyFromNowcast(nowcast) ??
      toInt(shortForecast.PTY) ??
      0;
    const skyNow = toInt(ultraForecast.SKY) ?? toInt(shortForecast.SKY) ?? 1;
    const precipitationProbability =
      toInt(ultraForecast.POP) ?? toInt(shortForecast.POP) ?? 0;
    const precipitationAmount = precipitationAmountLabel(
      nowcast.RN1 ?? ultraForecast.RN1 ?? shortForecast.PCP,
    );

    const tMin = minMax?.min ?? currentTemp;
    const tMax = minMax?.max ?? currentTemp;
    const result: WeatherSummary = {
      city: effectiveCoord.displayName,
      current_temp: currentTemp,
      feels_like: feelsLikeCelsius(currentTemp, humidity, windSpeed),
      t_min: Math.min(tMin, tMax),
      t_max: Math.max(tMin, tMax),
      humidity,
      rain: ptyNow > 0,
      desc: weatherDesc(ptyNow, skyNow),
      icon: "",
      precipitation_type: precipitationTypeLabel(ptyNow),
      precipitation_probability: precipitationProbability,
      precipitation_amount: precipitationAmount,
    };

    cacheSet(weatherCache, key, result, WEATHER_TTL_MS);
    return result;
  } catch {
    cacheSet(weatherCache, key, null, WEATHER_ERR_TTL_MS);
    return null;
  }
}
