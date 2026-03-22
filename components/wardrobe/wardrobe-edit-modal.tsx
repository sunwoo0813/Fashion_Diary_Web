"use client";

import type { WardrobeItem } from "@/lib/queries/wardrobe";

export type EditFormState = {
  brand: string;
  product: string;
  category: string;
  color: string;
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

type WardrobeEditModalProps = {
  item: WardrobeItem;
  form: EditFormState;
  onChange: (updates: Partial<EditFormState>) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  error: string;
};

export function WardrobeEditModal({
  item,
  form,
  onChange,
  onSave,
  onCancel,
  isSaving,
  error,
}: WardrobeEditModalProps) {
  return (
    <div
      className="wardrobe-edit-modal-layer"
      onClick={() => {
        if (isSaving) return;
        onCancel();
      }}
    >
      <section className="wardrobe-edit-modal" onClick={(event) => event.stopPropagation()}>
        <header className="wardrobe-edit-head">
          <div className="wardrobe-edit-head-left">
            <div className="wardrobe-edit-thumb">
              {item.image_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_path} alt={item.name} />
              ) : (
                <div className="wardrobe-edit-thumb-fallback">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor" opacity="0.3" />
                  </svg>
                </div>
              )}
            </div>
            <div>
              <h3>아이템 수정</h3>
              <p className="wardrobe-edit-item-name">{item.name}</p>
            </div>
          </div>
          <button
            type="button"
            className="wardrobe-inline-close"
            onClick={() => {
              if (isSaving) return;
              onCancel();
            }}
          >
            ×
          </button>
        </header>

        <div className="wardrobe-edit-form">
          <label>
            브랜드
            <input value={form.brand} onChange={(event) => onChange({ brand: event.target.value })} />
          </label>
          <label>
            아이템명
            <input value={form.product} onChange={(event) => onChange({ product: event.target.value })} />
          </label>
          <label>
            카테고리
            <select
              value={form.category}
              onChange={(event) => onChange({ category: event.target.value })}
            >
              <option value="">카테고리를 선택해 주세요</option>
              {EDIT_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="wardrobe-edit-row">
            <label>
              색상
              <input
                value={form.color}
                placeholder="예) 블랙, 화이트"
                onChange={(event) => onChange({ color: event.target.value })}
              />
            </label>
            <label>
              사이즈
              <input
                value={form.size}
                onChange={(event) => onChange({ size: event.target.value })}
              />
            </label>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="wardrobe-edit-actions">
          <button type="button" className="ghost-button" onClick={onCancel} disabled={isSaving}>
            취소
          </button>
          <button type="button" className="solid-button" onClick={onSave} disabled={isSaving}>
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </section>
    </div>
  );
}
