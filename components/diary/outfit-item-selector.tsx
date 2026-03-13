"use client";

import { useMemo, useState } from "react";

import { SmartCombobox } from "@/components/ui/smart-combobox";

type OutfitItem = {
  id: number;
  name: string;
  category: string | null;
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

  const options = useMemo(
    () =>
      items.map((item) => ({
        id: String(item.id),
        label: item.name,
        meta: categoryLabel(item.category),
      })),
    [items],
  );

  const selectedItems = useMemo(
    () => options.filter((option) => selectedIds.includes(option.id)),
    [options, selectedIds],
  );

  return (
    <section className="outfit-item-selector">
      <div className="outfit-item-selector-head">
        <div>
          <p className="outfit-create-section-kicker">착용 아이템</p>
          <h3>오늘 입은 옷</h3>
        </div>
        <span>{selectedIds.length}개 선택</span>
      </div>

      <SmartCombobox
        multiple
        label="옷장 아이템 선택"
        placeholder="아이템명을 검색해 주세요"
        options={options}
        value={selectedIds}
        onValueChange={(value) => setSelectedIds(Array.isArray(value) ? value : [])}
        className="outfit-item-combobox"
      />

      {selectedItems.length > 0 ? (
        <div className="outfit-item-selected-list">
          {selectedItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="outfit-item-selected-chip"
              onClick={() => setSelectedIds((current) => current.filter((id) => id !== item.id))}
            >
              <span>{item.label}</span>
              {item.meta ? <small>{item.meta}</small> : null}
            </button>
          ))}
        </div>
      ) : (
        <p className="outfit-item-selector-empty">오늘 입은 옷을 선택해 주세요.</p>
      )}

      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="outfit_item_ids" value={id} />
      ))}
    </section>
  );
}
