import Link from "next/link";

import { DiaryIcon, StatsIcon, WardrobeIcon } from "@/components/common/icons";
import { requireAppUserContext } from "@/lib/app-user";
import { getDiaryFeedData } from "@/lib/queries/diary";
import { getStatsPageData } from "@/lib/queries/stats";

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function getWeatherDirection(rainRatio: number, weatherTotal: number) {
  if (weatherTotal === 0) {
    return {
      title: "Start your weather-based archive",
      text: "Log a few outfits with weather details to unlock AI-like outfit direction.",
      chip: "No forecast data",
    };
  }

  if (rainRatio >= 55) {
    return {
      title: "Water-resistant layers are your safest move",
      text: "Recent logs skew rainy. Prioritize structured outerwear, darker footwear, and pieces that recover well after moisture.",
      chip: `Rain-heavy ${rainRatio}%`,
    };
  }

  if (rainRatio >= 25) {
    return {
      title: "Build looks with a flexible outer layer",
      text: "Your recent pattern mixes clear and wet days. Keep one adaptable jacket or cardigan in rotation for quick shifts.",
      chip: `Mixed weather ${rainRatio}%`,
    };
  }

  return {
    title: "Lean into lighter styling combinations",
    text: "Recent entries are mostly clear. This is a strong window for cleaner layering, sharper silhouettes, and lighter texture play.",
    chip: `Clear dominant ${100 - rainRatio}%`,
  };
}

export default async function DashboardPage() {
  const { appUserId } = await requireAppUserContext();
  const [stats, recentPosts] = await Promise.all([getStatsPageData(appUserId), getDiaryFeedData(appUserId, 3)]);
  const weatherDirection = getWeatherDirection(stats.rainRatio, stats.weatherTotal);

  return (
    <section className="dashboard-page" aria-label="Dashboard">
      <header className="dashboard-bento-header">
        <div>
          <p className="dashboard-kicker">Dashboard</p>
          <h1>Style Control Center</h1>
          <p>Your archive, outfit memory, and closet efficiency in one dark-mode overview.</p>
        </div>
        <div className="dashboard-chip-row" aria-label="Dashboard totals">
          <span>Items {formatCount(stats.totalItems)}</span>
          <span>Outfits {formatCount(stats.totalOutfits)}</span>
          <span>Photos {formatCount(stats.totalPhotos)}</span>
        </div>
      </header>

      <div className="dashboard-bento-grid">
        <article className="dashboard-bento-card dashboard-bento-card-lg">
          <div className="dashboard-card-head">
            <div className="dashboard-card-icon">
              <DiaryIcon size={18} />
            </div>
            <div>
              <p className="dashboard-card-eyebrow">Weather-Based Recommendation</p>
              <h2>{weatherDirection.title}</h2>
            </div>
          </div>
          <p className="dashboard-card-copy">{weatherDirection.text}</p>
          <div className="dashboard-hero-metrics">
            <div>
              <strong>{stats.rainRatio}%</strong>
              <span>Rain ratio</span>
            </div>
            <div>
              <strong>{stats.clearCount}</strong>
              <span>Clear-day logs</span>
            </div>
            <div>
              <strong>{stats.weatherTotal}</strong>
              <span>Weather entries</span>
            </div>
          </div>
          <div className="dashboard-card-actions">
            <span className="dashboard-status-chip">{weatherDirection.chip}</span>
            <Link href="/diary" className="solid-button">
              Open Archive
            </Link>
          </div>
        </article>

        <article className="dashboard-bento-card">
          <div className="dashboard-card-head">
            <div className="dashboard-card-icon">
              <WardrobeIcon size={18} />
            </div>
            <div>
              <p className="dashboard-card-eyebrow">Closet Utilization</p>
              <h2>Wardrobe efficiency snapshot</h2>
            </div>
          </div>
          <div className="dashboard-stat-stack">
            <div className="dashboard-stat-row">
              <span>Efficiency</span>
              <strong>{stats.efficiencyRate}%</strong>
            </div>
            <div className="dashboard-progress">
              <span style={{ width: `${stats.efficiencyRate}%` }} />
            </div>
            <div className="dashboard-stat-row">
              <span>Curation level</span>
              <strong>{stats.curationPercent}%</strong>
            </div>
            <div className="dashboard-progress">
              <span style={{ width: `${stats.curationPercent}%` }} />
            </div>
            <div className="dashboard-stat-row">
              <span>Top category</span>
              <strong>{stats.topCategory}</strong>
            </div>
          </div>
        </article>

        <article className="dashboard-bento-card">
          <div className="dashboard-card-head">
            <div className="dashboard-card-icon">
              <StatsIcon size={18} />
            </div>
            <div>
              <p className="dashboard-card-eyebrow">Top Rotation</p>
              <h2>Most worn items</h2>
            </div>
          </div>
          <div className="dashboard-rank-list">
            {stats.topItems.length > 0 ? (
              stats.topItems.slice(0, 5).map((item, index) => (
                <div key={item.id} className="dashboard-rank-item">
                  <span className="dashboard-rank-index">0{index + 1}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.category || "Uncategorized"}</small>
                  </div>
                  <em>{item.count}x</em>
                </div>
              ))
            ) : (
              <p className="dashboard-empty-text">No wear ranking yet.</p>
            )}
          </div>
        </article>

        <article className="dashboard-bento-card dashboard-bento-card-wide">
          <div className="dashboard-card-head">
            <div className="dashboard-card-icon">
              <DiaryIcon size={18} />
            </div>
            <div>
              <p className="dashboard-card-eyebrow">Recent OOTD Snapshot</p>
              <h2>Latest archive moments</h2>
            </div>
          </div>
          <div className="dashboard-shot-grid">
            {recentPosts.length > 0 ? (
              recentPosts.map((post) => (
                <Link key={post.photo_id} href="/diary" className="dashboard-shot-card">
                  {post.photo_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.photo_path} alt={post.note || "OOTD snapshot"} />
                  ) : (
                    <div className="dashboard-shot-fallback">No image</div>
                  )}
                  <div className="dashboard-shot-meta">
                    <strong>{post.note || "Outfit entry"}</strong>
                    <span>{post.date}</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="dashboard-empty-state">
                <p>No recent OOTD snapshots yet.</p>
                <Link href="/outfits/new" className="ghost-button">
                  Create first look
                </Link>
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
