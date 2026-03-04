import Link from "next/link";

import { requireAppUserContext } from "@/lib/app-user";
import { getStatsPageData } from "@/lib/queries/stats";

function ratioPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(6, Math.round((value / max) * 100));
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function toCategoryLabel(category: string | null): string {
  const value = String(category || "").trim().toLowerCase();
  if (!value) return "미분류";
  if (["outerwear", "아우터"].includes(value)) return "아우터";
  if (["top", "tops", "상의"].includes(value)) return "상의";
  if (["bottom", "bottoms", "하의"].includes(value)) return "하의";
  if (["footwear", "신발"].includes(value)) return "신발";
  if (["accessories", "accessory", "액세서리"].includes(value)) return "액세서리";
  return category || "미분류";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const DONUT_COLORS = ["#1ED760", "#45E07B", "#74E89A", "#A4F0B9", "#D2F8D7", "#EAFCEC"];

function buildDonutGradient(items: Array<{ category: string; count: number }>): string {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  if (total <= 0) {
    return "conic-gradient(#282828 0deg 360deg)";
  }

  let currentAngle = 0;
  const segments = items.map((item, index) => {
    const slice = (item.count / total) * 360;
    const start = currentAngle;
    const end = currentAngle + slice;
    currentAngle = end;
    return `${DONUT_COLORS[index % DONUT_COLORS.length]} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

export default async function StatsPage() {
  const { appUserId } = await requireAppUserContext();
  const stats = await getStatsPageData(appUserId);
  const diaryHref = `/diary/${todayIso()}`;
  const categoryLegend = stats.categorySorted.slice(0, 6);
  const donutGradient = buildDonutGradient(categoryLegend);

  return (
    <section className="stats-next-page">
      <header className="stats-next-header">
        <div>
          <p className="diary-kicker">분석 및 트렌드</p>
          <h1>옷장 인사이트</h1>
          <p>
            {stats.currentYear}년 코디 기록, 태그, 날씨 데이터를 기반으로 한 요약입니다.
          </p>
        </div>
        <div className="stats-next-head-metrics">
          <span>아이템 {formatCount(stats.totalItems)}</span>
          <span>코디 {formatCount(stats.totalOutfits)}</span>
          <span>사진 {formatCount(stats.totalPhotos)}</span>
          <span>강수 비율 {stats.rainRatio}%</span>
        </div>
      </header>

      <div className="stats-next-grid">
        <article className="stats-next-card stats-next-top">
          <div className="stats-next-card-head">
            <h2>가장 자주 입은 상위 5개</h2>
            <span>최근 30일</span>
          </div>
          {stats.topItems.length > 0 ? (
            <div className="stats-next-top-grid">
              {stats.topItems.map((item) => (
                <div key={item.id} className="stats-next-top-item">
                  <div className="stats-next-top-photo">
                    {item.image_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_path} alt={item.name} />
                    ) : (
                      <div className="stats-next-top-photo-empty">사진 없음</div>
                    )}
                  </div>
                  <p>{item.name}</p>
                  <small>{item.count}회 착용</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="stats-next-empty">
              <p>아직 착용 데이터가 없어요.</p>
              <Link href="/outfits/new" className="solid-button">
                오늘 코디 추가
              </Link>
            </div>
          )}
        </article>

        <article className="stats-next-card stats-next-month">
          <div className="stats-next-card-head">
            <h2>월별 스타일 추이</h2>
            <span>{stats.currentYear}</span>
          </div>
          <div className="stats-next-month-bars">
            {stats.monthPairs.map((pair) => (
              <div key={pair.label} className="stats-next-month-col">
                <div className="stats-next-month-track">
                  <span style={{ height: `${ratioPercent(pair.count, stats.maxMonthCount)}%` }} />
                </div>
                <small>{pair.label}</small>
              </div>
            ))}
          </div>
          <div className="stats-next-summary-row">
            <div>
              <strong>{formatCount(stats.totalOutfits)}</strong>
              <small>기록된 코디</small>
            </div>
            <div>
              <strong>{stats.efficiencyRate}%</strong>
              <small>효율 지수</small>
            </div>
            <div>
              <strong>{stats.curationPercent}%</strong>
              <small>큐레이션 수준</small>
            </div>
          </div>
        </article>

        <article className="stats-next-card">
          <div className="stats-next-card-head">
            <h2>카테고리 집중도</h2>
            <span>상위 {Math.min(stats.categorySorted.length, 6)}</span>
          </div>
          {stats.categorySorted.length > 0 ? (
            <div className="stats-next-donut-wrap">
              <div className="stats-next-donut-card">
                <div className="stats-next-donut" style={{ backgroundImage: donutGradient }}>
                  <div className="stats-next-donut-hole">
                    <strong>{categoryLegend.length}</strong>
                    <span>구간</span>
                  </div>
                </div>
              </div>
              <div className="stats-next-list">
                {categoryLegend.map((row, index) => (
                  <div key={row.category} className="stats-next-row stats-next-row-donut">
                    <p>
                      <span
                        className="stats-next-dot"
                        style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                      />
                      {toCategoryLabel(row.category)}
                    </p>
                    <div className="stats-next-progress">
                      <span style={{ width: `${ratioPercent(row.count, stats.totalItems || 1)}%` }} />
                    </div>
                    <small>{row.count}</small>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="stats-next-muted">아이템이 아직 없어요.</p>
          )}
        </article>

        <article className="stats-next-card">
          <div className="stats-next-card-head">
            <h2>날씨 분포</h2>
            <span>{stats.weatherTotal}개 코디</span>
          </div>
          <div className="stats-next-weather-summary">
            <p>비 {stats.rainCount}</p>
            <p>맑음 {stats.clearCount}</p>
            <p>강수 비율 {stats.rainRatio}%</p>
          </div>
          <div className="stats-next-list">
            {stats.tempBuckets.map((bucket) => (
              <div key={bucket.label} className="stats-next-row">
                <p>{bucket.label}</p>
                <div className="stats-next-progress">
                  <span style={{ width: `${ratioPercent(bucket.count, stats.maxTempCount)}%` }} />
                </div>
                <small>{bucket.count}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="stats-next-card stats-next-highlight">
          <h2>스타일 아카이브</h2>
          <p>
            대표 카테고리는 <strong>{toCategoryLabel(stats.topCategory)}</strong>이며, {stats.currentYear}년에{" "}
            {formatCount(stats.totalOutfits)}개의 코디가 기록되었어요.
          </p>
          <div className="stats-next-actions">
            <Link href={diaryHref} className="ghost-button">
              다이어리 보기
            </Link>
            <Link href="/wardrobe" className="ghost-button">
              옷장 열기
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
