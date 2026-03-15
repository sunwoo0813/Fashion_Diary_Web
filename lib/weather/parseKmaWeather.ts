import type {
  KmaForecastItem,
  ParseKmaWeatherInput,
  ParsedDailyTemperatureSummary,
} from "@/lib/weather/types";

function toFloat(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function roundToOne(value: number) {
  return Math.round(value * 10) / 10;
}

function isTodayForecast(item: KmaForecastItem, todayDateKey: string) {
  return String(item.fcstDate || "") === todayDateKey;
}

function readCategoryValues(
  items: KmaForecastItem[],
  todayDateKey: string,
  category: "TMN" | "TMX",
) {
  return items
    .filter((item) => isTodayForecast(item, todayDateKey))
    .filter((item) => String(item.category || "") === category)
    .map((item) => toFloat(item.fcstValue))
    .filter((value): value is number => value != null);
}

/**
 * KMA short forecast includes daily TMN/TMX values for the target forecast date.
 *
 * Why the old TMP min/max approach was unstable:
 * - TMP is an hourly/slot forecast value.
 * - If you calculate min/max from TMP, the set of available forecast slots changes
 *   depending on the current base time and query time.
 * - That makes "today's min/max" move throughout the day.
 *
 * To behave like portal weather services, we should treat today's low/high as:
 * - TMN for today's daily minimum
 * - TMX for today's daily maximum
 *
 * Only if either TMN or TMX is missing do we fall back for that specific side.
 */
export function parseKmaDailyTemperatures({
  items,
  todayDateKey,
  currentTemp,
  feelsLike,
  fallbackMinTemp = null,
  fallbackMaxTemp = null,
}: ParseKmaWeatherInput): ParsedDailyTemperatureSummary {
  const tmnValues = readCategoryValues(items, todayDateKey, "TMN");
  const tmxValues = readCategoryValues(items, todayDateKey, "TMX");

  const hasTmn = tmnValues.length > 0;
  const hasTmx = tmxValues.length > 0;

  const minTemp = hasTmn
    ? roundToOne(Math.min(...tmnValues))
    : fallbackMinTemp != null
      ? roundToOne(fallbackMinTemp)
      : currentTemp;
  const maxTemp = hasTmx
    ? roundToOne(Math.max(...tmxValues))
    : fallbackMaxTemp != null
      ? roundToOne(fallbackMaxTemp)
      : currentTemp;

  return {
    currentTemp,
    feelsLike,
    minTemp: Math.min(minTemp, maxTemp),
    maxTemp: Math.max(minTemp, maxTemp),
    minTempSource: hasTmn ? "tmn" : fallbackMinTemp != null ? "cache" : "current",
    maxTempSource: hasTmx ? "tmx" : fallbackMaxTemp != null ? "cache" : "current",
  };
}
