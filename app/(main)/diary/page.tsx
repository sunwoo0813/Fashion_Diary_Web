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
        <div className="diary-feed-title-wrap" aria-label={`총 게시물 ${sortedPosts.length}개`}>
          <div className="diary-feed-title-copy">
            <h1>코디</h1>
            <div className="diary-feed-title-meta">
              <div className="diary-feed-title-icon">
                <GridIcon size={18} />
              </div>
              <p className="diary-feed-count">{sortedPosts.length}개 게시물</p>
            </div>
          </div>
        </div>
        <div className="diary-feed-actions">
          <Link href={`/outfits/new?date=${todayIso}`} className="solid-button diary-icon-button" aria-label="기록 만들기">
            <PlusIcon size={18} />
          </Link>
        </div>
      </header>

      {sortedPosts.length === 0 ? (
        <div className="diary-empty">
          <p>아직 업로드된 게시물이 없어요.</p>
          <Link href={`/outfits/new?date=${todayIso}`} className="solid-button">
            첫 게시물 만들기
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
