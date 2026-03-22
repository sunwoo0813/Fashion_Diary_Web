"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

import { ConfirmSubmitButton } from "@/components/common/confirm-submit-button";
import { KebabVerticalIcon, PlusIcon, TrashIcon } from "@/components/common/icons";
import { WardrobeCategoryFilter } from "@/components/wardrobe/wardrobe-category-filter";
import { useWardrobeDelete } from "@/components/wardrobe/wardrobe-delete-context";
import { WardrobeEditModal, type EditFormState } from "@/components/wardrobe/wardrobe-edit-modal";
import { WardrobeItemModal } from "@/components/wardrobe/wardrobe-item-modal";
import { WardrobeSearchBar } from "@/components/wardrobe/wardrobe-search-bar";
import type { WardrobeItem } from "@/lib/queries/wardrobe";

type WardrobeGridProps = {
  query: string;
  category: string;
  categoryCounts: Record<string, number>;
  items: WardrobeItem[];
  wearCounts: Record<number, number>;
  recentWearDates: Record<number, string>;
  hasFilters: boolean;
};

type ModalPosition = {
  top: number;
  left: number;
};


const MULTI_WORD_BRANDS = [
  "surface edition",
  "alexander wang",
  "comme des garcons",
  "maison margiela",
  "isabel marant",
  "ami paris",
  "acne studios",
  "studio nicholson",
  "rag and bone",
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

function getItemBrand(item: WardrobeItem): string {
  const brand = String(item.brand || "").trim();
  if (brand) return brand;
  return splitName(item.name).brand;
}

function getItemProductName(item: WardrobeItem): string {
  const productName = String(item.product_name || "").trim();
  if (productName) return productName;
  return splitName(item.name).product;
}


export function WardrobeGrid({
  query,
  category,
  categoryCounts,
  items,
  wearCounts,
  recentWearDates,
  hasFilters,
}: WardrobeGridProps) {
  const { deleteMode, selectedIds, toggleItem, handleDeleteButton } = useWardrobeDelete();
  const [localItems, setLocalItems] = useState<WardrobeItem[]>(items);
  const [activeItem, setActiveItem] = useState<WardrobeItem | null>(null);
  const [modalPosition, setModalPosition] = useState<ModalPosition | null>(null);
  const [editItem, setEditItem] = useState<WardrobeItem | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState<EditFormState>({
    brand: "",
    product: "",
    category: "",
    color: "",
    size: "",
    sizeDetail: null,
  });

  const [failedImageIds, setFailedImageIds] = useState<Set<number>>(new Set());

  const formRef = useRef<HTMLFormElement | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
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
    setEditItem(item);
    setEditError("");
    setEditForm({
      brand: getItemBrand(item) === "-" ? "" : getItemBrand(item),
      product: getItemProductName(item),
      category: item.category || "",
      color: item.color || "",
      size: item.size || "",
      sizeDetail: item.size_detail ?? null,
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
          color: editForm.color,
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
                brand: editForm.brand.trim() || null,
                product_name: editForm.product.trim() || null,
                name: nextName || row.name,
                category: nextCategory,
                color: editForm.color.trim() || null,
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
                brand: editForm.brand.trim() || null,
                product_name: editForm.product.trim() || null,
                name: nextName || prev.name,
                category: nextCategory,
                color: editForm.color.trim() || null,
                size: nextSize,
                size_detail: nextSizeDetail,
              }
            : prev,
        );
      }

      setEditItem(null);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "수정에 실패했어요.");
    } finally {
      setEditSaving(false);
    }
  }

  if (localItems.length === 0) {
    return (
      <div className="wardrobe-empty">
        {hasFilters ? "조건에 맞는 아이템이 아직 없어요." : "옷장이 아직 비어 있어요. 첫 아이템부터 차분히 채워 보세요."}
      </div>
    );
  }

  return (
    <div>
      <div className="wardrobe-mobile-toolbar">
        <div className="wardrobe-mobile-toolbar-row">
          <div className="wardrobe-mobile-search">
            <WardrobeSearchBar initialQuery={query} category={category} items={items} />
          </div>
          <Link href="/wardrobe/new" className="solid-button diary-icon-button" aria-label="새 아이템 추가">
            <PlusIcon size={18} />
          </Link>
          {!deleteMode || selectedIds.length === 0 ? (
            <button
              type="button"
              className={`ghost-button wardrobe-mobile-delete${deleteMode ? " is-delete-active" : ""}`}
              onClick={handleDeleteButton}
              aria-label="삭제 모드"
              aria-pressed={deleteMode}
            >
              <TrashIcon size={16} />
            </button>
          ) : (
            <ConfirmSubmitButton
              className="ghost-button wardrobe-mobile-delete is-delete-active"
              formId="wardrobeDeleteForm"
              title={`${selectedIds.length}개 아이템을 삭제할까요?`}
              message="삭제한 아이템은 되돌릴 수 없고, 관련 착용 기록 연결도 함께 정리됩니다."
              confirmLabel="삭제"
              cancelLabel="취소"
            >
              <TrashIcon size={16} />
            </ConfirmSubmitButton>
          )}
        </div>
        {deleteMode ? (
          <p className="wardrobe-mobile-delete-status">
            {selectedIds.length > 0 ? `${selectedIds.length}개 선택됨` : "삭제할 아이템을 선택하세요."}
          </p>
        ) : null}
        <div className="wardrobe-mobile-toolbar-filter">
          <WardrobeCategoryFilter query={query} category={category} counts={categoryCounts} mobileOnly />
        </div>
      </div>
      <form ref={formRef} id="wardrobeDeleteForm" action="/api/items/delete" method="post">
        {selectedIds.map((id) => (
          <input key={id} type="hidden" name="item_ids" value={id} />
        ))}
      </form>

      <div className="wardrobe-grid">
        {localItems.map((item) => {
          const selected = selectedSet.has(item.id);
          const brandLabel = getItemBrand(item);
          const productLabel = getItemProductName(item);
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
              <div className="wardrobe-media">
                <div className="wardrobe-media-canvas">
                  {item.image_path && !failedImageIds.has(item.id) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_path}
                      alt={item.name}
                      loading="lazy"
                      onError={() => setFailedImageIds((prev) => new Set(prev).add(item.id))}
                    />
                  ) : (
                    <div className="wardrobe-media-placeholder">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor" opacity="0.3"/>
                      </svg>
                      <span>이미지 없음</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="wardrobe-info">
                <div className="wardrobe-info-text">
                  <p title={brandLabel}>{brandLabel}</p>
                  <h3 title={productLabel}>{productLabel}</h3>
                </div>
                <button
                  type="button"
                  className="wardrobe-edit-icon"
                  aria-label={`${productLabel} 수정`}
                  onClick={(event) => {
                    event.stopPropagation();
                    openEditModal(item);
                  }}
                >
                  <KebabVerticalIcon size={15} />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {activeItem && modalPosition ? (
        <WardrobeItemModal
          item={activeItem}
          position={modalPosition}
          brandLabel={getItemBrand(activeItem)}
          productLabel={getItemProductName(activeItem)}
          wearCount={activeWearCount}
          recentWearDate={activeRecentWearDate}
          onClose={() => {
            setActiveItem(null);
            setModalPosition(null);
          }}
        />
      ) : null}

      {editItem ? (
        <WardrobeEditModal
          item={editItem}
          form={editForm}
          onChange={(updates) => setEditForm((prev) => ({ ...prev, ...updates }))}
          onSave={saveEdit}
          onCancel={() => setEditItem(null)}
          isSaving={editSaving}
          error={editError}
        />
      ) : null}
    </div>
  );
}
