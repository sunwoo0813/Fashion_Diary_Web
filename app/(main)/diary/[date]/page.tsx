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
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("ko-KR", {
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
          <p className="diary-kicker">스타일 아카이브</p>
          <h1>{displayDate(isoDate)}</h1>
          <p>총 코디: {data.totalOutfits} | 총 옷장 아이템: {data.totalItems}</p>
        </div>
        <div className="diary-day-actions">
          <Link href={`/diary/${prevDate}`} className="ghost-button">
            이전 날짜
          </Link>
          <Link href={`/diary/${nextDate}`} className="ghost-button">
            다음 날짜
          </Link>
          <Link href={`/diary/month?year=${monthYear}&month=${month}`} className="ghost-button">
            월 보기
          </Link>
          <Link href={`/outfits/new?date=${isoDate}`} className="solid-button">
            기록 작성
          </Link>
        </div>
      </header>

      {data.outfits.length === 0 ? (
        <div className="diary-empty">
          <p>이 날짜에 기록된 코디가 없어요.</p>
          <Link href={`/outfits/new?date=${isoDate}`} className="solid-button">
            코디 추가
          </Link>
        </div>
      ) : (
        <div className="diary-outfit-list">
          {data.outfits.map((outfit) => (
            <article key={outfit.id} className="diary-outfit-card">
              <div className="diary-outfit-head">
                <div>
                  <h2>{outfit.note || "코디 기록"}</h2>
                  <p>
                    {outfit.t_min ?? 0}C / {outfit.t_max ?? 0}C | 습도 {outfit.humidity ?? 0}% |{" "}
                    {outfit.rain ? "비" : "비 없음"}
                  </p>
                </div>
                <Link href={`/outfits/${outfit.id}/edit`} className="ghost-button">
                  수정
                </Link>
              </div>

              {outfit.photos.length > 0 ? (
                <div className="diary-photo-row">
                  {outfit.photos.map((photo) => (
                    <figure key={photo.id} className="diary-photo-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.photo_path} alt={`코디 ${outfit.id} 사진 ${photo.id}`} />
                      <figcaption>
                        {photo.tag_items.length > 0 ? (
                          <div className="diary-tag-list">
                            {photo.tag_items.map((item) => (
                              <span key={`${photo.id}-${item.id}`}>{item.name}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="diary-tag-empty">태그 없음</span>
                        )}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="diary-no-photo">업로드된 사진이 없어요.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
