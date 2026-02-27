import Link from "next/link";

import { GridIcon, PlusIcon } from "@/components/common/icons";
import { DiaryFeedGrid } from "@/components/diary/diary-feed-grid";
import { requireAppUserContext } from "@/lib/app-user";
import { getDiaryFeedData } from "@/lib/queries/diary";

export default async function DiaryRootPage() {
  const { appUserId } = await requireAppUserContext();
  const posts = await getDiaryFeedData(appUserId, 120);
  const sortedPosts = [...posts].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    const byPhotoTime = (b.photo_created_at || "").localeCompare(a.photo_created_at || "");
    if (byPhotoTime !== 0) return byPhotoTime;
    return b.photo_id - a.photo_id;
  });
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <section className="diary-feed-page">
      <header className="diary-feed-header">
        <div className="diary-feed-title-wrap" aria-label={`Total posts ${sortedPosts.length}`}>
          <div className="diary-feed-title-icon">
            <GridIcon size={18} />
          </div>
          <p className="diary-feed-count">{sortedPosts.length} posts</p>
        </div>
        <div className="diary-feed-actions">
          <Link href={`/outfits/new?date=${todayIso}`} className="solid-button diary-icon-button" aria-label="Create entry">
            <PlusIcon size={18} />
          </Link>
        </div>
      </header>

      {sortedPosts.length === 0 ? (
        <div className="diary-empty">
          <p>No posts uploaded yet.</p>
          <Link href={`/outfits/new?date=${todayIso}`} className="solid-button">
            Create first post
          </Link>
        </div>
      ) : (
        <div className="diary-feed-scroll">
          <DiaryFeedGrid posts={sortedPosts} />
        </div>
      )}
    </section>
  );
}
