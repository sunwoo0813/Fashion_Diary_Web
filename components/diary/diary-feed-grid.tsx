"use client";

<<<<<<< HEAD
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
=======
import { useEffect, useState } from "react";
>>>>>>> e52e4973fc9fa70dfcec1a27426c69ef75f03bbc

import { ConfirmSubmitButton } from "@/components/common/confirm-submit-button";
import { KebabVerticalIcon } from "@/components/common/icons";
<<<<<<< HEAD
import { OutfitItemSelector } from "@/components/diary/outfit-item-selector";
=======
import { OutfitDateCalendar } from "@/components/diary/outfit-date-calendar";
import { OutfitItemSelector } from "@/components/diary/outfit-item-selector";
import { NewPhotoTagPicker } from "@/components/diary/new-photo-tag-picker";
import { WeatherFields } from "@/components/diary/weather-fields";
>>>>>>> e52e4973fc9fa70dfcec1a27426c69ef75f03bbc
import type { DiaryFeedPost } from "@/lib/queries/diary";
import type { WardrobeItem } from "@/lib/queries/wardrobe";

function formatDisplayDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

<<<<<<< HEAD
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

function splitItemName(name: string): { brand: string; product: string } {
  const text = name.trim();
  if (!text) return { brand: "", product: "이름 없음" };
  const parts = text.split(/\s+/);
  if (parts.length === 1) return { brand: parts[0], product: parts[0] };
  const brandWordCount = detectBrandWordCount(parts);
  return {
    brand: parts.slice(0, brandWordCount).join(" "),
    product: parts.slice(brandWordCount).join(" ") || text,
  };
=======
function ChevronBackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 13H6L5 6" />
      <path d="M10 10v6" />
      <path d="M14 10v6" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6.75 3.75h10.5a.75.75 0 0 1 .75.75v15.12a.375.375 0 0 1-.608.294L12 15.75l-5.392 4.161A.375.375 0 0 1 6 19.62V4.5a.75.75 0 0 1 .75-.75Z" />
    </svg>
  );
>>>>>>> e52e4973fc9fa70dfcec1a27426c69ef75f03bbc
}

type DiaryFeedGridProps = {
  posts: DiaryFeedPost[];
<<<<<<< HEAD
  wardrobeItems: WardrobeItem[];
};

export function DiaryFeedGrid({ posts, wardrobeItems }: DiaryFeedGridProps) {
  const [localPosts, setLocalPosts] = useState(posts);
  const [selectedPost, setSelectedPost] = useState<DiaryFeedPost | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editNote, setEditNote] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => { setIsMounted(true); }, []);
=======
  wardrobeItems: Array<{
    id: number;
    name: string;
    category: string | null;
  }>;
};

export function DiaryFeedGrid({ posts, wardrobeItems }: DiaryFeedGridProps) {
  const [selectedPost, setSelectedPost] = useState<DiaryFeedPost | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
>>>>>>> e52e4973fc9fa70dfcec1a27426c69ef75f03bbc

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
<<<<<<< HEAD
      if (isEditing) { setIsEditing(false); return; }
      if (menuOpen) { setMenuOpen(false); return; }
=======
      if (isEditModalOpen) {
        setIsEditModalOpen(false);
        return;
      }
>>>>>>> e52e4973fc9fa70dfcec1a27426c69ef75f03bbc
      setSelectedPost(null);
      setActivePhotoIndex(0);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
<<<<<<< HEAD
  }, [isEditing, menuOpen]);

  function openPost(post: DiaryFeedPost) {
    setSelectedPost(post);
    setActivePhotoIndex(0);
    setMenuOpen(false);
    setIsEditing(false);
  }

  function closeModal() {
    setSelectedPost(null);
    setActivePhotoIndex(0);
    setMenuOpen(false);
    setIsEditing(false);
  }

  function handleMenuOpen() {
    if (!menuButtonRef.current) return;
    const rect = menuButtonRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    setMenuOpen((v) => !v);
  }

  function enterEditMode() {
    if (!selectedPost) return;
    setEditNote(selectedPost.note || "");
    setIsEditing(true);
    setMenuOpen(false);
  }

  async function handleDelete() {
    if (!selectedPost) return;
    if (!confirm("이 코디를 삭제할까요?")) return;
    setIsSubmitting(true);
    try {
      await fetch(`/api/outfits/${selectedPost.outfit_id}`, { method: "DELETE" });
      setLocalPosts((prev) => prev.filter((p) => p.outfit_id !== selectedPost.outfit_id));
      closeModal();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSave() {
    if (!selectedPost || !formRef.current) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData(formRef.current);
      const itemIds = formData.getAll("outfit_item_ids").map(Number).filter(Boolean);

      const response = await fetch(`/api/outfits/${selectedPost.outfit_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: editNote || null,
          outfit_item_ids: itemIds,
          t_min: selectedPost.t_min,
          t_max: selectedPost.t_max,
          humidity: selectedPost.humidity ?? 0,
          rain: selectedPost.rain ?? false,
        }),
      });
      if (!response.ok) return;

      const updatedItems = itemIds
        .map((id) => wardrobeItems.find((w) => w.id === id))
        .filter(Boolean)
        .map((w) => ({
          id: w!.id,
          name: w!.name,
          category: w!.category,
          image_path: w!.image_path ?? null,
        }));

      const updatedPost: DiaryFeedPost = {
        ...selectedPost,
        note: editNote || null,
        outfit_items: updatedItems,
      };

      setSelectedPost(updatedPost);
      setLocalPosts((prev) =>
        prev.map((p) => (p.outfit_id === selectedPost.outfit_id ? updatedPost : p)),
      );
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectorItems = wardrobeItems.map((item) => ({
    id: item.id,
    name: item.name,
    brand: item.brand,
    product_name: item.product_name,
    category: item.category,
    image_path: item.image_path,
  }));
=======
  }, [isEditModalOpen]);
>>>>>>> e52e4973fc9fa70dfcec1a27426c69ef75f03bbc

  return (
    <>
      <div className="wardrobe-grid">
        {localPosts.map((post) => (
          <article
            key={post.outfit_id}
            className="diary-post-card"
            role="button"
            tabIndex={0}
<<<<<<< HEAD
            onClick={() => openPost(post)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              openPost(post);
=======
            onClick={() => {
              setSelectedPost(post);
              setActivePhotoIndex(0);
              setIsEditModalOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              setSelectedPost(post);
              setActivePhotoIndex(0);
              setIsEditModalOpen(false);
>>>>>>> e52e4973fc9fa70dfcec1a27426c69ef75f03bbc
            }}
          >
            <div className="diary-post-shell">
              <div className="diary-post-open">
                <div className="diary-post-media">
                  {post.photos[0]?.photo_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.photos[0].photo_path} alt={`코디 게시물 ${post.outfit_id}`} className="diary-post-image" />
                  ) : (
                    <div className="diary-post-placeholder">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" stroke="currentColor" strokeWidth="1.4"/>
                        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" opacity="0.4"/>
                        <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="diary-post-overlay" />
                <div className="diary-post-info">
                  <p className="diary-post-date-badge">{formatDisplayDate(post.date)}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {selectedPost ? (
        <div
          className="diary-modal-backdrop"
          onClick={closeModal}
        >
          <article className="diary-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="diary-modal-back-button"
              aria-label="뒤로가기"
              onClick={() => {
                setSelectedPost(null);
                setActivePhotoIndex(0);
              }}
            >
              <ChevronBackIcon />
            </button>
            <button
              type="button"
              className="diary-modal-menu-button diary-modal-menu-button-floating"
              aria-label="코디 수정"
              onClick={(event) => {
                event.preventDefault();
                setIsEditModalOpen(true);
              }}
            >
              <KebabVerticalIcon size={16} />
            </button>
            <div className="diary-modal-media">
              {selectedPost.photos.length > 1 ? (
                <button
                  type="button"
                  className="diary-modal-photo-nav is-prev"
                  aria-label="이전 사진"
                  onClick={() =>
                    setActivePhotoIndex((prev) => (prev - 1 + selectedPost.photos.length) % selectedPost.photos.length)
                  }
                >
                  ‹
                </button>
              ) : null}
              <div className="diary-modal-photo-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedPost.photos[activePhotoIndex]?.photo_path || ""}
                  alt={`코디 게시물 ${selectedPost.outfit_id} 사진 ${activePhotoIndex + 1}`}
                />
              </div>
              {selectedPost.photos.length > 1 ? (
                <button
                  type="button"
                  className="diary-modal-photo-nav is-next"
                  aria-label="다음 사진"
                  onClick={() => setActivePhotoIndex((prev) => (prev + 1) % selectedPost.photos.length)}
                >
                  ›
                </button>
              ) : null}
              {selectedPost.photos.length > 1 ? (
                <p className="diary-modal-photo-counter">
                  {activePhotoIndex + 1} / {selectedPost.photos.length}
                </p>
              ) : null}
            </div>

            <div className="diary-modal-body">
              <div className="diary-modal-head">
<<<<<<< HEAD
                <div>
                  <p className="diary-modal-date">
                    {formatDisplayDate(selectedPost.date)}
                    {selectedPost.city ? <span className="diary-modal-city">{selectedPost.city}</span> : null}
                  </p>
                  {selectedPost.t_min != null || selectedPost.t_max != null ? (
                    <p className="diary-modal-weather">
                      최저 {selectedPost.t_min ?? "?"}° · 최고 {selectedPost.t_max ?? "?"}°
                    </p>
                  ) : null}
=======
                <h2>{selectedPost.note || "코디 기록"}</h2>
              </div>
              {selectedPost.outfit_items.length > 0 ? (
                <div className="diary-tag-list">
                  {selectedPost.outfit_items.map((item) => (
                    <span key={`${selectedPost.outfit_id}-${item.id}`}>{item.name}</span>
                  ))}
>>>>>>> e52e4973fc9fa70dfcec1a27426c69ef75f03bbc
                </div>
                <div className="diary-modal-menu-wrap">
                  {isEditing ? (
                    <div className="diary-modal-edit-actions">
                      <button type="button" className="ghost-button" onClick={() => setIsEditing(false)}>
                        취소
                      </button>
                      <button type="button" className="solid-button" onClick={handleSave} disabled={isSubmitting}>
                        저장
                      </button>
                    </div>
                  ) : (
                    <button
                      ref={menuButtonRef}
                      type="button"
                      className="diary-modal-menu-button"
                      aria-label="더보기"
                      onClick={handleMenuOpen}
                    >
                      <KebabVerticalIcon size={16} />
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <textarea
                  className="diary-modal-note-input"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="코디를 기록해 보세요..."
                  rows={3}
                />
              ) : (
                selectedPost.note ? <p className="diary-modal-note">{selectedPost.note}</p> : null
              )}

              {isEditing ? (
                <form ref={formRef}>
                  <OutfitItemSelector
                    items={selectorItems}
                    defaultSelectedIds={selectedPost.outfit_items.map((i) => i.id)}
                  />
                </form>
              ) : (
                selectedPost.outfit_items.length > 0 ? (
                  <div className="diary-modal-items-section">
                    <p className="diary-modal-items-label">착용 아이템</p>
                    <div className="diary-modal-items-list">
                      {selectedPost.outfit_items.map((item) => {
                        const { brand, product } = splitItemName(item.name);
                        return (
                          <div key={`${selectedPost.outfit_id}-${item.id}`} className="diary-modal-item-row">
                            <div className="diary-modal-item-thumb">
                              {item.image_path ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.image_path} alt={item.name} />
                              ) : (
                                <div className="diary-modal-item-placeholder">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" stroke="currentColor" strokeWidth="1.4"/>
                                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" opacity="0.4"/>
                                    <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="diary-modal-item-info">
                              {brand && product !== brand ? <small className="diary-modal-item-brand">{brand}</small> : null}
                              <span className="diary-modal-item-name">{product}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="diary-modal-muted">연결한 아이템 없음</p>
                )
              )}
<<<<<<< HEAD
=======
              <div className="diary-modal-meta">
                <p className="diary-modal-date">{formatDisplayDate(selectedPost.date)}</p>
                <p className="diary-modal-weather">
                  {selectedPost.t_min ?? 0}°C / {selectedPost.t_max ?? 0}°C | {selectedPost.humidity ?? 0}% |{" "}
                  {selectedPost.rain ? "비" : "비 없음"}
                </p>
              </div>
>>>>>>> e52e4973fc9fa70dfcec1a27426c69ef75f03bbc
            </div>
          </article>
        </div>
      ) : null}

<<<<<<< HEAD
      {isMounted && menuOpen && menuPos ? createPortal(
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 200 }}
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="diary-modal-menu"
            style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 201 }}
          >
            <button type="button" className="diary-modal-menu-item" onClick={enterEditMode}>
              수정
            </button>
            <button
              type="button"
              className="diary-modal-menu-item is-danger"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              삭제
            </button>
          </div>
        </>,
        document.body,
=======
      {selectedPost && isEditModalOpen ? (
        <div className="diary-edit-modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="diary-edit-modal" onClick={(event) => event.stopPropagation()}>
            <header className="diary-edit-modal-head">
              <div className="diary-edit-modal-title-wrap">
                <button
                  type="button"
                  className="diary-edit-modal-back-button"
                  aria-label="수정 닫기"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  <ChevronBackIcon />
                </button>
                <div className="diary-edit-modal-title-block">
                  <h2>Edit</h2>
                </div>
              </div>
              <div className="diary-edit-modal-actions">
                <form action={`/api/outfits/${selectedPost.outfit_id}`} method="post">
                  <input type="hidden" name="_action" value="delete" />
                  <ConfirmSubmitButton
                    className="danger-button outfit-header-danger"
                    message="이 코디 게시물을 삭제할까요? 사진과 연결된 아이템 기록도 함께 삭제됩니다."
                  >
                    <span className="diary-edit-action-icon" aria-hidden>
                      <TrashIcon />
                    </span>
                  </ConfirmSubmitButton>
                </form>
                <button
                  type="submit"
                  form={`diaryEditForm-${selectedPost.outfit_id}`}
                  className="solid-button"
                  aria-label="저장"
                >
                  <span className="diary-edit-action-icon" aria-hidden>
                    <BookmarkIcon />
                  </span>
                </button>
              </div>
            </header>

            <form
              id={`diaryEditForm-${selectedPost.outfit_id}`}
              action={`/api/outfits/${selectedPost.outfit_id}`}
              method="post"
              encType="multipart/form-data"
              className="outfit-form diary-edit-form"
            >
              <input type="hidden" name="_action" value="update" />

              <div className="outfit-create-media-card">
                <NewPhotoTagPicker
                  inputName="photos"
                  hiddenInputName="photo_tags_new_json"
                  uploadedUrlsInputName="photo_urls_new_json"
                  formId={`diaryEditForm-${selectedPost.outfit_id}`}
                  label="코디 사진"
                  existingPhotos={selectedPost.photos.map((photo) => ({
                    id: photo.id,
                    url: photo.photo_path,
                  }))}
                />
              </div>

              <div className="outfit-create-fields-card">
                <div className="outfit-create-section-head">
                  <p className="outfit-create-section-kicker">기록</p>
                  <h2>코디 정보 수정</h2>
                  <span>날짜, 메모, 착용 아이템과 날씨를 여기서 바로 수정하세요.</span>
                </div>
                <label>
                  날짜
                  <OutfitDateCalendar name="date" defaultValue={selectedPost.date} />
                </label>
                <label>
                  메모
                  <textarea name="note" defaultValue={selectedPost.note || ""} rows={5} />
                </label>

                <OutfitItemSelector
                  items={wardrobeItems}
                  defaultSelectedIds={selectedPost.outfit_items.map((item) => item.id)}
                />

                <WeatherFields
                  defaultCity="서울"
                  defaultTMin={selectedPost.t_min ?? 0}
                  defaultTMax={selectedPost.t_max ?? 0}
                  defaultHumidity={selectedPost.humidity ?? 0}
                  defaultRain={Boolean(selectedPost.rain)}
                />
              </div>
            </form>
          </div>
        </div>
>>>>>>> e52e4973fc9fa70dfcec1a27426c69ef75f03bbc
      ) : null}
    </>
  );
}
