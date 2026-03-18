"use client";

import { useEffect, useState } from "react";

import { ConfirmSubmitButton } from "@/components/common/confirm-submit-button";
import { KebabVerticalIcon } from "@/components/common/icons";
import { OutfitDateCalendar } from "@/components/diary/outfit-date-calendar";
import { OutfitItemSelector } from "@/components/diary/outfit-item-selector";
import { NewPhotoTagPicker } from "@/components/diary/new-photo-tag-picker";
import { WeatherFields } from "@/components/diary/weather-fields";
import type { DiaryFeedPost } from "@/lib/queries/diary";

function formatDisplayDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

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
}

type DiaryFeedGridProps = {
  posts: DiaryFeedPost[];
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

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (isEditModalOpen) {
        setIsEditModalOpen(false);
        return;
      }
      setSelectedPost(null);
      setActivePhotoIndex(0);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isEditModalOpen]);

  return (
    <>
      <div className="wardrobe-grid">
        {posts.map((post) => (
          <article
            key={post.outfit_id}
            className="diary-post-card"
            role="button"
            tabIndex={0}
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
            }}
          >
            <div className="diary-post-shell">
              <div className="diary-post-open">
                <div className="diary-post-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.photos[0]?.photo_path || ""} alt={`코디 게시물 ${post.outfit_id}`} className="diary-post-image" />
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
          onClick={() => {
            setSelectedPost(null);
            setActivePhotoIndex(0);
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
                <h2>{selectedPost.note || "코디 기록"}</h2>
              </div>
              {selectedPost.outfit_items.length > 0 ? (
                <div className="diary-tag-list">
                  {selectedPost.outfit_items.map((item) => (
                    <span key={`${selectedPost.outfit_id}-${item.id}`}>{item.name}</span>
                  ))}
                </div>
              ) : (
                <p className="diary-modal-muted">연결한 아이템 없음</p>
              )}
              <div className="diary-modal-meta">
                <p className="diary-modal-date">{formatDisplayDate(selectedPost.date)}</p>
                <p className="diary-modal-weather">
                  {selectedPost.t_min ?? 0}°C / {selectedPost.t_max ?? 0}°C | {selectedPost.humidity ?? 0}% |{" "}
                  {selectedPost.rain ? "비" : "비 없음"}
                </p>
              </div>
            </div>
          </article>
        </div>
      ) : null}

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
      ) : null}
    </>
  );
}
