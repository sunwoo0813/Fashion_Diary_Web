export interface KmaForecastItem {
  category?: unknown;
  baseDate?: unknown;
  baseTime?: unknown;
  fcstDate?: unknown;
  fcstTime?: unknown;
  fcstValue?: unknown;
  obsrValue?: unknown;
}

export interface ParsedDailyTemperatureSummary {
  currentTemp: number;
  feelsLike: number;
  minTemp: number;
  maxTemp: number;
  minTempSource: "tmn" | "cache" | "current";
  maxTempSource: "tmx" | "cache" | "current";
}

export interface ParseKmaWeatherInput {
  items: KmaForecastItem[];
  todayDateKey: string;
  currentTemp: number;
  feelsLike: number;
  fallbackMinTemp?: number | null;
  fallbackMaxTemp?: number | null;
}
