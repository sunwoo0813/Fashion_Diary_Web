"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

import { KebabVerticalIcon } from "@/components/common/icons";
import type { WardrobeItem } from "@/lib/queries/wardrobe";

type WardrobeGridProps = {
  items: WardrobeItem[];
  wearCounts: Record<number, number>;
  favoriteIds: number[];
  hasFilters: boolean;
};

type ModalPosition = {
  top: number;
  left: number;
};

type SizeGrid = {
  headers: string[];
  rows: string[][];
};

type EditFormState = {
  brand: string;
  product: string;
  category: string;
  size: string;
  color: string;
  stylingIdea: string;
};

function itemCountText(count: number) {
  if (count <= 0) return "Not worn yet";
  if (count === 1) return "Worn 1 time";
  return `Worn ${count} times`;
}

function splitName(name: string): { brand: string; product: string } {
  const text = name.trim();
  if (!text) return { brand: "-", product: "Untitled" };
  const parts = text.split(/\s+/);
  if (parts.length === 1) return { brand: parts[0], product: parts[0] };
  return {
    brand: parts[0],
    product: parts.slice(1).join(" ") || text,
  };
}

function parseName(name: string): { brand: string; itemName: string } {
  const text = name.trim();
  if (!text) return { brand: "-", itemName: "Untitled" };
  const parts = text.split(/\s+/);
  if (parts.length < 2) return { brand: "-", itemName: text };
  return { brand: parts[0], itemName: parts.slice(1).join(" ") || text };
}

function getDetailValue(detail: unknown, keys: string[]): string {
  if (!detail || typeof detail !== "object") return "-";
  const source = detail as Record<string, unknown>;
  const pairs = source.pairs && typeof source.pairs === "object" ? (source.pairs as Record<string, unknown>) : null;
  const lowerKeys = keys.map((key) => key.toLowerCase());

  if (pairs) {
    for (const [key, value] of Object.entries(pairs)) {
      if (!lowerKeys.includes(key.toLowerCase())) continue;
      const text = String(value ?? "").trim();
      if (text) return text;
    }
  }

  for (const key of keys) {
    const value = source[key];
    const text = String(value ?? "").trim();
    if (text && text !== "[object Object]") return text;
  }

  return "-";
}

function parseSizeGrid(detail: unknown): SizeGrid | null {
  if (!detail || typeof detail !== "object") return null;
  const source = detail as Record<string, unknown>;

  const headers = Array.isArray(source.headers)
    ? source.headers.map((value) => String(value ?? "").trim()).filter(Boolean)
    : [];

  const rowsFromRows = Array.isArray(source.rows)
    ? source.rows.map((row) => (Array.isArray(row) ? row : [row]).map((value) => String(value ?? "").trim()))
    : [];
  if (headers.length > 0 && rowsFromRows.length > 0) {
    return { headers, rows: rowsFromRows };
  }

  const values = Array.isArray(source.values)
    ? source.values.map((value) => String(value ?? "").trim())
    : [];
  if (headers.length > 0 && values.length > 0) {
    return { headers, rows: [values] };
  }

  const pairs = source.pairs && typeof source.pairs === "object" ? (source.pairs as Record<string, unknown>) : null;
  if (pairs) {
    const pairHeaders = Object.keys(pairs).map((key) => key.trim()).filter(Boolean);
    if (pairHeaders.length > 0) {
      const row = pairHeaders.map((key) => String(pairs[key] ?? "").trim());
      return { headers: pairHeaders, rows: [row] };
    }
  }

  return null;
}

export function WardrobeGrid({
  items,
  wearCounts,
  favoriteIds,
  hasFilters,
}: WardrobeGridProps) {
  const [localItems, setLocalItems] = useState<WardrobeItem[]>(items);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeItem, setActiveItem] = useState<WardrobeItem | null>(null);
  const [modalPosition, setModalPosition] = useState<ModalPosition | null>(null);
  const [editItem, setEditItem] = useState<WardrobeItem | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState<EditFormState>({
    brand: "",
    product: "",
    category: "",
    size: "",
    color: "",
    stylingIdea: "",
  });

  const formRef = useRef<HTMLFormElement | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const activeParsedName = activeItem ? parseName(activeItem.name) : null;
  const activeSizeGrid = activeItem ? parseSizeGrid(activeItem.size_detail) : null;

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setActiveItem(null);
      setModalPosition(null);
      setEditItem(null);
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  function openItemModal(event: MouseEvent<HTMLElement>, item: WardrobeItem) {
    const rect = event.currentTarget.getBoundingClientRect();
    const modalWidth = 320;
    const gap = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isLeftHalf = rect.left + rect.width / 2 < viewportWidth / 2;

    const rawLeft = isLeftHalf ? rect.right + gap : rect.left - modalWidth - gap;
    const left = Math.max(12, Math.min(rawLeft, viewportWidth - modalWidth - 12));
    const top = Math.max(12, Math.min(rect.top, viewportHeight - 460));

    setActiveItem(item);
    setModalPosition({ top, left });
  }

  function openEditModal(item: WardrobeItem) {
    const parsed = parseName(item.name);
    const color = getDetailValue(item.size_detail, ["color", "colour"]);
    const styling = getDetailValue(item.size_detail, ["styling", "style", "stylingIdea", "note"]);

    setEditItem(item);
    setEditError("");
    setEditForm({
      brand: parsed.brand === "-" ? "" : parsed.brand,
      product: parsed.itemName,
      category: item.category || "",
      size: item.size || "",
      color: color === "-" ? "" : color,
      stylingIdea: styling === "-" ? "" : styling,
    });
  }

  async function saveEdit() {
    if (!editItem) return;
    setEditSaving(true);
    setEditError("");

    try {
      const response = await fetch(`/api/items/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: editForm.brand,
          product: editForm.product,
          category: editForm.category,
          size: editForm.size,
          color: editForm.color,
          stylingIdea: editForm.stylingIdea,
        }),
      });

      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        item?: {
          id?: number;
          name?: string;
          category?: string | null;
          size?: string | null;
          size_detail?: unknown;
        };
      };

      if (!response.ok || !body.ok || !body.item) {
        throw new Error(body.error || "Update failed");
      }

      const nextName = String(body.item.name || "").trim();
      const nextCategory = body.item.category == null ? null : String(body.item.category);
      const nextSize = body.item.size == null ? null : String(body.item.size);
      const nextSizeDetail = body.item.size_detail ?? null;

      setLocalItems((prev) =>
        prev.map((row) =>
          row.id === editItem.id
            ? {
                ...row,
                name: nextName || row.name,
                category: nextCategory,
                size: nextSize,
                size_detail: nextSizeDetail,
              }
            : row,
        ),
      );

      if (activeItem?.id === editItem.id) {
        setActiveItem((prev) =>
          prev
            ? {
                ...prev,
                name: nextName || prev.name,
                category: nextCategory,
                size: nextSize,
                size_detail: nextSizeDetail,
              }
            : prev,
        );
      }

      setEditItem(null);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Update failed");
    } finally {
      setEditSaving(false);
    }
  }

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

  if (localItems.length === 0) {
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
        {localItems.map((item) => {
          const selected = selectedSet.has(item.id);
          const count = wearCounts[item.id] ?? 0;
          const label = splitName(item.name);
          return (
            <article
              key={item.id}
              className={`wardrobe-card${selected ? " is-selected" : ""}${deleteMode ? " is-delete-mode" : ""}`}
              onClick={(event) => {
                if (deleteMode) {
                  toggleItem(item.id);
                  return;
                }
                openItemModal(event, item);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (deleteMode) {
                    toggleItem(item.id);
                    return;
                  }
                  setActiveItem(item);
                  setModalPosition({
                    top: Math.max(12, Math.min(window.innerHeight * 0.2, window.innerHeight - 460)),
                    left: Math.max(12, Math.min(window.innerWidth * 0.55, window.innerWidth - 332)),
                  });
                }
              }}
            >
              <div className="wardrobe-brand-bar">
                <span>{label.brand}</span>
                <button
                  type="button"
                  className="wardrobe-edit-icon"
                  aria-label={`Edit ${label.product}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    openEditModal(item);
                  }}
                >
                  <KebabVerticalIcon size={16} />
                </button>
              </div>
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
                <h3>{label.product}</h3>
                <p>{item.category || "Item"}</p>
                <span>{itemCountText(count)}</span>
              </div>
            </article>
          );
        })}
      </div>

      {activeItem && modalPosition ? (
        <div
          className="wardrobe-inline-modal-layer"
          onClick={() => {
            setActiveItem(null);
            setModalPosition(null);
          }}
        >
          <aside
            className="wardrobe-inline-modal"
            style={{ top: `${modalPosition.top}px`, left: `${modalPosition.left}px` }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="wardrobe-inline-modal-head">
              <div className="wardrobe-inline-modal-title">
                <strong>{activeParsedName?.brand || "-"}</strong>
                <p>{activeParsedName?.itemName || "Untitled"}</p>
              </div>
              <button
                type="button"
                className="wardrobe-inline-close"
                aria-label="Close item detail"
                onClick={() => {
                  setActiveItem(null);
                  setModalPosition(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="wardrobe-inline-body">
              <div className="wardrobe-inline-size">
                <span>Size Table</span>
                {activeSizeGrid ? (
                  <div className="wardrobe-inline-size-wrap">
                    <table className="wardrobe-inline-size-table">
                      <thead>
                        <tr>
                          {activeSizeGrid.headers.map((header, index) => (
                            <th key={`${header}-${index}`}>{header || `Col ${index + 1}`}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeSizeGrid.rows.map((row, rowIndex) => (
                          <tr key={`size-row-${rowIndex}`}>
                            {activeSizeGrid.headers.map((_, colIndex) => (
                              <td key={`size-cell-${rowIndex}-${colIndex}`}>{row[colIndex] || "-"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <strong>-</strong>
                )}
              </div>

              <p><span>Size</span><strong>{activeItem.size || "-"}</strong></p>
              <p><span>Color</span><strong>{getDetailValue(activeItem.size_detail, ["color", "colour"])}</strong></p>
              <p>
                <span>Styling Idea</span>
                <strong>{getDetailValue(activeItem.size_detail, ["styling", "style", "stylingIdea", "note"])}</strong>
              </p>
            </div>
          </aside>
        </div>
      ) : null}

      {editItem ? (
        <div
          className="wardrobe-edit-modal-layer"
          onClick={() => {
            if (editSaving) return;
            setEditItem(null);
          }}
        >
          <section className="wardrobe-edit-modal" onClick={(event) => event.stopPropagation()}>
            <header className="wardrobe-edit-head">
              <h3>Edit Item</h3>
              <button
                type="button"
                className="wardrobe-inline-close"
                onClick={() => {
                  if (editSaving) return;
                  setEditItem(null);
                }}
              >
                ×
              </button>
            </header>

            <div className="wardrobe-edit-form">
              <label>
                Brand
                <input value={editForm.brand} onChange={(event) => setEditForm((prev) => ({ ...prev, brand: event.target.value }))} />
              </label>
              <label>
                Item Name
                <input value={editForm.product} onChange={(event) => setEditForm((prev) => ({ ...prev, product: event.target.value }))} />
              </label>
              <label>
                Category
                <input value={editForm.category} onChange={(event) => setEditForm((prev) => ({ ...prev, category: event.target.value }))} />
              </label>
              <label>
                Size
                <input value={editForm.size} onChange={(event) => setEditForm((prev) => ({ ...prev, size: event.target.value }))} />
              </label>
              <label>
                Color
                <input value={editForm.color} onChange={(event) => setEditForm((prev) => ({ ...prev, color: event.target.value }))} />
              </label>
              <label>
                Styling Idea
                <textarea rows={3} value={editForm.stylingIdea} onChange={(event) => setEditForm((prev) => ({ ...prev, stylingIdea: event.target.value }))} />
              </label>
            </div>

            {editError ? <p className="form-error">{editError}</p> : null}

            <div className="wardrobe-edit-actions">
              <button type="button" className="ghost-button" onClick={() => setEditItem(null)} disabled={editSaving}>
                Cancel
              </button>
              <button type="button" className="solid-button" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
