import Link from "next/link";

import TopItemsHoverGallery from "@/components/stats/top-items-hover-gallery";
import { requireAppUserContext } from "@/lib/app-user";
import { getStatsPageData } from "@/lib/queries/stats";

function ratioPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(8, Math.round((value / max) * 100));
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatWearDate(value: string | null): string {
  if (!value) return "착용 기록 없음";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toCategoryLabel(category: string | null): string {
  const value = String(category || "").trim().toLowerCase();
  if (!value) return "미분류";
  if (["outerwear", "outer", "아우터"].includes(value)) return "아우터";
  if (["top", "tops", "상의"].includes(value)) return "상의";
  if (["bottom", "bottoms", "하의"].includes(value)) return "하의";
  if (["footwear", "shoes", "신발"].includes(value)) return "신발";
  if (["accessories", "accessory", "acc", "액세서리"].includes(value)) return "액세서리";
  return category || "미분류";
}

export default async function StatsPage() {
  const { appUserId } = await requireAppUserContext();
  const stats = await getStatsPageData(appUserId);

  const maxCategoryWear = Math.max(...stats.categorySorted.map((r) => r.wearCount), 1);

  return (
    <section className="stats-next-page">
      <header className="stats-report-header">
        <div>
          <h1>리포트</h1>
          <p className="stats-report-copy">
            자주 입는 옷과 손이 덜 가는 옷을 나눠 보고, 카테고리별 착용 흐름을 한눈에 확인해 보세요.
          </p>
        </div>
        <div className="stats-report-summary">
          <div>
            <small>보유 아이템</small>
            <strong>{formatCount(stats.totalItems)}</strong>
          </div>
          <div>
            <small>코디 기록</small>
            <strong>{formatCount(stats.totalOutfits)}</strong>
          </div>
          <div>
            <small>활성 아이템</small>
            <strong>{stats.activeItemRate}%</strong>
            <span className="stats-summary-sub">한 번 이상 착용</span>
          </div>
          <div className={stats.dormantItemCount > 0 ? "is-warning" : ""}>
            <small>안 입는 옷</small>
            <strong>{formatCount(stats.dormantItemCount)}</strong>
            <span className="stats-summary-sub">착용 기록 없음</span>
          </div>
        </div>
      </header>

      <div className="stats-report-layout">
        <section className="stats-report-section">
          <div className="stats-report-section-head">
            <h2>자주 입은 옷 TOP 5</h2>
            <span>최근 30일 기준</span>
          </div>
          {stats.topItems.length > 0 ? (
            <TopItemsHoverGallery items={stats.topItems} />
          ) : (
            <div className="stats-report-empty">
              <p>아직 코디 기록이 없어요.</p>
              <Link href="/outfits/new" className="solid-button">
                오늘 코디 기록하기
              </Link>
            </div>
          )}
        </section>

        <section className="stats-report-section">
          <div className="stats-report-section-head">
            <h2>잠자는 옷</h2>
            <span>정리 우선순위 상위 5개</span>
          </div>
          {stats.dormantItems.length > 0 ? (
            <div className="stats-report-rows">
              {stats.dormantItems.map((item) => (
                <div key={item.id} className="stats-report-row">
                  <div className="stats-dormant-thumb">
                    {item.image_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_path} alt={item.name} />
                    ) : (
                      <div className="stats-dormant-thumb-fallback">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor" opacity="0.3"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <p>{item.name}</p>
                    <small>{toCategoryLabel(item.category)}</small>
                  </div>
                  <div className="stats-report-row-meta">
                    <strong>{item.wearCount}회</strong>
                    <span>{formatWearDate(item.recentWearDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="stats-report-muted">지금은 따로 정리할 아이템이 없어요.</p>
          )}
        </section>

        <section className="stats-report-section">
          <div className="stats-report-section-head">
            <h2>카테고리별 착용 분포</h2>
            <span>누적 착용 기록 기준</span>
          </div>
          <div className="stats-report-category-list">
            {stats.categorySorted.map((row) => (
              <div key={row.category} className="stats-report-category-row">
                <div className="stats-report-category-copy">
                  <p>{toCategoryLabel(row.category)}</p>
                  <small>보유 {row.ownedCount}개</small>
                </div>
                <div className="stats-report-bar">
                  <span style={{ width: `${ratioPercent(row.wearCount, maxCategoryWear)}%` }} />
                </div>
                <div className="stats-category-meta">
                  <strong>{row.wearCount}회</strong>
                  <small>평균 {row.ownedCount > 0 ? (row.wearCount / row.ownedCount).toFixed(1) : "0"}회</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
