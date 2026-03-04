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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setSelectedPost(null);
      setMenuOpen(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <>
      <div className="wardrobe-grid">
        {posts.map((post) => (
          <article
            key={post.photo_id}
            className="wardrobe-card diary-post-card"
            role="button"
            tabIndex={0}
            onClick={() => {
              setSelectedPost(post);
              setMenuOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              setSelectedPost(post);
              setMenuOpen(false);
            }}
          >
            <div className="diary-post-open">
              <div className="wardrobe-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.photo_path} alt={`코디 게시물 ${post.photo_id}`} className="diary-post-image" />
              </div>
            </div>
            <div className="wardrobe-info diary-post-info">
              <h3>{post.note || "코디 기록"}</h3>
              {post.tag_items.length > 0 ? (
                <div className="diary-tag-list">
                  {post.tag_items.slice(0, 4).map((item) => (
                    <span key={`${post.photo_id}-${item.id}`}>{item.name}</span>
                  ))}
                </div>
              ) : (
                <span>태그 없음</span>
              )}
              <div className="diary-post-footer">
                <p className="diary-post-date">{formatDisplayDate(post.date)}</p>
                <p className="diary-post-weather">
                  {post.t_min ?? 0}C / {post.t_max ?? 0}C | {post.rain ? "비" : "비 없음"}
                </p>
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
            setMenuOpen(false);
          }}
        >
          <article className="diary-modal" onClick={(event) => event.stopPropagation()}>
            <div className="diary-modal-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedPost.photo_path} alt={`코디 게시물 ${selectedPost.photo_id}`} />
            </div>
            <div className="diary-modal-body">
              <div className="diary-modal-head">
                <h2>{selectedPost.note || "코디 기록"}</h2>
                <div className="diary-modal-menu-wrap">
                  <button
                    type="button"
                    className="diary-modal-menu-button"
                    aria-label="게시물 메뉴 열기"
                    onClick={() => setMenuOpen((prev) => !prev)}
                  >
                    <KebabVerticalIcon size={16} />
                  </button>
                  {menuOpen ? (
                    <div className="diary-modal-menu">
                      <Link href={`/outfits/${selectedPost.outfit_id}/edit`} className="diary-modal-menu-item">
                        수정
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
              <p className="diary-modal-weather">
                {selectedPost.t_min ?? 0}C / {selectedPost.t_max ?? 0}C | {selectedPost.humidity ?? 0}% |{" "}
                {selectedPost.rain ? "비" : "비 없음"}
              </p>
              {selectedPost.tag_items.length > 0 ? (
                <div className="diary-tag-list">
                  {selectedPost.tag_items.map((item) => (
                    <span key={`${selectedPost.photo_id}-${item.id}`}>{item.name}</span>
                  ))}
                </div>
              ) : (
                <p className="diary-modal-muted">태그 없음</p>
              )}
              <p className="diary-modal-date">{formatDisplayDate(selectedPost.date)}</p>
            </div>
          </article>
        </div>
      ) : null}
    </>
  );
}
