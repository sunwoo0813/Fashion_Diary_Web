"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type OutfitDateCalendarProps = {
  name: string;
  defaultValue: string;
};

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  return new Date(year, (month || 1) - 1, day || 1);
}

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function buildCalendarDays(viewDate: Date): Date[] {
  const firstDay = startOfMonth(viewDate);
  const startWeekday = firstDay.getDay();
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - startWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const next = new Date(startDate);
    next.setDate(startDate.getDate() + index);
    return next;
  });
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function OutfitDateCalendar({ name, defaultValue }: OutfitDateCalendarProps) {
  const initialSelected = parseIsoDate(defaultValue);
  const [selectedDate, setSelectedDate] = useState<Date>(initialSelected);
  const [viewDate, setViewDate] = useState<Date>(startOfMonth(initialSelected));
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => new Date(), []);
  const days = useMemo(() => buildCalendarDays(viewDate), [viewDate]);

  const monthLabel = useMemo(
    () =>
      viewDate.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
      }),
    [viewDate],
  );

  const selectedLabel = useMemo(
    () =>
      selectedDate.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      }),
    [selectedDate],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className="outfit-date-calendar">
      <input type="hidden" name={name} value={toIsoDate(selectedDate)} />
      <button
        type="button"
        className="outfit-date-calendar-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span>{selectedLabel}</span>
        <ChevronRightIcon
          width={16}
          height={16}
          className={cn("outfit-date-calendar-trigger-icon", isOpen && "is-open")}
        />
      </button>

      {isOpen ? (
        <div className="outfit-date-calendar-popover">
          <div className="outfit-date-calendar-header">
            <button
              type="button"
              className="outfit-date-calendar-nav"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              aria-label="이전 달"
            >
              <ChevronLeftIcon width={16} height={16} />
            </button>
            <strong className="outfit-date-calendar-title">{monthLabel}</strong>
            <button
              type="button"
              className="outfit-date-calendar-nav"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              aria-label="다음 달"
            >
              <ChevronRightIcon width={16} height={16} />
            </button>
          </div>

          <div className="outfit-date-calendar-weekdays">
            {WEEKDAY_LABELS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="outfit-date-calendar-grid">
            {days.map((day) => {
              const isSelected = sameDay(day, selectedDate);
              const isToday = sameDay(day, today);
              const isOutsideMonth = day.getMonth() !== viewDate.getMonth();

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={cn(
                    "outfit-date-calendar-cell",
                    isSelected && "is-selected",
                    isToday && "is-today",
                    isOutsideMonth && "is-outside",
                  )}
                  onClick={() => {
                    setSelectedDate(day);
                    setViewDate(startOfMonth(day));
                    setIsOpen(false);
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
