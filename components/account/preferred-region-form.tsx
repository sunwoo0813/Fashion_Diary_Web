"use client";

import { useEffect, useMemo, useState } from "react";

import type { PreferredRegion } from "@/lib/user-preferences";

type RegionOption = {
  id: string;
  name: string;
};

type RegionGroup = {
  id: string;
  name: string;
  children: RegionOption[];
};

function regionLabel(group?: RegionGroup, option?: RegionOption): string {
  if (!group || !option) return "기본 지역이 아직 설정되지 않았어요.";
  if (group.name === option.name) return option.name;
  return `${group.name} ${option.name}`;
}

export function PreferredRegionForm() {
  const [regions, setRegions] = useState<RegionGroup[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionsError, setRegionsError] = useState("");
  const [preferredRegion, setPreferredRegion] = useState<PreferredRegion | null>(null);
  const [preferredRegionLoading, setPreferredRegionLoading] = useState(true);
  const [draftSidoId, setDraftSidoId] = useState("");
  const [draftSigunguId, setDraftSigunguId] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const draftSido = useMemo(
    () => regions.find((region) => region.id === draftSidoId),
    [regions, draftSidoId],
  );
  const draftSigunguOptions = useMemo(() => draftSido?.children ?? [], [draftSido]);
  const draftSigungu = useMemo(
    () => draftSigunguOptions.find((region) => region.id === draftSigunguId),
    [draftSigunguId, draftSigunguOptions],
  );
  const currentSido = useMemo(
    () => regions.find((region) => region.id === preferredRegion?.sidoId),
    [preferredRegion, regions],
  );
  const currentSigungu = useMemo(
    () => currentSido?.children.find((region) => region.id === preferredRegion?.sigunguId),
    [currentSido, preferredRegion],
  );

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
          setRegionsError("지역 목록을 불러오지 못했어요.");
          return;
        }

        setRegions(payload.data);
      } catch {
        if (!active) return;
        setRegions([]);
        setRegionsError("지역 목록을 불러오지 못했어요.");
      } finally {
        if (active) {
          setRegionsLoading(false);
        }
      }
    }

    async function fetchPreferredRegion() {
      setPreferredRegionLoading(true);

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
          setPreferredRegionLoading(false);
        }
      }
    }

    void Promise.all([fetchRegions(), fetchPreferredRegion()]);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (regions.length === 0 || !preferredRegion) return;

    setDraftSidoId((current) => current || preferredRegion.sidoId);
    setDraftSigunguId((current) => current || preferredRegion.sigunguId);
  }, [preferredRegion, regions]);

  function handleSidoChange(value: string) {
    setDraftSidoId(value);
    setDraftSigunguId("");
    setSaveMessage("");
    setSaveError("");
  }

  async function handleSave() {
    if (!draftSidoId || !draftSigunguId) {
      setSaveError("시/도와 시/군/구를 모두 선택해 주세요.");
      setSaveMessage("");
      return;
    }

    setSaveLoading(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const response = await fetch("/api/account/preferred-region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredRegion: {
            sidoId: draftSidoId,
            sigunguId: draftSigunguId,
          },
        }),
      });

      const payload = (await response.json()) as
        | { ok: true; data: PreferredRegion | null }
        | { ok: false; error?: string };

      if (!response.ok || !payload.ok || !payload.data) {
        setSaveError("기본 지역을 저장하지 못했어요.");
        return;
      }

      setPreferredRegion(payload.data);
      setSaveMessage("기본 지역을 저장했어요. 다음 로그인부터 자동으로 적용됩니다.");
    } catch {
      setSaveError("기본 지역을 저장하지 못했어요.");
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <article className="account-card">
      <div className="account-card-head">
        <div>
          <h2>기본 지역</h2>
          <p className="account-card-copy">오뭐입?과 코디 기록에서 이 지역의 날씨를 먼저 보여줍니다.</p>
        </div>
      </div>

      <div className="account-region-current">
        <span>현재 설정</span>
        <strong>{preferredRegionLoading ? "불러오는 중..." : regionLabel(currentSido, currentSigungu)}</strong>
      </div>

      <div className="account-region-grid">
        <label className="account-region-field">
          <span>시/도</span>
          <select
            value={draftSidoId}
            onChange={(event) => handleSidoChange(event.target.value)}
            disabled={regionsLoading || saveLoading}
          >
            <option value="">시/도를 선택해 주세요</option>
            {regions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>

        <label className="account-region-field">
          <span>시/군/구</span>
          <select
            value={draftSigunguId}
            onChange={(event) => {
              setDraftSigunguId(event.target.value);
              setSaveMessage("");
              setSaveError("");
            }}
            disabled={!draftSidoId || draftSigunguOptions.length === 0 || saveLoading}
          >
            <option value="">시/군/구를 선택해 주세요</option>
            {draftSigunguOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {regionsError ? <p className="form-error">{regionsError}</p> : null}
      {saveError ? <p className="form-error">{saveError}</p> : null}
      {saveMessage ? <p className="account-success">{saveMessage}</p> : null}

      <div className="account-region-actions">
        <button type="button" className="solid-button" onClick={handleSave} disabled={saveLoading || regionsLoading}>
          {saveLoading ? "저장 중..." : "기본 지역 저장"}
        </button>
      </div>

      <p className="account-region-preview">{regionLabel(draftSido, draftSigungu)}</p>
    </article>
  );
}
