import Link from "next/link";

import { requireAppUserContext } from "@/lib/app-user";
import { getDiaryMonthData } from "@/lib/queries/diary";

function readParam(value: string | string[] | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) return value[0] || "";
  return value;
}

function toInt(value: string, fallback: number): number {
  const num = Number(value);
  return Number.isInteger(num) ? num : fallback;
}

function formatDateKey(year: number, month1to12: number, day: number): string {
  const mm = String(month1to12).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

type DiaryMonthPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function DiaryMonthPage({ searchParams }: DiaryMonthPageProps) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;

  const year = toInt(readParam(searchParams?.year), currentYear);
  const month = Math.max(1, Math.min(12, toInt(readParam(searchParams?.month), currentMonth)));

  const { appUserId } = await requireAppUserContext();
  const { recordedDays, outfitCount } = await getDiaryMonthData(appUserId, year, month);

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const weekday = firstDay.getUTCDay();
  const offset = weekday;

  const prevYear = month > 1 ? year : year - 1;
  const prevMonth = month > 1 ? month - 1 : 12;
  const nextYear = month < 12 ? year : year + 1;
  const nextMonth = month < 12 ? month + 1 : 1;

  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  return (
    <section className="diary-month-page">
      <header className="diary-month-header">
        <div>
          <p className="diary-kicker">코디 다이어리</p>
          <h1>{monthLabel}</h1>
          <p>이번 달 기록 {outfitCount}개</p>
        </div>
        <div className="diary-month-actions">
          <Link
            href={`/diary/month?year=${prevYear}&month=${prevMonth}`}
            className="ghost-button"
          >
            이전
          </Link>
          <Link
            href={`/diary/month?year=${nextYear}&month=${nextMonth}`}
            className="ghost-button"
          >
            다음
          </Link>
          <Link href={`/outfits/new?date=${new Date().toISOString().slice(0, 10)}`} className="solid-button">
            기록 작성
          </Link>
        </div>
      </header>

      <div className="diary-weekday-row">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="diary-month-grid">
        {Array.from({ length: offset }).map((_, index) => (
          <div key={`offset-${index}`} className="diary-day-cell empty" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const iso = formatDateKey(year, month, day);
          const hasRecord = recordedDays.has(day);
          const isToday = iso === new Date().toISOString().slice(0, 10);
          return (
            <Link
              key={iso}
              href={`/diary/${iso}`}
              className={`diary-day-cell${hasRecord ? " is-recorded" : ""}${isToday ? " is-today" : ""}`}
            >
              <span>{day}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
