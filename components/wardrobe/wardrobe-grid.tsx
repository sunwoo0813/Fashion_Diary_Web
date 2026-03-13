"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

import { ConfirmSubmitButton } from "@/components/common/confirm-submit-button";
import { KebabVerticalIcon } from "@/components/common/icons";
import type { WardrobeItem } from "@/lib/queries/wardrobe";

type WardrobeGridProps = {
  items: WardrobeItem[];
  wearCounts: Record<number, number>;
  recentWearDates: Record<number, string>;
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
  sizeDetail: unknown;
};

const EDIT_CATEGORY_OPTIONS = [
  { value: "Top", label: "상의" },
  { value: "Outer", label: "아우터" },
  { value: "Bottom", label: "하의" },
  { value: "Shoes", label: "신발" },
  { value: "ACC", label: "액세서리" },
] as const;

function itemCountText(count: number) {
  if (count <= 0) return "아직 착용하지 않았어요";
  if (count === 1) return "1회 착용";
  return `${count}회 착용`;
}

function formatRecentWearDate(value: string | null | undefined): string {
  const date = String(value || "").trim();
  if (!date) return "-";

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const MULTI_WORD_BRANDS = [
  "surface edition",
];
const MULTI_WORD_BRAND_TOKENS = MULTI_WORD_BRANDS.map((brand) =>
  brand
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean),
).sort((a, b) => b.length - a.length);

function detectBrandWordCount(parts: string[]): number {
  if (parts.length < 2) return 1;
  const lowerParts = parts.map((part) => part.toLowerCase());
  for (const tokens of MULTI_WORD_BRAND_TOKENS) {
    if (tokens.length > lowerParts.length) continue;
    const matches = tokens.every((token, index) => lowerParts[index] === token);
    if (matches) return tokens.length;
  }
  return 1;
}

function toCategoryLabel(category: string | null): string {
  const value = String(category || "").trim().toLowerCase();
  if (!value) return "아이템";

  if (["outer", "outerwear", "아우터"].includes(value)) return "아우터";
  if (["top", "tops", "상의"].includes(value)) return "상의";
  if (["bottom", "bottoms", "하의"].includes(value)) return "하의";
  if (["footwear", "신발"].includes(value)) return "신발";
  if (["accessories", "accessory", "액세서리"].includes(value)) return "액세서리";

  return category || "아이템";
}

function toDetailCategoryLabel(detailCategory: string | null): string {
  const value = String(detailCategory || "").trim().toLowerCase();
  if (!value) return "-";

  const labels: Record<string, string> = {
    short_sleeve_tshirt: "반팔",
    long_sleeve_tshirt: "긴팔",
    shirt: "셔츠",
    polo_shirt: "카라티",
    sweatshirt: "맨투맨",
    hoodie: "후드티",
    knit: "니트",
    sleeveless: "슬리브리스",
    vest: "조끼",
    blouse: "블라우스",
    cardigan: "가디건",
    hood_zipup: "후드집업",
    jacket: "자켓",
    blazer: "블레이저",
    leather_jacket: "가죽자켓",
    windbreaker: "바람막이",
    coat: "코트",
    padding: "패딩",
    fleece: "플리스",
    shorts: "반바지",
    jeans: "청바지",
    slacks: "슬랙스",
    cotton_pants: "면바지/치노",
    jogger_pants: "조거팬츠",
    leggings: "레깅스",
    skirt: "스커트",
  };

  return labels[value] || detailCategory || "-";
}

function toSeasonLabel(seasons: string[]): string {
  if (!Array.isArray(seasons) || seasons.length === 0) return "-";

  const labels: Record<string, string> = {
    spring: "봄",
    summer: "여름",
    fall: "가을",
    winter: "겨울",
  };

  return seasons.map((season) => labels[String(season).toLowerCase()] || season).join(", ");
}

function toThicknessLabel(thickness: string | null): string {
  const value = String(thickness || "").trim().toLowerCase();
  if (!value) return "-";
  if (value === "light") return "얇음";
  if (value === "medium") return "보통";
  if (value === "heavy") return "두꺼움";
  return thickness || "-";
}

function splitName(name: string): { brand: string; product: string } {
  const text = name.trim();
  if (!text) return { brand: "-", product: "이름 없음" };
  const parts = text.split(/\s+/);
  if (parts.length === 1) return { brand: parts[0], product: parts[0] };
  const brandWordCount = detectBrandWordCount(parts);
  return {
    brand: parts.slice(0, brandWordCount).join(" "),
    product: parts.slice(brandWordCount).join(" ") || text,
  };
}

function parseName(name: string): { brand: string; itemName: string } {
  const text = name.trim();
  if (!text) return { brand: "-", itemName: "이름 없음" };
  const parts = text.split(/\s+/);
  if (parts.length < 2) return { brand: "-", itemName: text };
  const brandWordCount = detectBrandWordCount(parts);
  return {
    brand: parts.slice(0, brandWordCount).join(" "),
    itemName: parts.slice(brandWordCount).join(" ") || text,
  };
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

function visibleSizeGridColumns(grid: SizeGrid): number[] {
  return grid.headers
    .map((header, index) => ({ header: header.trim().toLowerCase(), index }))
    .filter(({ header, index }) => !(index === 0 && header === "사이즈"))
    .map(({ index }) => index);
}

function buildSizeDetailFromGrid(headers: string[], values: string[]) {
  const pairs: Record<string, string> = {};
  headers.forEach((header, index) => {
    pairs[header || `col_${index + 1}`] = values[index] || "";
  });
  return { headers, values, pairs };
}

function findSelectedSizeRowIndex(grid: SizeGrid | null, size: string | null): number | null {
  if (!grid) return null;
  const target = String(size || "").trim();
  if (!target) return null;
  const rowIndex = grid.rows.findIndex((row) => String(row[0] || "").trim() === target);
  return rowIndex >= 0 ? rowIndex : null;
}

export function WardrobeGrid({
  items,
  wearCounts,
  recentWearDates,
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
  const [editSizeGrid, setEditSizeGrid] = useState<SizeGrid | null>(null);
  const [editSelectedSizeRowIndex, setEditSelectedSizeRowIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    brand: "",
    product: "",
    category: "",
    size: "",
    sizeDetail: null,
  });

  const formRef = useRef<HTMLFormElement | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const activeParsedName = activeItem ? parseName(activeItem.name) : null;
  const activeSizeGrid = activeItem ? parseSizeGrid(activeItem.size_detail) : null;
  const activeSizeGridColumns = activeSizeGrid ? visibleSizeGridColumns(activeSizeGrid) : [];
  const activeWearCount = activeItem ? wearCounts[activeItem.id] ?? 0 : 0;
  const activeRecentWearDate = activeItem ? recentWearDates[activeItem.id] || "" : "";

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
    const nextSizeGrid = parseSizeGrid(item.size_detail);

    setEditItem(item);
    setEditError("");
    setEditSizeGrid(nextSizeGrid);
    setEditSelectedSizeRowIndex(findSelectedSizeRowIndex(nextSizeGrid, item.size));
    setEditForm({
      brand: parsed.brand === "-" ? "" : parsed.brand,
      product: parsed.itemName,
      category: item.category || "",
      size: item.size || "",
      sizeDetail: item.size_detail ?? null,
    });
  }

  function selectEditSizeRow(rowIndex: number) {
    if (!editSizeGrid) return;
    const row = editSizeGrid.rows[rowIndex];
    if (!row) return;

    setEditSelectedSizeRowIndex(rowIndex);
    setEditForm((prev) => ({
      ...prev,
      size: row[0] || "",
      sizeDetail: buildSizeDetailFromGrid(editSizeGrid.headers, row),
    }));
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
          size_detail: editForm.sizeDetail,
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
        throw new Error("수정에 실패했어요.");
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
      setEditSizeGrid(null);
      setEditSelectedSizeRowIndex(null);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "수정에 실패했어요.");
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
      return false;
    }
    return true;
  }

  if (localItems.length === 0) {
    return (
      <div className="wardrobe-empty">
        {hasFilters ? "필터 조건과 일치하는 아이템이 없어요." : "옷장이 비어 있어요. 첫 아이템을 추가해보세요."}
      </div>
    );
  }

  return (
    <div>
      <div className="wardrobe-action-row">
        <p className={`wardrobe-delete-hint${deleteMode ? " is-visible" : ""}`}>
          삭제할 아이템을 선택하세요.
        </p>
        {!deleteMode || selectedIds.length === 0 ? (
          <button type="button" className="ghost-button" onClick={handleDeleteButton}>
            {!deleteMode ? "삭제" : "삭제 취소"}
          </button>
        ) : (
          <ConfirmSubmitButton
            className="ghost-button"
            formId="wardrobeDeleteForm"
            title={`${selectedIds.length}개 아이템을 삭제할까요?`}
            message="삭제한 아이템은 되돌릴 수 없고, 관련 착용 기록 연결도 함께 정리됩니다."
            confirmLabel="삭제"
          >
            선택 삭제 ({selectedIds.length})
          </ConfirmSubmitButton>
        )}
      </div>

      <form ref={formRef} id="wardrobeDeleteForm" action="/api/items/delete" method="post">
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
                  aria-label={`${label.product} 수정`}
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
                  <div className="wardrobe-media-placeholder">이미지 없음</div>
                )}
              </div>
              <div className="wardrobe-info">
                <h3>{label.product}</h3>
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
                <p>{activeParsedName?.itemName || "이름 없음"}</p>
                <small>
                  {toCategoryLabel(activeItem.category)} / {toDetailCategoryLabel(activeItem.detail_category)}
                </small>
              </div>
              <button
                type="button"
                className="wardrobe-inline-close"
                aria-label="아이템 상세 닫기"
                onClick={() => {
                  setActiveItem(null);
                  setModalPosition(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="wardrobe-inline-body">
              <p><span>사이즈</span><strong>{activeItem.size || "-"}</strong></p>
              <p><span>시즌</span><strong>{toSeasonLabel(activeItem.season)}</strong></p>
              <p><span>두께</span><strong>{toThicknessLabel(activeItem.thickness)}</strong></p>
              <p><span>착용 횟수</span><strong>{itemCountText(activeWearCount)}</strong></p>
              <p><span>최근 착용일</span><strong>{formatRecentWearDate(activeRecentWearDate)}</strong></p>

              <div className="wardrobe-inline-size">
                <span>사이즈 표</span>
                {activeSizeGrid ? (
                  <div className="wardrobe-inline-size-wrap">
                    <table className="wardrobe-inline-size-table">
                      <thead>
                        <tr>
                          {activeSizeGridColumns.map((index) => (
                            <th key={`${activeSizeGrid.headers[index]}-${index}`}>
                              {activeSizeGrid.headers[index] || `열 ${index + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeSizeGrid.rows.map((row, rowIndex) => (
                          <tr key={`size-row-${rowIndex}`}>
                            {activeSizeGridColumns.map((colIndex) => (
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
              <h3>아이템 수정</h3>
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
                브랜드
                <input value={editForm.brand} onChange={(event) => setEditForm((prev) => ({ ...prev, brand: event.target.value }))} />
              </label>
              <label>
                아이템명
                <input value={editForm.product} onChange={(event) => setEditForm((prev) => ({ ...prev, product: event.target.value }))} />
              </label>
              <label>
                카테고리
                <select
                  value={editForm.category}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, category: event.target.value }))}
                >
                  <option value="">카테고리를 선택해 주세요</option>
                  {EDIT_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                사이즈
                <input
                  value={editForm.size}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, size: event.target.value, sizeDetail: prev.sizeDetail }))
                  }
                />
              </label>
            </div>

            {editError ? <p className="form-error">{editError}</p> : null}

            <div className="wardrobe-edit-actions">
              <button type="button" className="ghost-button" onClick={() => setEditItem(null)} disabled={editSaving}>
                취소
              </button>
              <button type="button" className="solid-button" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
