"use client";

import { useEffect, useMemo, useState } from "react";

import type { RegionCoordinateGroup } from "@/lib/korea-region-coordinates";
import { findRegionCoordinateByIds } from "@/lib/korea-region-coordinates";
import type { PreferredRegion } from "@/lib/user-preferences";

type WeatherData = {
  city: string;
  t_min: number;
  t_max: number;
  humidity: number;
  rain: boolean;
  desc: string;
};

type WeatherFieldsProps = {
  defaultCity?: string;
  defaultTMin?: number;
  defaultTMax?: number;
  defaultHumidity?: number;
  defaultRain?: boolean;
};

type WeatherState = {
  city: string;
  tMin: number;
  tMax: number;
  humidity: number;
  rain: boolean;
};

function SelectArrow() {
  return (
    <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16">
      <path
        d="M14.0607 5.49999L13.5303 6.03032L8.7071 10.8535C8.31658 11.2441 7.68341 11.2441 7.29289 10.8535L2.46966 6.03032L1.93933 5.49999L2.99999 4.43933L3.53032 4.96966L7.99999 9.43933L12.4697 4.96966L13 4.43933L14.0607 5.49999Z"
        fill="currentColor"
      />
    </svg>
  );
}

async function fetchPreferredRegion(): Promise<PreferredRegion | null> {
  const response = await fetch("/api/account/preferred-region", { cache: "no-store" });
  const payload = (await response.json()) as { ok?: boolean; data?: PreferredRegion | null };
  if (!response.ok || !payload.ok) return null;
  return payload.data || null;
}

async function fetchRegions(): Promise<RegionCoordinateGroup[]> {
  const response = await fetch("/api/weather/regions", { cache: "no-store" });
  const payload = (await response.json()) as { ok?: boolean; data?: RegionCoordinateGroup[] };
  if (!response.ok || !payload.ok || !Array.isArray(payload.data)) return [];
  return payload.data;
}

export function WeatherFields({
  defaultCity = "서울",
  defaultTMin = 0,
  defaultTMax = 0,
  defaultHumidity = 0,
  defaultRain = false,
}: WeatherFieldsProps) {
  const [regions, setRegions] = useState<RegionCoordinateGroup[]>([]);
  const [sidoId, setSidoId] = useState("");
  const [sigunguId, setSigunguId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [weather, setWeather] = useState<WeatherState>({
    city: defaultCity,
    tMin: defaultTMin,
    tMax: defaultTMax,
    humidity: defaultHumidity,
    rain: defaultRain,
  });

  const selectedSido = useMemo(
    () => regions.find((region) => region.id === sidoId) ?? null,
    [regions, sidoId],
  );
  const sigunguOptions = useMemo(() => selectedSido?.children ?? [], [selectedSido]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const [preferredRegion, nextRegions] = await Promise.all([fetchPreferredRegion(), fetchRegions()]);
      if (!active) return;

      setRegions(nextRegions);

      if (preferredRegion) {
        setSidoId(preferredRegion.sidoId);
        setSigunguId(preferredRegion.sigunguId);
        return;
      }

      if (nextRegions.length > 0) {
        const fallbackSido = nextRegions[0];
        const fallbackSigungu = fallbackSido.children[0];
        setSidoId(fallbackSido?.id || "");
        setSigunguId(fallbackSigungu?.id || "");
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!sidoId || !sigunguId) return;

    let active = true;

    async function fillWeather() {
      setIsLoading(true);
      setError("");

      try {
        const region = findRegionCoordinateByIds(sidoId, sigunguId);
        const query = region
          ? `/api/weather?lat=${encodeURIComponent(String(region.lat))}&lon=${encodeURIComponent(String(region.lon))}&displayName=${encodeURIComponent(region.displayName)}`
          : `/api/weather?city=${encodeURIComponent(defaultCity)}`;

        const response = await fetch(query, { cache: "no-store" });
        const payload = (await response.json()) as
          | { ok: true; data: WeatherData }
          | { ok: false; error?: string };

        if (!active) return;
        if (!response.ok || !payload.ok) {
          setError("날씨 정보를 불러오지 못했어요.");
          return;
        }

        const next = payload.data;
        setWeather({
          city: next.city,
          tMin: next.t_min,
          tMax: next.t_max,
          humidity: next.humidity,
          rain: next.rain,
        });
      } catch {
        if (!active) return;
        setError("날씨 정보를 불러오지 못했어요.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void fillWeather();
    return () => {
      active = false;
    };
  }, [defaultCity, sidoId, sigunguId]);

  return (
    <section className="outfit-weather-panel">
      <input type="hidden" name="t_min" value={String(weather.tMin)} />
      <input type="hidden" name="t_max" value={String(weather.tMax)} />
      <input type="hidden" name="humidity" value={String(weather.humidity)} />
      <input type="hidden" name="rain" value={weather.rain ? "1" : "0"} />

      <div className="outfit-weather-head">
        <div className="outfit-city-field">
          <span>지역</span>
          <strong>{weather.city}</strong>
        </div>
        {isLoading ? <span className="outfit-weather-loading">날씨 불러오는 중...</span> : null}
      </div>

      <div className="dashboard-region-grid">
        <label className="dashboard-region-field">
          <span className="dashboard-region-label">시/도</span>
          <span className="dashboard-region-select-wrap">
            <select
              className="dashboard-region-select"
              value={sidoId}
              onChange={(event) => {
                const nextSidoId = event.target.value;
                const nextSido = regions.find((region) => region.id === nextSidoId);
                setSidoId(nextSidoId);
                setSigunguId(nextSido?.children[0]?.id || "");
              }}
              disabled={regions.length === 0}
            >
              <option value="">시/도를 선택해 주세요</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
            <span className="dashboard-region-select-icon">
              <SelectArrow />
            </span>
          </span>
        </label>
        <label className="dashboard-region-field">
          <span className="dashboard-region-label">시/군/구</span>
          <span className="dashboard-region-select-wrap">
            <select
              className="dashboard-region-select"
              value={sigunguId}
              onChange={(event) => setSigunguId(event.target.value)}
              disabled={!sidoId || sigunguOptions.length === 0}
            >
              <option value="">시/군/구를 선택해 주세요</option>
              {sigunguOptions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
            <span className="dashboard-region-select-icon">
              <SelectArrow />
            </span>
          </span>
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="outfit-weather-grid">
        <div className="outfit-weather-stat">
          <span>최저 기온</span>
          <strong>{weather.tMin}°C</strong>
        </div>
        <div className="outfit-weather-stat">
          <span>최고 기온</span>
          <strong>{weather.tMax}°C</strong>
        </div>
        <div className="outfit-weather-stat">
          <span>습도</span>
          <strong>{weather.humidity}%</strong>
        </div>
        <div className="outfit-weather-stat">
          <span>강수</span>
          <strong>{weather.rain ? "비" : "비 없음"}</strong>
        </div>
      </div>
    </section>
  );
}
