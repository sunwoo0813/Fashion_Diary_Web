"use client";

import { useMemo, useState } from "react";

import { SmartCombobox } from "@/components/ui/smart-combobox";

type OutfitItem = {
  id: number;
  name: string;
  brand?: string | null;
  product_name?: string | null;
  category: string | null;
  image_path?: string | null;
};

type OutfitItemSelectorProps = {
  items: OutfitItem[];
  defaultSelectedIds?: number[];
};

function categoryLabel(category: string | null): string {
  const value = String(category || "").trim().toLowerCase();
  if (!value) return "기타";
  if (["outer", "outerwear"].includes(value)) return "아우터";
  if (["top", "tops"].includes(value)) return "상의";
  if (["bottom", "bottoms"].includes(value)) return "하의";
  if (["shoes", "footwear"].includes(value)) return "신발";
  if (["acc", "accessory", "accessories"].includes(value)) return "액세서리";
  return category || "기타";
}

export function OutfitItemSelector({ items, defaultSelectedIds = [] }: OutfitItemSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => defaultSelectedIds.map(String));

  const imageMap = useMemo(
    () => new Map(items.map((item) => [String(item.id), item.image_path || null])),
    [items],
  );

  const options = useMemo(
    () =>
      items.map((item) => ({
        id: String(item.id),
        label: item.product_name || item.name,
        meta: item.brand || undefined,
        icon: item.image_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_path} alt={item.name} />
        ) : (
          <div className="outfit-item-option-placeholder">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" stroke="currentColor" strokeWidth="1.4"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" opacity="0.4"/>
              <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          </div>
        ),
      })),
    [items],
  );

  const itemMap = useMemo(
    () => new Map(items.map((item) => [String(item.id), item])),
    [items],
  );

  const selectedItems = useMemo(
    () =>
      selectedIds
        .map((id) => {
          const item = itemMap.get(id);
          if (!item) return null;
          return {
            id,
            label: item.product_name || item.name,
            brand: item.brand || null,
            meta: categoryLabel(item.category),
            imagePath: imageMap.get(id) || null,
          };
        })
        .filter(Boolean) as { id: string; label: string; brand: string | null; meta: string; imagePath: string | null }[],
    [selectedIds, itemMap, imageMap],
  );

  return (
    <section className="outfit-item-selector">
      <p className="outfit-item-selector-empty">착용한 아이템을 태그해 보세요.</p>

      <SmartCombobox
        multiple
        placeholder="착용한 아이템 검색"
        options={options}
        value={selectedIds}
        onValueChange={(value) => setSelectedIds(Array.isArray(value) ? value : [])}
        className="outfit-item-combobox"
      />

      {selectedItems.length > 0 && (
        <div className="outfit-item-tagged-list">
          {selectedItems.map((item) => (
            <div key={item.id} className="outfit-item-tagged-row">
              <div className="outfit-item-tagged-thumb">
                {item.imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imagePath} alt={item.label} />
                ) : (
                  <div className="outfit-item-option-placeholder">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" stroke="currentColor" strokeWidth="1.4"/>
                      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" opacity="0.4"/>
                      <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="outfit-item-tagged-info">
                {item.brand ? <small className="outfit-item-tagged-brand">{item.brand}</small> : null}
                <span>{item.label}</span>
                <small>{item.meta}</small>
              </div>
              <button
                type="button"
                className="outfit-item-tagged-remove"
                onClick={() => setSelectedIds((current) => current.filter((id) => id !== item.id))}
                aria-label={`${item.label} 태그 해제`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="outfit_item_ids" value={id} />
      ))}
    </section>
  );
}
