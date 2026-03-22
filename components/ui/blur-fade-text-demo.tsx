"use client";

import { useEffect, useMemo, useState } from "react";

import { BlurFade } from "@/components/ui/blur-fade";
import { getWeatherIconComponent } from "@/components/ui/weather-icons";
import type { PreferredRegion } from "@/lib/user-preferences";

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
  wind_speed: number;
  rain: boolean;
  desc: string;
  icon: string;
  precipitation_type: string;
  precipitation_probability: number;
  precipitation_amount: string;
};

type RecommendationPart = {
  slot: "Top" | "Bottom" | "Outer" | "Shoes" | "ACC";
  item: {
    id: number;
    name: string;
    category: string | null;
    detail_category: string | null;
    color: string | null;
    thickness: string | null;
    season: string[];
    image_path: string | null;
  };
  reasons: string[];
};

type RecommendationData = {
  summary?: string;
  context: {
    effectiveTemp: number;
    tempBand: string;
    isRainy: boolean;
    regionLabel: string;
  };
  parts?: RecommendationPart[];
  missingSlots?: string[];
  looks: Array<{
    title: string;
    summary: string;
    reasons: string[];
    parts: RecommendationPart[];
    missingSlots: string[];
    totalScore: number;
  }>;
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

function RecommendLoader() {
  return (
    <>
      <span
        aria-hidden="true"
        style={{
          position: "relative",
          display: "inline-block",
          width: "20px",
          aspectRatio: "1 / 1",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            inset: "0 11px 11px 0",
            borderRadius: "999px",
            boxShadow: "inset 0 0 0 2px currentColor",
            animation: "recommendLoaderAnim 2.5s infinite",
          }}
        />
        <span
          style={{
            position: "absolute",
            inset: "0 11px 11px 0",
            borderRadius: "999px",
            boxShadow: "inset 0 0 0 2px currentColor",
            animation: "recommendLoaderAnim 2.5s infinite",
            animationDelay: "-1.25s",
          }}
        />
      </span>
      <style jsx>{`
        @keyframes recommendLoaderAnim {
          0% {
            inset: 0 11px 11px 0;
          }
          12.5% {
            inset: 0 11px 0 0;
          }
          25% {
            inset: 11px 11px 0 0;
          }
          37.5% {
            inset: 11px 0 0 0;
          }
          50% {
            inset: 11px 0 0 11px;
          }
          62.5% {
            inset: 0 0 0 11px;
          }
          75% {
            inset: 0 0 11px 11px;
          }
          87.5% {
            inset: 0 0 11px 0;
          }
          100% {
            inset: 0 11px 11px 0;
          }
        }
      `}</style>
    </>
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

function slotLabel(slot: RecommendationPart["slot"]) {
  if (slot === "Top") return "상의";
  if (slot === "Bottom") return "하의";
  if (slot === "Outer") return "아우터";
  if (slot === "Shoes") return "신발";
  return "악세서리";
}

function splitItemName(name: string) {
  const trimmed = name.trim();
  const separatorIndex = trimmed.indexOf(" ");

  if (separatorIndex <= 0) {
    return { brand: "", productName: trimmed };
  }

  return {
    brand: trimmed.slice(0, separatorIndex),
    productName: trimmed.slice(separatorIndex + 1).trim(),
  };
}

function lookLabel(title: string) {
  if (title === "single") return "AI 추천";
  if (title === "stable") return "무난하게";
  if (title === "variation") return "조금 다르게";
  if (title === "underused") return "안 입던 옷 활용";
  return title;
}

function todayLookSummary(recommendation: RecommendationData) {
  const { context } = recommendation;

  if (context.isRainy) {
    return "오늘은 비를 고려해서 무난하고 안정적인 룩으로 가는 게 좋아요.";
  }
  if (context.tempBand === "freezing" || context.tempBand === "cold") {
    return "오늘은 보온감 있는 레이어드 룩이 가장 잘 어울려요.";
  }
  if (context.tempBand === "warm" || context.tempBand === "hot") {
    return "오늘은 가볍고 답답하지 않은 룩으로 가는 게 좋아요.";
  }
  return "오늘은 기본 조합에 가벼운 변주를 주기 좋은 날이에요.";
}

export function BlurFadeTextDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const [regions, setRegions] = useState<RegionGroup[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionsError, setRegionsError] = useState("");
  const [preferredRegion, setPreferredRegion] = useState<PreferredRegion | null>(null);
  const [preferredRegionLoaded, setPreferredRegionLoaded] = useState(false);
  const [draftSidoId, setDraftSidoId] = useState("");
  const [draftSigunguId, setDraftSigunguId] = useState("");
  const [appliedSidoId, setAppliedSidoId] = useState("");
  const [appliedSigunguId, setAppliedSigunguId] = useState("");
  const [weather, setWeather] = useState<WeatherDetails | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [recommendation, setRecommendation] = useState<RecommendationData | null>(null);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendError, setRecommendError] = useState("");
  const [aiRecommendLoading, setAiRecommendLoading] = useState(false);
  const [aiComposerOpen, setAiComposerOpen] = useState(false);
  const [aiComment, setAiComment] = useState("");

  const draftSido = useMemo(
    () => regions.find((region) => region.id === draftSidoId),
    [regions, draftSidoId],
  );
  const draftSigunguOptions = useMemo(() => draftSido?.children ?? [], [draftSido]);
  const draftSigungu = useMemo(
    () => draftSigunguOptions.find((region) => region.id === draftSigunguId),
    [draftSigunguId, draftSigunguOptions],
  );

  const appliedSido = useMemo(
    () => regions.find((region) => region.id === appliedSidoId),
    [regions, appliedSidoId],
  );
  const appliedSigunguOptions = useMemo(() => appliedSido?.children ?? [], [appliedSido]);
  const appliedSigungu = useMemo(
    () => appliedSigunguOptions.find((region) => region.id === appliedSigunguId),
    [appliedSigunguId, appliedSigunguOptions],
  );

  const selectedRegionLabel = regionLabel(appliedSido, appliedSigungu);
  const draftRegionLabel = regionLabel(draftSido, draftSigungu);
  const WeatherIcon = weather
    ? getWeatherIconComponent(
        weather.desc,
        weather.precipitation_type,
        weather.precipitation_amount,
        weather.wind_speed,
        weather.precipitation_probability,
      )
    : null;

  useEffect(() => {
    let active = true;

    async function fetchPreferredRegion() {
      try {
        const response = await fetch("/api/account/preferred-region");
        const payload = (await response.json()) as
          | { ok: true; data: PreferredRegion | null }
          | { ok: false; error?: string };

        if (!active) return;
        if (response.ok && payload.ok) {
          setPreferredRegion(payload.data ?? null);
        }
      } finally {
        if (active) {
          setPreferredRegionLoaded(true);
        }
      }
    }

    void fetchPreferredRegion();

    return () => {
      active = false;
    };
  }, []);

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
    if (!preferredRegionLoaded || regions.length === 0 || !preferredRegion) return;

    const matchedSido = regions.find((region) => region.id === preferredRegion.sidoId);
    const matchedSigungu = matchedSido?.children.find(
      (region) => region.id === preferredRegion.sigunguId,
    );
    if (!matchedSido || !matchedSigungu) return;

    setDraftSidoId((current) => current || matchedSido.id);
    setDraftSigunguId((current) => current || matchedSigungu.id);
    setAppliedSidoId((current) => current || matchedSido.id);
    setAppliedSigunguId((current) => current || matchedSigungu.id);
  }, [preferredRegion, preferredRegionLoaded, regions]);

  useEffect(() => {
    if (!appliedSido || !appliedSigungu) {
      setWeather(null);
      setWeatherError("");
      setWeatherLoading(false);
      setRecommendation(null);
      setRecommendError("");
      setRecommendLoading(false);
      return;
    }

    const region = appliedSigungu;
    let active = true;

    async function fetchWeather() {
      setWeatherLoading(true);
      setWeatherError("");
      setRecommendation(null);
      setRecommendError("");

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
          setWeatherError("날씨 정보를 불러오지 못했습니다.");
          return;
        }

        setWeather(payload.data);
      } catch {
        if (!active) return;
        setWeather(null);
        setWeatherError("날씨 정보를 불러오지 못했습니다.");
      } finally {
        if (active) {
          setWeatherLoading(false);
        }
      }
    }

    void fetchWeather();

    return () => {
      active = false;
    };
  }, [appliedSido, appliedSigungu, selectedRegionLabel]);

  function handleSidoChange(value: string) {
    setDraftSidoId(value);
    setDraftSigunguId("");
  }

  async function persistPreferredRegion(nextPreferredRegion: PreferredRegion) {
    try {
      const response = await fetch("/api/account/preferred-region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredRegion: nextPreferredRegion }),
      });
      const payload = (await response.json()) as
        | { ok: true; data: PreferredRegion | null }
        | { ok: false; error?: string };

      if (!response.ok || !payload.ok) return;
      setPreferredRegion(payload.data ?? nextPreferredRegion);
    } catch {
      // Ignore preference persistence failures and keep local selection.
    }
  }

  function handleConfirmSelection() {
    if (!draftSidoId || !draftSigunguId) return;

    const nextPreferredRegion = {
      sidoId: draftSidoId,
      sigunguId: draftSigunguId,
    };

    const isSameRegion = draftSidoId === appliedSidoId && draftSigunguId === appliedSigunguId;

    setAppliedSidoId(draftSidoId);
    setAppliedSigunguId(draftSigunguId);
    setPreferredRegion(nextPreferredRegion);

    if (!isSameRegion) {
      setWeather(null);
      setWeatherError("");
      setRecommendation(null);
      setRecommendError("");
    }

    setIsOpen(false);
    void persistPreferredRegion(nextPreferredRegion);
  }

  async function handleRecommendOutfit() {
    if (!weather) return;

    setRecommendLoading(true);
    setRecommendError("");
    setRecommendation(null);

    try {
      const response = await fetch("/api/outfits/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regionLabel: selectedRegionLabel,
          weather: {
            ...weather,
            regionLabel: selectedRegionLabel,
          },
        }),
      });

      const payload = (await response.json()) as
        | { ok: true; data: RecommendationData }
        | { ok: false; error?: string };

      if (!response.ok || !payload.ok) {
        setRecommendError(payload.ok ? "" : payload.error || "코디 추천을 만들지 못했습니다.");
        return;
      }

      setRecommendation(payload.data);
    } catch {
      setRecommendError("코디 추천을 만들지 못했습니다.");
    } finally {
      setRecommendLoading(false);
    }
  }

  async function handleAiRecommendOutfit() {
    if (!weather) return;
    if (!aiComposerOpen) {
      setAiComposerOpen(true);
      setRecommendError("");
      return;
    }
    if (!aiComment.trim()) {
      setRecommendError("AI 추천을 위해 오늘 상황을 입력해 주세요.");
      return;
    }

    setAiRecommendLoading(true);
    setRecommendError("");
    setRecommendation(null);

    try {
      const response = await fetch("/api/outfits/recommend-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: aiComment.trim(),
          regionLabel: selectedRegionLabel,
          weather: {
            ...weather,
            regionLabel: selectedRegionLabel,
          },
        }),
      });

      const payload = (await response.json()) as
        | { ok: true; data: RecommendationData }
        | { ok: false; error?: string };

      if (!response.ok || !payload.ok) {
        setRecommendError(payload.ok ? "" : payload.error || "AI 추천을 만들지 못했습니다.");
        return;
      }

      setRecommendation(payload.data);
    } finally {
      setAiRecommendLoading(false);
    }
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
        className="dashboard-mobile-stack"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2rem",
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
            className="dashboard-mobile-panel"
            style={{
              display: "grid",
              gap: "1.5rem",
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
              {regionsLoading ? "지역 불러오는 중..." : selectedRegionLabel}
            </button>
            {isOpen ? (
              <div id="dashboard-region-panel" className="dash-region-panel">
                {/* 헤더 */}
                <div className="dash-region-hero">
                  <div className="dash-region-hero-left">
                    <p className="dash-weather-city">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      지역 선택
                    </p>
                    <strong className="dash-region-selected-label">
                      {draftRegionLabel}
                    </strong>
                  </div>
                  <div className="dash-region-hero-icon" aria-hidden="true">
                    <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor" opacity="0.18"/>
                    </svg>
                  </div>
                </div>

                {/* 셀렉트 행 */}
                <div className="dash-region-selects">
                  <label className="dash-region-field">
                    <span className="dash-weather-stat-label">시 / 도</span>
                    <span className="dashboard-region-select-wrap">
                      <select
                        className="dashboard-region-select"
                        value={draftSidoId}
                        onChange={(event) => handleSidoChange(event.target.value)}
                        disabled={regionsLoading || regions.length === 0}
                      >
                        <option value="">시/도 선택</option>
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
                  <label className="dash-region-field">
                    <span className="dash-weather-stat-label">시 / 군 / 구</span>
                    <span className="dashboard-region-select-wrap">
                      <select
                        className="dashboard-region-select"
                        value={draftSigunguId}
                        onChange={(event) => setDraftSigunguId(event.target.value)}
                        disabled={regionsLoading || !draftSidoId || draftSigunguOptions.length === 0}
                      >
                        <option value="">시/군/구 선택</option>
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

                {/* 확인 버튼 행 */}
                <div className="dash-region-footer">
                  {regionsError ? <p className="form-error" style={{ margin: 0 }}>{regionsError}</p> : null}
                  <button
                    type="button"
                    className="solid-button"
                    onClick={handleConfirmSelection}
                    disabled={!draftSidoId || !draftSigunguId}
                  >
                    이 지역으로 날씨 보기
                  </button>
                </div>
              </div>
            ) : null}
            {appliedSido && appliedSigungu && !isOpen ? (
              <div
                className="dashboard-weather-section"
                style={{
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.6rem",
                }}
              >
                {weatherLoading ? (
                  <p className="outfit-weather-message" style={{ margin: 0 }}>
                    날씨 정보를 불러오는 중입니다.
                  </p>
                ) : null}
                {weather ? (
                  <div className={`dash-weather-widget${weather.rain ? " is-rainy" : ""}`}>
                    <div className="dash-weather-hero">
                      <div className="dash-weather-hero-left">
                        <p className="dash-weather-city">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                          </svg>
                          {weather.city}
                        </p>
                        <strong className="dash-weather-temp">{formatTemperature(weather.current_temp)}</strong>
                        <p className="dash-weather-desc">{weather.desc}</p>
                        <p className="dash-weather-feels">체감 {formatTemperature(weather.feels_like)}</p>
                      </div>
                      <div className="dash-weather-hero-icon" aria-hidden="true">
                        {WeatherIcon ? <WeatherIcon size={72} /> : null}
                      </div>
                    </div>
                    <div className="dash-weather-stats">
                      <div className="dash-weather-stat">
                        <span className="dash-weather-stat-label">최저 / 최고</span>
                        <strong className="dash-weather-stat-value">
                          {weather.t_min.toFixed(0)}° / {weather.t_max.toFixed(0)}°
                        </strong>
                      </div>
                      <div className="dash-weather-stat">
                        <span className="dash-weather-stat-label">강수 확률</span>
                        <strong className="dash-weather-stat-value">{weather.precipitation_probability}%</strong>
                      </div>
                      <div className="dash-weather-stat">
                        <span className="dash-weather-stat-label">습도</span>
                        <strong className="dash-weather-stat-value">{weather.humidity}%</strong>
                      </div>
                    </div>
                  </div>
                ) : null}
                {weather && aiComposerOpen ? (
                  <div style={{ display: "grid", gap: "0.6rem", justifyItems: "center" }}>
                    <label>
                      <textarea
                        value={aiComment}
                        onChange={(event) => setAiComment(event.target.value)}
                        placeholder="오늘 어떤 느낌으로 입고싶나요?"
                        rows={3}
                        style={{
                          width: "min(100%, 38rem)",
                          minHeight: "5.8rem",
                          resize: "vertical",
                          borderRadius: "var(--radius-lg)",
                          border: "1px solid var(--line)",
                          background: "rgba(var(--surface-rgb), 0.55)",
                          color: "var(--foreground)",
                          padding: "0.95rem 1rem",
                          font: "inherit",
                        }}
                      />
                    </label>
                  </div>
                ) : null}
                {weather ? (
                  <div
                    className="dashboard-weather-action"
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: "0.8rem",
                      flexWrap: "wrap",
                      marginTop: "0.4rem",
                    }}
                  >
                    {!aiComposerOpen ? (
                      <button
                        type="button"
                        className="solid-button"
                        onClick={handleRecommendOutfit}
                        disabled={recommendLoading || aiRecommendLoading}
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.9rem" }}
                      >
                        {recommendLoading ? <RecommendLoader /> : null}
                        <span>{recommendLoading ? "무료 추천 중..." : "무료 추천"}</span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={handleAiRecommendOutfit}
                      disabled={recommendLoading || aiRecommendLoading}
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.9rem" }}
                    >
                      {aiRecommendLoading ? <RecommendLoader /> : null}
                      <span>
                        {aiRecommendLoading ? "AI 추천 중..." : aiComposerOpen ? "AI 추천 실행" : "AI 추천"}
                      </span>
                    </button>
                  </div>
                ) : null}
                {weatherError ? <p className="form-error">{weatherError}</p> : null}
              </div>
            ) : null}
            {appliedSido && appliedSigungu && !isOpen && (recommendError || recommendation) ? (
              <div
                style={{
                  width: "min(calc(100vw - 2rem), 56rem)",
                  display: "grid",
                  gap: "1.6rem",
                  textAlign: "left",
                }}
              >
                {recommendError ? <p className="form-error">{recommendError}</p> : null}
                {recommendation ? (
                  <div style={{ display: "grid", gap: "1.2rem" }}>
                    {recommendation.looks[0]?.title !== "single" ? (
                      <div className="rec-summary-card">
                        <strong style={{ fontSize: "0.88rem" }}>오늘의 추천 코디</strong>
                        <p>{todayLookSummary(recommendation)}</p>
                      </div>
                    ) : null}
                    {recommendation.looks.map((look, lookIndex) => (
                      <div key={`${look.title}-${lookIndex}`}>
                        {recommendation.looks.length > 1 ? (
                          <p className="rec-section-label">{lookLabel(look.title)}</p>
                        ) : null}
                        {(look.summary || look.reasons.length > 0) ? (
                          <div className="rec-look-header">
                            {look.summary ? (
                              <p className="rec-look-summary">{look.summary}</p>
                            ) : null}
                            {look.reasons.length > 0 ? (
                              <div className="rec-look-reasons">
                                {look.reasons.map((r, i) => (
                                  <span key={i} className="rec-look-reason-chip">{r}</span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {look.missingSlots.length > 0 ? (
                          <p style={{ margin: "0 0 0.8rem", fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                            부족한 카테고리: {look.missingSlots.map((s) => slotLabel(s as RecommendationPart["slot"])).join(", ")}
                          </p>
                        ) : null}
                        <div className="rec-pin-grid">
                          {[...look.parts]
                            .sort((a, b) => {
                              const order: RecommendationPart["slot"][] = ["Outer", "Top", "Bottom", "Shoes", "ACC"];
                              return order.indexOf(a.slot) - order.indexOf(b.slot);
                            })
                            .map((part) => {
                            const { brand, productName } = splitItemName(part.item.name);
                            return (
                              <div key={`${look.title}-${part.slot}-${part.item.id}`} className="rec-pin-card">
                                <div className="rec-pin-image">
                                  {part.item.image_path ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={part.item.image_path} alt={part.item.name} />
                                  ) : (
                                    <div className="rec-pin-placeholder">
                                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" stroke="currentColor" strokeWidth="1.5"/>
                                        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" opacity="0.5"/>
                                        <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                                      </svg>
                                      <span>이미지 없음</span>
                                    </div>
                                  )}
                                </div>
                                <div className="rec-pin-info">
                                  {brand ? <span className="rec-pin-brand">{brand}</span> : null}
                                  <p className="rec-pin-name">{productName || part.item.name}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
