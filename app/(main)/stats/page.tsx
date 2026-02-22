import Link from "next/link";

import { requireAppUserContext } from "@/lib/app-user";
import { getStatsPageData } from "@/lib/queries/stats";

function ratioPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(6, Math.round((value / max) * 100));
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function StatsPage() {
  const { appUserId } = await requireAppUserContext();
  const stats = await getStatsPageData(appUserId);
  const diaryHref = `/diary/${todayIso()}`;

  return (
    <section className="stats-next-page">
      <header className="stats-next-header">
        <div>
          <p className="diary-kicker">Analytics &amp; Trends</p>
          <h1>Wardrobe Insights</h1>
          <p>
            {stats.currentYear} summary based on your logged outfits, tags, and weather records.
          </p>
        </div>
        <div className="stats-next-head-metrics">
          <span>Items {formatCount(stats.totalItems)}</span>
          <span>Outfits {formatCount(stats.totalOutfits)}</span>
          <span>Photos {formatCount(stats.totalPhotos)}</span>
          <span>Rain Ratio {stats.rainRatio}%</span>
        </div>
      </header>

      <div className="stats-next-grid">
        <article className="stats-next-card stats-next-top">
          <div className="stats-next-card-head">
            <h2>Top 5 Most Worn</h2>
            <span>Past 30 Days</span>
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
                      <div className="stats-next-top-photo-empty">No Photo</div>
                    )}
                  </div>
                  <p>{item.name}</p>
                  <small>{item.count} wears</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="stats-next-empty">
              <p>No wear data yet.</p>
              <Link href="/outfits/new" className="solid-button">
                Add today&apos;s look
              </Link>
            </div>
          )}
        </article>

        <article className="stats-next-card stats-next-month">
          <div className="stats-next-card-head">
            <h2>Monthly Style Trend</h2>
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
              <small>Logged Outfits</small>
            </div>
            <div>
              <strong>{stats.efficiencyRate}%</strong>
              <small>Efficiency Rate</small>
            </div>
            <div>
              <strong>{stats.curationPercent}%</strong>
              <small>Curation Level</small>
            </div>
          </div>
        </article>

        <article className="stats-next-card">
          <div className="stats-next-card-head">
            <h2>Category Focus</h2>
            <span>Top {Math.min(stats.categorySorted.length, 6)}</span>
          </div>
          {stats.categorySorted.length > 0 ? (
            <div className="stats-next-list">
              {stats.categorySorted.slice(0, 6).map((row) => (
                <div key={row.category} className="stats-next-row">
                  <p>{row.category}</p>
                  <div className="stats-next-progress">
                    <span style={{ width: `${ratioPercent(row.count, stats.totalItems || 1)}%` }} />
                  </div>
                  <small>{row.count}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="stats-next-muted">No items yet.</p>
          )}
        </article>

        <article className="stats-next-card">
          <div className="stats-next-card-head">
            <h2>Weather Distribution</h2>
            <span>{stats.weatherTotal} outfits</span>
          </div>
          <div className="stats-next-weather-summary">
            <p>Rain {stats.rainCount}</p>
            <p>Clear {stats.clearCount}</p>
            <p>Rain Ratio {stats.rainRatio}%</p>
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
          <h2>Style Arch</h2>
          <p>
            Your signature category is <strong>{stats.topCategory}</strong>, with {formatCount(stats.totalOutfits)}{" "}
            outfits logged in {stats.currentYear}.
          </p>
          <div className="stats-next-actions">
            <Link href={diaryHref} className="ghost-button">
              View Diary
            </Link>
            <Link href="/wardrobe" className="ghost-button">
              Open Wardrobe
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
