"use client";

import { useEffect, useRef, useState } from "react";
<<<<<<< HEAD
=======
import { createPortal } from "react-dom";
>>>>>>> ba39760731b40921cf98362c6de283d45fb95674

import { KebabVerticalIcon } from "@/components/common/icons";
import { OutfitItemSelector } from "@/components/diary/outfit-item-selector";
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
}

type DiaryFeedGridProps = {
  initialSelectedPostId?: number | null;
  posts: DiaryFeedPost[];
  wardrobeItems: WardrobeItem[];
};

<<<<<<< HEAD
function clearPostQueryParam() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("post")) return;
  url.searchParams.delete("post");
  const search = url.searchParams.toString();
  const nextUrl = `${url.pathname}${search ? `?${search}` : ""}${url.hash}`;
  window.history.replaceState({}, "", nextUrl);
}

export function DiaryFeedGrid({ initialSelectedPostId = null, posts, wardrobeItems }: DiaryFeedGridProps) {
  const [selectedPost, setSelectedPost] = useState<DiaryFeedPost | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [photoDragOffset, setPhotoDragOffset] = useState(0);
  const [isPhotoDragging, setIsPhotoDragging] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const photoFrameRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  function showPreviousPhoto() {
    if (!selectedPost || selectedPost.photos.length <= 1) return;
    setIsPhotoDragging(false);
    setPhotoDragOffset(0);
    setActivePhotoIndex((prev) => Math.max(prev - 1, 0));
  }

  function showNextPhoto() {
    if (!selectedPost || selectedPost.photos.length <= 1) return;
    setIsPhotoDragging(false);
    setPhotoDragOffset(0);
    setActivePhotoIndex((prev) => Math.min(prev + 1, selectedPost.photos.length - 1));
  }

  function handlePhotoTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (!selectedPost || selectedPost.photos.length <= 1) return;
    const touch = event.touches[0];
    if (!touch) return;
    setIsPhotoDragging(true);
    setPhotoDragOffset(0);
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handlePhotoTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (!selectedPost || selectedPost.photos.length <= 1 || !touchStartRef.current) return;

    const touch = event.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    if (Math.abs(deltaX) <= Math.abs(deltaY)) return;

    const frameWidth = photoFrameRef.current?.clientWidth ?? 1;
    const maxOffset = frameWidth * 0.35;
    const atFirstPhoto = activePhotoIndex === 0 && deltaX > 0;
    const atLastPhoto = activePhotoIndex === selectedPost.photos.length - 1 && deltaX < 0;
    const resistance = atFirstPhoto || atLastPhoto ? 0.35 : 1;

    setPhotoDragOffset(Math.max(Math.min(deltaX * resistance, maxOffset), -maxOffset));
  }

  function handlePhotoTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (!selectedPost || selectedPost.photos.length <= 1 || !touchStartRef.current) return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    setIsPhotoDragging(false);

    const frameWidth = photoFrameRef.current?.clientWidth ?? 1;
    const swipeThreshold = Math.min(Math.max(frameWidth * 0.18, 48), 120);

    if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaX) <= Math.abs(deltaY)) {
      setPhotoDragOffset(0);
      return;
    }

    if (deltaX < 0) {
      setPhotoDragOffset(0);
      showNextPhoto();
      return;
    }

    setPhotoDragOffset(0);
    showPreviousPhoto();
  }

  useEffect(() => {
    if (initialSelectedPostId == null) return;

    const initialPost = posts.find((post) => post.outfit_id === initialSelectedPostId) ?? null;
    if (!initialPost) {
      clearPostQueryParam();
      return;
    }

    setSelectedPost(initialPost);
    setActivePhotoIndex(0);
    setPhotoDragOffset(0);
    setIsPhotoDragging(false);
    setIsEditModalOpen(false);
  }, [initialSelectedPostId, posts]);
=======
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
>>>>>>> ba39760731b40921cf98362c6de283d45fb95674

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (isEditing) { setIsEditing(false); return; }
      if (menuOpen) { setMenuOpen(false); return; }
      setSelectedPost(null);
      setActivePhotoIndex(0);
      setPhotoDragOffset(0);
      setIsPhotoDragging(false);
      clearPostQueryParam();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
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
            onClick={() => {
              setSelectedPost(post);
              setActivePhotoIndex(0);
              setPhotoDragOffset(0);
              setIsPhotoDragging(false);
              setIsEditModalOpen(false);
              clearPostQueryParam();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              setSelectedPost(post);
              setActivePhotoIndex(0);
              setPhotoDragOffset(0);
              setIsPhotoDragging(false);
              setIsEditModalOpen(false);
              clearPostQueryParam();
=======
            onClick={() => openPost(post)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              openPost(post);
>>>>>>> ba39760731b40921cf98362c6de283d45fb95674
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
<<<<<<< HEAD
          onClick={() => {
            setSelectedPost(null);
            setActivePhotoIndex(0);
            setPhotoDragOffset(0);
            setIsPhotoDragging(false);
            clearPostQueryParam();
          }}
        >
          <article className="diary-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="diary-modal-back-button"
              aria-label="뒤로가기"
              onClick={() => {
                setSelectedPost(null);
                setActivePhotoIndex(0);
                setPhotoDragOffset(0);
                setIsPhotoDragging(false);
                clearPostQueryParam();
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
=======
          onClick={closeModal}
        >
          <article className="diary-modal" onClick={(event) => event.stopPropagation()}>
>>>>>>> ba39760731b40921cf98362c6de283d45fb95674
            <div className="diary-modal-media">
              {selectedPost.photos.length > 1 ? (
                <button
                  type="button"
                  className="diary-modal-photo-nav is-prev"
                  aria-label="이전 사진"
                  onClick={showPreviousPhoto}
                >
                  ‹
                </button>
              ) : null}
<<<<<<< HEAD
              <div
                ref={photoFrameRef}
                className="diary-modal-photo-frame"
                onTouchStart={handlePhotoTouchStart}
                onTouchMove={handlePhotoTouchMove}
                onTouchEnd={handlePhotoTouchEnd}
              >
                <div
                  className={`diary-modal-photo-track${isPhotoDragging ? " is-dragging" : ""}`}
                  style={{
                    transform: `translate3d(calc(${activePhotoIndex} * (-100% - var(--diary-modal-photo-gap)) + ${photoDragOffset}px), 0, 0)`,
                  }}
                >
                  {selectedPost.photos.map((photo, index) => (
                    <div key={photo.id} className="diary-modal-photo-slide">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.photo_path || ""}
                        alt={`코디 게시물 ${selectedPost.outfit_id} 사진 ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
=======
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPost.photos[activePhotoIndex]?.photo_path || ""}
                alt={`코디 게시물 ${selectedPost.outfit_id} 사진 ${activePhotoIndex + 1}`}
              />
>>>>>>> ba39760731b40921cf98362c6de283d45fb95674
              {selectedPost.photos.length > 1 ? (
                <button
                  type="button"
                  className="diary-modal-photo-nav is-next"
                  aria-label="다음 사진"
                  onClick={showNextPhoto}
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
            </div>
          </article>
        </div>
      ) : null}

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
      ) : null}
    </>
  );
}
