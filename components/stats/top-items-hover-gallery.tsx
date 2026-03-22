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
  return (
    <div className="stats-top-grid" aria-label="최근 30일 자주 입은 옷">
      {items.map((item, index) => (
        <div key={item.id} className="stats-top-card">
          <div className="stats-top-card-media">
            {item.image_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image_path} alt={item.name} className="stats-top-card-image" />
            ) : (
              <div className="stats-top-card-fallback">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor" opacity="0.25"/>
                </svg>
              </div>
            )}
            <span className="stats-top-card-rank">#{index + 1}</span>
          </div>
          <div className="stats-top-card-info">
            <p className="stats-top-card-name">{item.name}</p>
            <small>{getCategoryLabel(item.category)} · {item.count}회</small>
          </div>
        </div>
      ))}
    </div>
  );
}
