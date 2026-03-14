"use client";

import { useMemo, useState } from "react";

import type { StatsTopItem } from "@/lib/queries/stats";

type TopItemsHoverGalleryProps = {
  items: StatsTopItem[];
};

function getCategoryLabel(category: string | null): string {
  const value = String(category || "").trim().toLowerCase();
  if (!value) return "미분류";
  if (["outerwear", "outer", "아우터"].includes(value)) return "아우터";
  if (["top", "tops", "상의"].includes(value)) return "상의";
  if (["bottom", "bottoms", "하의"].includes(value)) return "하의";
  if (["footwear", "shoes", "신발"].includes(value)) return "신발";
  if (["accessories", "accessory", "acc", "액세서리"].includes(value)) return "액세서리";
  return category || "미분류";
}

export default function TopItemsHoverGallery({ items }: TopItemsHoverGalleryProps) {
  const initialIndex = useMemo(() => items.findIndex((item) => Boolean(item.image_path)), [items]);
  const [expandedIndex, setExpandedIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

  return (
    <div className="stats-top-gallery" aria-label="최근 30일 자주 입은 옷">
      {items.map((item, index) => {
        const expanded = index === expandedIndex;

        return (
          <button
            key={item.id}
            type="button"
            className={`stats-top-gallery-card${expanded ? " is-expanded" : ""}`}
            onMouseEnter={() => setExpandedIndex(index)}
            onFocus={() => setExpandedIndex(index)}
            aria-pressed={expanded}
          >
            {item.image_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image_path} alt={item.name} className="stats-top-gallery-image" />
            ) : (
              <div className="stats-top-gallery-fallback">이미지 없음</div>
            )}

            <div className="stats-top-gallery-overlay" />

            <div className="stats-top-gallery-copy">
              <span className="stats-top-gallery-rank">#{index + 1}</span>
              <strong>{item.name}</strong>
              <small>
                {getCategoryLabel(item.category)} · {item.count}회 착용
              </small>
            </div>
          </button>
        );
      })}
    </div>
  );
}
