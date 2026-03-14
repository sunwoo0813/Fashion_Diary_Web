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
  summary: string;
  context: {
    effectiveTemp: number;
    tempBand: string;
    isRainy: boolean;
    regionLabel: string;
  };
  parts: RecommendationPart[];
  missingSlots: string[];
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
    ? getWeatherIconComponent(weather.desc, weather.precipitation_type, weather.precipitation_amount)
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

    setAppliedSidoId(draftSidoId);
    setAppliedSigunguId(draftSigunguId);
    setPreferredRegion(nextPreferredRegion);
    setWeather(null);
    setWeatherError("");
    setRecommendation(null);
    setRecommendError("");
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
              <div
                id="dashboard-region-panel"
                className="outfit-weather-panel"
                style={{
                  width: "min(100%, 32rem)",
                  textAlign: "center",
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
                        disabled={regionsLoading || !draftSidoId || draftSigunguOptions.length === 0}
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
                style={{
                  width: "min(100%, 72rem)",
                  textAlign: "left",
                  display: "grid",
                  gap: "1.6rem",
                }}
              >
                {weatherLoading ? (
                  <p className="outfit-weather-message" style={{ margin: 0 }}>
                    날씨 정보를 불러오는 중입니다.
                  </p>
                ) : null}
                {weather ? (
                  <div
                    className="dashboard-weather-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                      gap: "1.3rem",
                    }}
                  >
                    <div
                      className="dashboard-weather-card"
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: "12px",
                        padding: "1.6rem",
                        background: "rgba(var(--surface-rgb), 0.55)",
                        textAlign: "center",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: "0.5rem", textAlign: "center" }}>
                        현재 날씨 상태
                      </strong>
                      <div
                        className="dashboard-weather-current"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "1.4rem",
                        }}
                      >
                        {WeatherIcon ? <WeatherIcon size={42} /> : null}
                        <span className="outfit-weather-message" style={{ margin: 0 }}>
                          {weather.desc}
                        </span>
                      </div>
                    </div>
                    <div
                      className="dashboard-weather-card"
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: "12px",
                        padding: "1.6rem",
                        background: "rgba(var(--surface-rgb), 0.55)",
                        textAlign: "center",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: "0.3rem", textAlign: "center" }}>
                        현재 기온
                      </strong>
                      <span className="outfit-weather-message" style={{ margin: 0 }}>
                        {formatTemperature(weather.current_temp)}
                      </span>
                    </div>
                    <div
                      className="dashboard-weather-card"
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: "12px",
                        padding: "1.6rem",
                        background: "rgba(var(--surface-rgb), 0.55)",
                        textAlign: "center",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: "0.3rem", textAlign: "center" }}>
                        체감 온도
                      </strong>
                      <span className="outfit-weather-message" style={{ margin: 0 }}>
                        {formatTemperature(weather.feels_like)}
                      </span>
                    </div>
                    <div
                      className="dashboard-weather-card"
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: "12px",
                        padding: "1.6rem",
                        background: "rgba(var(--surface-rgb), 0.55)",
                        textAlign: "center",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: "0.3rem", textAlign: "center" }}>
                        최저 / 최고 기온
                      </strong>
                      <span className="outfit-weather-message" style={{ margin: 0 }}>
                        {formatTemperature(weather.t_min)} / {formatTemperature(weather.t_max)}
                      </span>
                    </div>
                    <div
                      className="dashboard-weather-card"
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: "12px",
                        padding: "1.6rem",
                        background: "rgba(var(--surface-rgb), 0.55)",
                        textAlign: "center",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: "0.3rem", textAlign: "center" }}>
                        강수 정보
                      </strong>
                      <span className="outfit-weather-message" style={{ margin: 0 }}>
                        {weather.precipitation_type} / {weather.precipitation_probability}% / {weather.precipitation_amount}
                      </span>
                    </div>
                  </div>
                ) : null}
                {weather ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      marginTop: "0.4rem",
                    }}
                  >
                    <button
                      type="button"
                      className="solid-button"
                      onClick={handleRecommendOutfit}
                      disabled={recommendLoading}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.9rem",
                      }}
                    >
                      {recommendLoading ? <RecommendLoader /> : null}
                      <span>{recommendLoading ? "코디 추천 중..." : "코디 추천"}</span>
                    </button>
                  </div>
                ) : null}
                {recommendError ? <p className="form-error">{recommendError}</p> : null}
                {recommendation ? (
                  <div
                    style={{
                      display: "grid",
                      gap: "1.6rem",
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: "16px",
                        padding: "2rem",
                        background: "rgba(var(--surface-rgb), 0.68)",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: "0.45rem" }}>추천 코디</strong>
                      <p className="outfit-weather-message" style={{ margin: 0 }}>
                        {recommendation.summary}
                      </p>
                      {recommendation.missingSlots.length > 0 ? (
                        <p className="outfit-weather-message" style={{ margin: "0.55rem 0 0" }}>
                          부족한 카테고리: {recommendation.missingSlots.map((slot) => slotLabel(slot as RecommendationPart["slot"])).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "1.5rem",
                      }}
                    >
                      {recommendation.parts.map((part) => (
                        <div
                          key={`${part.slot}-${part.item.id}`}
                          style={{
                            border: "1px solid var(--line)",
                            borderRadius: "14px",
                            padding: "1.7rem",
                            background: "rgba(var(--surface-rgb), 0.6)",
                            display: "grid",
                            gap: "1.1rem",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--muted-foreground)",
                            }}
                          >
                            {slotLabel(part.slot)}
                          </span>
                          {part.item.image_path ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={part.item.image_path}
                              alt={part.item.name}
                              style={{
                                width: "100%",
                                aspectRatio: "4 / 5",
                                objectFit: "cover",
                                borderRadius: "12px",
                                border: "1px solid var(--line)",
                              }}
                            />
                          ) : null}
                          <div style={{ display: "grid", gap: "0.4rem" }}>
                            <strong>{part.item.name}</strong>
                            <span className="outfit-weather-message" style={{ margin: 0 }}>
                              {[part.item.detail_category, part.item.color, part.item.thickness]
                                .filter(Boolean)
                                .join(" / ") || "기본 추천"}
                            </span>
                          </div>
                          {part.reasons.length > 0 ? (
                            <div style={{ display: "grid", gap: "0.36rem" }}>
                              {part.reasons.map((reason) => (
                                <span key={reason} className="outfit-weather-message" style={{ margin: 0 }}>
                                  {reason}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {weatherError ? <p className="form-error">{weatherError}</p> : null}
              </div>
            ) : null}
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
