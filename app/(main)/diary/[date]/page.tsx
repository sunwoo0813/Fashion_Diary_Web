import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAppUserContext } from "@/lib/app-user";
import { getDiaryDayData } from "@/lib/queries/diary";

function parseIsoDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function addDays(isoDate: string, offset: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function displayDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function DiaryDatePage({
  params,
}: {
  params: { date: string };
}) {
  const isoDate = parseIsoDate(params.date);
  if (!isoDate) notFound();

  const prevDate = addDays(isoDate, -1);
  const nextDate = addDays(isoDate, 1);
  const monthDate = new Date(`${isoDate}T00:00:00Z`);
  const monthYear = monthDate.getUTCFullYear();
  const month = monthDate.getUTCMonth() + 1;

  const { appUserId } = await requireAppUserContext();
  const data = await getDiaryDayData(appUserId, isoDate);

  return (
    <section className="diary-day-page">
      <header className="diary-day-header">
        <div>
          <p className="diary-kicker">Style Archive</p>
          <h1>{displayDate(isoDate)}</h1>
          <p>Total outfits: {data.totalOutfits} | Total wardrobe items: {data.totalItems}</p>
        </div>
        <div className="diary-day-actions">
          <Link href={`/diary/${prevDate}`} className="ghost-button">
            Previous Day
          </Link>
          <Link href={`/diary/${nextDate}`} className="ghost-button">
            Next Day
          </Link>
          <Link href={`/diary/month?year=${monthYear}&month=${month}`} className="ghost-button">
            Month View
          </Link>
          <Link href={`/outfits/new?date=${isoDate}`} className="solid-button">
            Create Entry
          </Link>
        </div>
      </header>

      {data.outfits.length === 0 ? (
        <div className="diary-empty">
          <p>No outfit entries for this date.</p>
          <Link href={`/outfits/new?date=${isoDate}`} className="solid-button">
            Add Outfit
          </Link>
        </div>
      ) : (
        <div className="diary-outfit-list">
          {data.outfits.map((outfit) => (
            <article key={outfit.id} className="diary-outfit-card">
              <div className="diary-outfit-head">
                <div>
                  <h2>{outfit.note || "Outfit Entry"}</h2>
                  <p>
                    {outfit.t_min ?? 0}C / {outfit.t_max ?? 0}C | humidity {outfit.humidity ?? 0}% |{" "}
                    {outfit.rain ? "Rain" : "No rain"}
                  </p>
                </div>
                <Link href={`/outfits/${outfit.id}/edit`} className="ghost-button">
                  Edit
                </Link>
              </div>

              {outfit.photos.length > 0 ? (
                <div className="diary-photo-row">
                  {outfit.photos.map((photo) => (
                    <figure key={photo.id} className="diary-photo-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.photo_path} alt={`Outfit ${outfit.id} photo ${photo.id}`} />
                      <figcaption>
                        {photo.tag_items.length > 0 ? (
                          <div className="diary-tag-list">
                            {photo.tag_items.map((item) => (
                              <span key={`${photo.id}-${item.id}`}>{item.name}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="diary-tag-empty">No tags</span>
                        )}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="diary-no-photo">No photos uploaded.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
