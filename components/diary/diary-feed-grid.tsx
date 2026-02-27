"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { KebabVerticalIcon } from "@/components/common/icons";
import type { DiaryFeedPost } from "@/lib/queries/diary";

function formatDisplayDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
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
                <img src={post.photo_path} alt={`Outfit post ${post.photo_id}`} className="diary-post-image" />
              </div>
            </div>
            <div className="wardrobe-info diary-post-info">
              <h3>{post.note || "Outfit entry"}</h3>
              {post.tag_items.length > 0 ? (
                <div className="diary-tag-list">
                  {post.tag_items.slice(0, 4).map((item) => (
                    <span key={`${post.photo_id}-${item.id}`}>{item.name}</span>
                  ))}
                </div>
              ) : (
                <span>No tags</span>
              )}
              <div className="diary-post-footer">
                <p className="diary-post-date">{formatDisplayDate(post.date)}</p>
                <p className="diary-post-weather">
                  {post.t_min ?? 0}C / {post.t_max ?? 0}C | {post.rain ? "Rain" : "No rain"}
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
              <img src={selectedPost.photo_path} alt={`Outfit post ${selectedPost.photo_id}`} />
            </div>
            <div className="diary-modal-body">
              <div className="diary-modal-head">
                <h2>{selectedPost.note || "Outfit entry"}</h2>
                <div className="diary-modal-menu-wrap">
                  <button
                    type="button"
                    className="diary-modal-menu-button"
                    aria-label="Open post menu"
                    onClick={() => setMenuOpen((prev) => !prev)}
                  >
                    <KebabVerticalIcon size={16} />
                  </button>
                  {menuOpen ? (
                    <div className="diary-modal-menu">
                      <Link href={`/outfits/${selectedPost.outfit_id}/edit`} className="diary-modal-menu-item">
                        Edit
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
              <p className="diary-modal-weather">
                {selectedPost.t_min ?? 0}C / {selectedPost.t_max ?? 0}C | {selectedPost.humidity ?? 0}% |{" "}
                {selectedPost.rain ? "Rain" : "No rain"}
              </p>
              {selectedPost.tag_items.length > 0 ? (
                <div className="diary-tag-list">
                  {selectedPost.tag_items.map((item) => (
                    <span key={`${selectedPost.photo_id}-${item.id}`}>{item.name}</span>
                  ))}
                </div>
              ) : (
                <p className="diary-modal-muted">No tags</p>
              )}
              <p className="diary-modal-date">{formatDisplayDate(selectedPost.date)}</p>
            </div>
          </article>
        </div>
      ) : null}
    </>
  );
}
