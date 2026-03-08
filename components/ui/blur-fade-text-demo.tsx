"use client";

import { useEffect, useMemo, useState } from "react";

import { BlurFade } from "@/components/ui/blur-fade";
import { getWeatherIconComponent } from "@/components/ui/weather-icons";

type RegionOption = {
  id: string;
  name: string;
  lat?: number;
  lon?: number;
};

type RegionGroup = {
  id: string;
  name: string;
  children: RegionOption[];
};

type WeatherDetails = {
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

function formatTemperature(value: number): string {
  return `${value.toFixed(1)}°C`;
}

function regionLabel(group?: RegionGroup, option?: RegionOption): string {
  if (!group || !option) return "지역 선택";
  if (group.name === option.name) return option.name;
  return `${group.name} ${option.name}`;
}

export function BlurFadeTextDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const [regions, setRegions] = useState<RegionGroup[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionsError, setRegionsError] = useState("");
  const [draftSidoId, setDraftSidoId] = useState("");
  const [draftSigunguId, setDraftSigunguId] = useState("");
  const [appliedSidoId, setAppliedSidoId] = useState("");
  const [appliedSigunguId, setAppliedSigunguId] = useState("");
  const [weather, setWeather] = useState<WeatherDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const draftSido = useMemo(
    () => regions.find((region) => region.id === draftSidoId),
    [regions, draftSidoId],
  );
  const draftSigunguOptions = draftSido?.children ?? [];
  const draftSigungu = useMemo(
    () => draftSigunguOptions.find((region) => region.id === draftSigunguId),
    [draftSigunguOptions, draftSigunguId],
  );

  const appliedSido = useMemo(
    () => regions.find((region) => region.id === appliedSidoId),
    [regions, appliedSidoId],
  );
  const appliedSigunguOptions = appliedSido?.children ?? [];
  const appliedSigungu = useMemo(
    () => appliedSigunguOptions.find((region) => region.id === appliedSigunguId),
    [appliedSigunguOptions, appliedSigunguId],
  );

  const selectedRegionLabel = regionLabel(appliedSido, appliedSigungu);
  const draftRegionLabel = regionLabel(draftSido, draftSigungu);
  const WeatherIcon = weather
    ? getWeatherIconComponent(
        weather.desc,
        weather.precipitation_type,
        weather.precipitation_amount,
      )
    : null;

  useEffect(() => {
    let active = true;

    async function fetchRegions() {
      setRegionsLoading(true);
      setRegionsError("");

      try {
        const response = await fetch("/api/weather/regions");
        const payload = (await response.json()) as
          | { ok: true; data: RegionGroup[] }
          | { ok: false; error?: string };

        if (!active) return;
        if (!response.ok || !payload.ok || payload.data.length === 0) {
          setRegions([]);
          setRegionsError("지역 목록을 불러오지 못했습니다.");
          return;
        }

        setRegions(payload.data);
        setDraftSidoId("");
        setDraftSigunguId("");
        setAppliedSidoId("");
        setAppliedSigunguId("");
      } catch {
        if (!active) return;
        setRegions([]);
        setRegionsError("지역 목록을 불러오지 못했습니다.");
      } finally {
        if (active) {
          setRegionsLoading(false);
        }
      }
    }

    void fetchRegions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!appliedSido || !appliedSigungu) {
      setWeather(null);
      setError("");
      setIsLoading(false);
      return;
    }

    const region = appliedSigungu;

    let active = true;

    async function fetchWeather() {
      setIsLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          city: selectedRegionLabel,
          displayName: selectedRegionLabel,
        });

        if (typeof region.lat === "number" && typeof region.lon === "number") {
          params.set("lat", String(region.lat));
          params.set("lon", String(region.lon));
        }

        const response = await fetch(`/api/weather?${params.toString()}`);
        const payload = (await response.json()) as
          | { ok: true; data: WeatherDetails }
          | { ok: false; error?: string };

        if (!active) return;

        if (!response.ok || !payload.ok) {
          setWeather(null);
          setError("날씨 정보를 불러오지 못했습니다.");
          return;
        }

        setWeather(payload.data);
      } catch {
        if (!active) return;
        setWeather(null);
        setError("날씨 정보를 불러오지 못했습니다.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void fetchWeather();

    return () => {
      active = false;
    };
  }, [selectedRegionLabel, appliedSido, appliedSigungu]);

  function handleSidoChange(value: string) {
    setDraftSidoId(value);
    setDraftSigunguId("");
  }

  function handleConfirmSelection() {
    if (!draftSidoId || !draftSigunguId) return;
    setAppliedSidoId(draftSidoId);
    setAppliedSigunguId(draftSigunguId);
    setWeather(null);
    setError("");
    setIsOpen(false);
  }

  return (
    <section
      id="header"
      style={{
        minHeight: "calc(100vh - 5.2rem)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          width: "min(100%, 72rem)",
        }}
      >
        <BlurFade delay={0.25} inView>
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(2rem, 5vw, 4rem)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
            }}
          >
            오늘의 날씨
          </h2>
        </BlurFade>
        <BlurFade delay={0.5} inView>
          <div
            style={{
              display: "grid",
              gap: "0.75rem",
              justifyItems: "center",
              width: "100%",
            }}
          >
            <button
              type="button"
              className="ghost-button"
              onClick={() => setIsOpen((current) => !current)}
              aria-expanded={isOpen}
              aria-controls="dashboard-region-panel"
              disabled={regionsLoading || regions.length === 0}
            >
              {regionsLoading ? "지역 불러오는 중.." : selectedRegionLabel}
            </button>
            {isOpen ? (
              <div
                id="dashboard-region-panel"
                className="outfit-weather-panel"
                style={{
                  width: "min(100%, 32rem)",
                  textAlign: "left",
                }}
              >
                <div className="dashboard-region-grid" style={{ width: "100%" }}>
                  <label className="dashboard-region-field">
                    <span className="dashboard-region-label">시/도</span>
                    <span className="dashboard-region-select-wrap">
                      <select
                        className="dashboard-region-select"
                        value={draftSidoId}
                        onChange={(event) => handleSidoChange(event.target.value)}
                        disabled={regionsLoading || regions.length === 0}
                      >
                        <option value="">시/도를 선택해 주세요</option>
                        {regions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
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
                        value={draftSigunguId}
                        onChange={(event) => setDraftSigunguId(event.target.value)}
                        disabled={
                          regionsLoading || !draftSidoId || draftSigunguOptions.length === 0
                        }
                      >
                        <option value="">시/군/구를 선택해 주세요</option>
                        {draftSigunguOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                      <span className="dashboard-region-select-icon">
                        <SelectArrow />
                      </span>
                    </span>
                  </label>
                </div>
                <p className="outfit-weather-message" style={{ margin: 0, textAlign: "center" }}>
                  {draftRegionLabel}
                </p>
                {regionsError ? <p className="form-error">{regionsError}</p> : null}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={handleConfirmSelection}
                    disabled={!draftSidoId || !draftSigunguId}
                  >
                    선택 완료
                  </button>
                </div>
              </div>
            ) : null}
            {appliedSido && appliedSigungu && !isOpen ? (
              <div
                className="outfit-weather-panel"
                style={{
                  width: "min(100%, 72rem)",
                  textAlign: "left",
                  gap: "0.8rem",
                }}
              >
                {isLoading ? (
                  <p className="outfit-weather-message" style={{ margin: 0 }}>
                    날씨 불러오는 중..
                  </p>
                ) : null}
                {weather ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                      gap: "0.65rem",
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: "12px",
                        padding: "0.8rem",
                        background: "rgba(var(--surface-rgb), 0.55)",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: "0.5rem" }}>
                        현재 날씨 상태
                      </strong>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.7rem",
                        }}
                      >
                        {WeatherIcon ? <WeatherIcon size={42} /> : null}
                        <span className="outfit-weather-message" style={{ margin: 0 }}>
                          {weather.desc}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: "12px",
                        padding: "0.8rem",
                        background: "rgba(var(--surface-rgb), 0.55)",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: "0.3rem" }}>
                        현재 기온
                      </strong>
                      <span className="outfit-weather-message" style={{ margin: 0 }}>
                        {formatTemperature(weather.current_temp)}
                      </span>
                    </div>
                    <div
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: "12px",
                        padding: "0.8rem",
                        background: "rgba(var(--surface-rgb), 0.55)",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: "0.3rem" }}>
                        체감온도
                      </strong>
                      <span className="outfit-weather-message" style={{ margin: 0 }}>
                        {formatTemperature(weather.feels_like)}
                      </span>
                    </div>
                    <div
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: "12px",
                        padding: "0.8rem",
                        background: "rgba(var(--surface-rgb), 0.55)",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: "0.3rem" }}>
                        최저 / 최고 기온
                      </strong>
                      <span className="outfit-weather-message" style={{ margin: 0 }}>
                        {formatTemperature(weather.t_min)} / {formatTemperature(weather.t_max)}
                      </span>
                    </div>
                    <div
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: "12px",
                        padding: "0.8rem",
                        background: "rgba(var(--surface-rgb), 0.55)",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: "0.3rem" }}>
                        강수 정보
                      </strong>
                      <span className="outfit-weather-message" style={{ margin: 0 }}>
                        {weather.precipitation_type} · 강수확률 {weather.precipitation_probability}%
                        · 강수량 {weather.precipitation_amount}
                      </span>
                    </div>
                  </div>
                ) : null}
                {error ? <p className="form-error">{error}</p> : null}
              </div>
            ) : null}
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
