"use client";

import { useMemo, useRef, useState } from "react";

import type { WardrobeItem } from "@/lib/queries/wardrobe";

type WardrobeGridProps = {
  items: WardrobeItem[];
  wearCounts: Record<number, number>;
  favoriteIds: number[];
  hasFilters: boolean;
};

function itemCountText(count: number) {
  if (count <= 0) return "Not worn yet";
  if (count === 1) return "Worn 1 time";
  return `Worn ${count} times`;
}

export function WardrobeGrid({
  items,
  wearCounts,
  favoriteIds,
  hasFilters,
}: WardrobeGridProps) {
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const formRef = useRef<HTMLFormElement | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  function toggleItem(id: number) {
    if (!deleteMode) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((itemId) => itemId !== id);
      return [...prev, id];
    });
  }

  function handleDeleteButton() {
    if (!deleteMode) {
      setDeleteMode(true);
      return;
    }

    if (selectedIds.length === 0) {
      setDeleteMode(false);
      return;
    }

    const ok = window.confirm(`Delete ${selectedIds.length} selected item(s)?`);
    if (!ok) return;
    formRef.current?.requestSubmit();
  }

  if (items.length === 0) {
    return (
      <div className="wardrobe-empty">
        {hasFilters ? "No items match your filters." : "Your wardrobe is empty. Add your first piece."}
      </div>
    );
  }

  return (
    <div>
      <div className="wardrobe-action-row">
        <p className={`wardrobe-delete-hint${deleteMode ? " is-visible" : ""}`}>
          Select items to delete.
        </p>
        <button type="button" className="ghost-button" onClick={handleDeleteButton}>
          {!deleteMode
            ? "Delete"
            : selectedIds.length > 0
              ? `Delete Selected (${selectedIds.length})`
              : "Cancel Delete"}
        </button>
      </div>

      <form ref={formRef} action="/api/items/delete" method="post">
        {selectedIds.map((id) => (
          <input key={id} type="hidden" name="item_ids" value={id} />
        ))}
      </form>

      <div className="wardrobe-grid">
        {items.map((item) => {
          const selected = selectedSet.has(item.id);
          const count = wearCounts[item.id] ?? 0;
          return (
            <article
              key={item.id}
              className={`wardrobe-card${selected ? " is-selected" : ""}${deleteMode ? " is-delete-mode" : ""}`}
              onClick={() => toggleItem(item.id)}
              role={deleteMode ? "button" : undefined}
              tabIndex={deleteMode ? 0 : -1}
              onKeyDown={(event) => {
                if (!deleteMode) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleItem(item.id);
                }
              }}
            >
              <div className="wardrobe-media">
                {item.image_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_path} alt={item.name} loading="lazy" />
                ) : (
                  <div className="wardrobe-media-placeholder">No Image</div>
                )}
                {favoriteSet.has(item.id) ? <span className="wardrobe-badge">Top</span> : null}
              </div>
              <div className="wardrobe-info">
                <h3>{item.name}</h3>
                <p>{item.category || "Item"}</p>
                <span>{itemCountText(count)}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
