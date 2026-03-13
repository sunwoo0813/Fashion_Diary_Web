"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { KebabVerticalIcon } from "@/components/common/icons";
import type { DiaryFeedPost } from "@/lib/queries/diary";

function formatDisplayDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

type DiaryFeedGridProps = {
  posts: DiaryFeedPost[];
};

export function DiaryFeedGrid({ posts }: DiaryFeedGridProps) {
  const [selectedPost, setSelectedPost] = useState<DiaryFeedPost | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setSelectedPost(null);
      setActivePhotoIndex(0);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

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
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              setSelectedPost(post);
              setActivePhotoIndex(0);
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPost.photos[activePhotoIndex]?.photo_path || ""}
                alt={`코디 게시물 ${selectedPost.outfit_id} 사진 ${activePhotoIndex + 1}`}
              />
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
                <Link
                  href={`/outfits/${selectedPost.outfit_id}/edit`}
                  className="diary-modal-menu-button"
                  aria-label="코디 수정"
                >
                  <KebabVerticalIcon size={16} />
                </Link>
              </div>
              <p className="diary-modal-weather">
                {selectedPost.t_min ?? 0}°C / {selectedPost.t_max ?? 0}°C | {selectedPost.humidity ?? 0}% |{" "}
                {selectedPost.rain ? "비" : "비 없음"}
              </p>
              {selectedPost.outfit_items.length > 0 ? (
                <div className="diary-tag-list">
                  {selectedPost.outfit_items.map((item) => (
                    <span key={`${selectedPost.outfit_id}-${item.id}`}>{item.name}</span>
                  ))}
                </div>
              ) : (
                <p className="diary-modal-muted">연결한 아이템 없음</p>
              )}
              <p className="diary-modal-date">{formatDisplayDate(selectedPost.date)}</p>
            </div>
          </article>
        </div>
      ) : null}
    </>
  );
}
