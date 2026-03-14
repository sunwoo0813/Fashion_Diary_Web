import Link from "next/link";

import { requireAppUserContext } from "@/lib/app-user";
import TopItemsHoverGallery from "@/components/stats/top-items-hover-gallery";
import { getStatsPageData } from "@/lib/queries/stats";

function ratioPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(8, Math.round((value / max) * 100));
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatWearDate(value: string | null): string {
  if (!value) return "아직 착용 기록 없음";
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

  return (
    <section className="stats-next-page">
      <header className="stats-report-header">
        <div>
          <h1>리포트</h1>
          <p className="stats-report-copy">
            자주 입는 옷, 거의 안 입는 옷, 카테고리별 활용도를 한눈에 확인하는 페이지입니다.
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
            <small>착용 기록 있는 아이템</small>
            <strong>{stats.activeItemRate}%</strong>
          </div>
          <div>
            <small>최근 30일 착용 아이템</small>
            <strong>{formatCount(stats.recentActiveItemCount)}</strong>
          </div>
        </div>
      </header>

      <div className="stats-report-layout">
        <section className="stats-report-section">
          <div className="stats-report-section-head">
            <h2>최근 30일 자주 입은 옷</h2>
            <span>상위 5개</span>
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
            <h2>오래 안 입은 옷</h2>
            <span>정리 우선순위</span>
          </div>
          {stats.dormantItems.length > 0 ? (
            <div className="stats-report-rows">
              {stats.dormantItems.map((item) => (
                <div key={item.id} className="stats-report-row">
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
            <p className="stats-report-muted">보여줄 아이템이 없어요.</p>
          )}
        </section>

        <section className="stats-report-section">
          <div className="stats-report-section-head">
            <h2>카테고리별 보유와 착용</h2>
            <span>착용 수는 누적 기록 기준</span>
          </div>
          <div className="stats-report-category-list">
            {stats.categorySorted.map((row) => (
              <div key={row.category} className="stats-report-category-row">
                <div className="stats-report-category-copy">
                  <p>{toCategoryLabel(row.category)}</p>
                  <small>보유 {row.ownedCount}</small>
                </div>
                <div className="stats-report-bar">
                  <span style={{ width: `${ratioPercent(row.wearCount, Math.max(1, row.ownedCount * 4))}%` }} />
                </div>
                <strong>{row.wearCount}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
