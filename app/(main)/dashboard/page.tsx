import Link from "next/link";

import { DiaryIcon, StatsIcon, WardrobeIcon } from "@/components/common/icons";
import { requireAppUserContext } from "@/lib/app-user";
import { getDiaryFeedData } from "@/lib/queries/diary";
import { getStatsPageData } from "@/lib/queries/stats";

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

function getWeatherDirection(rainRatio: number, weatherTotal: number) {
  if (weatherTotal === 0) {
    return {
      title: "날씨 기반 아카이브를 시작해보세요",
      text: "날씨 정보와 함께 코디를 기록하면 맞춤 스타일 방향을 확인할 수 있어요.",
      chip: "예보 데이터 없음",
    };
  }

  if (rainRatio >= 55) {
    return {
      title: "방수 레이어 중심이 가장 안전해요",
      text: "최근 기록이 비 오는 날에 치우쳐 있어요. 구조감 있는 아우터와 습기에 강한 아이템을 우선해보세요.",
      chip: `비 비중 ${rainRatio}%`,
    };
  }

  if (rainRatio >= 25) {
    return {
      title: "유연한 아우터 중심으로 코디해보세요",
      text: "최근 기록은 맑은 날과 비 오는 날이 섞여 있어요. 빠르게 대응할 수 있는 재킷이나 가디건을 함께 돌려 입는 게 좋아요.",
      chip: `혼합 날씨 ${rainRatio}%`,
    };
  }

  return {
    title: "가벼운 스타일 조합을 활용해보세요",
    text: "최근 기록은 맑은 날 비중이 높아요. 가벼운 레이어링과 선명한 실루엣을 시도하기 좋은 구간이에요.",
    chip: `맑음 비중 ${100 - rainRatio}%`,
  };
}

export default async function DashboardPage() {
  const { appUserId } = await requireAppUserContext();
  const [stats, recentPosts] = await Promise.all([getStatsPageData(appUserId), getDiaryFeedData(appUserId, 3)]);
  const weatherDirection = getWeatherDirection(stats.rainRatio, stats.weatherTotal);

  return (
    <section className="dashboard-page" aria-label="대시보드">
      <header className="dashboard-bento-header">
        <div>
          <p className="dashboard-kicker">대시보드</p>
          <h1>스타일 컨트롤 센터</h1>
          <p>아카이브, 코디 기록, 옷장 효율을 한눈에 확인하세요.</p>
        </div>
        <div className="dashboard-chip-row" aria-label="대시보드 합계">
          <span>아이템 {formatCount(stats.totalItems)}</span>
          <span>코디 {formatCount(stats.totalOutfits)}</span>
          <span>사진 {formatCount(stats.totalPhotos)}</span>
        </div>
      </header>

      <div className="dashboard-bento-grid">
        <article className="dashboard-bento-card dashboard-bento-card-lg">
          <div className="dashboard-card-head">
            <div className="dashboard-card-icon">
              <DiaryIcon size={18} />
            </div>
            <div>
              <p className="dashboard-card-eyebrow">날씨 기반 추천</p>
              <h2>{weatherDirection.title}</h2>
            </div>
          </div>
          <p className="dashboard-card-copy">{weatherDirection.text}</p>
          <div className="dashboard-hero-metrics">
            <div>
              <strong>{stats.rainRatio}%</strong>
              <span>강수 비율</span>
            </div>
            <div>
              <strong>{stats.clearCount}</strong>
              <span>맑은 날 기록</span>
            </div>
            <div>
              <strong>{stats.weatherTotal}</strong>
              <span>날씨 기록</span>
            </div>
          </div>
          <div className="dashboard-card-actions">
            <span className="dashboard-status-chip">{weatherDirection.chip}</span>
            <Link href="/diary" className="solid-button">
              아카이브 열기
            </Link>
          </div>
        </article>

        <article className="dashboard-bento-card">
          <div className="dashboard-card-head">
            <div className="dashboard-card-icon">
              <WardrobeIcon size={18} />
            </div>
            <div>
              <p className="dashboard-card-eyebrow">옷장 활용도</p>
              <h2>옷장 효율 스냅샷</h2>
            </div>
          </div>
          <div className="dashboard-stat-stack">
            <div className="dashboard-stat-row">
              <span>효율</span>
              <strong>{stats.efficiencyRate}%</strong>
            </div>
            <div className="dashboard-progress">
              <span style={{ width: `${stats.efficiencyRate}%` }} />
            </div>
            <div className="dashboard-stat-row">
              <span>큐레이션 수준</span>
              <strong>{stats.curationPercent}%</strong>
            </div>
            <div className="dashboard-progress">
              <span style={{ width: `${stats.curationPercent}%` }} />
            </div>
            <div className="dashboard-stat-row">
              <span>상위 카테고리</span>
              <strong>{toCategoryLabel(stats.topCategory)}</strong>
            </div>
          </div>
        </article>

        <article className="dashboard-bento-card">
          <div className="dashboard-card-head">
            <div className="dashboard-card-icon">
              <StatsIcon size={18} />
            </div>
            <div>
              <p className="dashboard-card-eyebrow">상위 착용 순위</p>
              <h2>가장 자주 입은 아이템</h2>
            </div>
          </div>
          <div className="dashboard-rank-list">
            {stats.topItems.length > 0 ? (
              stats.topItems.slice(0, 5).map((item, index) => (
                <div key={item.id} className="dashboard-rank-item">
                  <span className="dashboard-rank-index">0{index + 1}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{toCategoryLabel(item.category)}</small>
                  </div>
                  <em>{item.count}회</em>
                </div>
              ))
            ) : (
              <p className="dashboard-empty-text">아직 착용 순위 데이터가 없어요.</p>
            )}
          </div>
        </article>

        <article className="dashboard-bento-card dashboard-bento-card-wide">
          <div className="dashboard-card-head">
            <div className="dashboard-card-icon">
              <DiaryIcon size={18} />
            </div>
            <div>
              <p className="dashboard-card-eyebrow">최근 코디 스냅샷</p>
              <h2>최근 기록</h2>
            </div>
          </div>
          <div className="dashboard-shot-grid">
            {recentPosts.length > 0 ? (
              recentPosts.map((post) => (
                <Link key={post.photo_id} href="/diary" className="dashboard-shot-card">
                  {post.photo_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.photo_path} alt={post.note || "코디 스냅샷"} />
                  ) : (
                    <div className="dashboard-shot-fallback">이미지 없음</div>
                  )}
                  <div className="dashboard-shot-meta">
                    <strong>{post.note || "코디 기록"}</strong>
                    <span>{post.date}</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="dashboard-empty-state">
                <p>최근 코디 스냅샷이 아직 없어요.</p>
                <Link href="/outfits/new" className="ghost-button">
                  첫 코디 만들기
                </Link>
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
