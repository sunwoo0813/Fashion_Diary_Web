import Link from "next/link";

import { PlusIcon } from "@/components/common/icons";
import { DiaryFeedGrid } from "@/components/diary/diary-feed-grid";
import { requireAppUserContext } from "@/lib/app-user";
import { getDiaryFeedData, getUserWardrobeItems } from "@/lib/queries/diary";

export default async function DiaryRootPage() {
  const { appUserId } = await requireAppUserContext();
  const [posts, wardrobeItems] = await Promise.all([
    getDiaryFeedData(appUserId, 120),
    getUserWardrobeItems(appUserId),
  ]);

  const sortedPosts = [...posts].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    const byCreatedAt = (b.created_at || "").localeCompare(a.created_at || "");
    if (byCreatedAt !== 0) return byCreatedAt;
    return b.outfit_id - a.outfit_id;
  });

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <section className="diary-feed-page">
      <header className="diary-feed-header">
        <div className="diary-feed-title-wrap">
          <div className="diary-feed-title-copy">
            <h1>OOTD</h1>
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
          <Link href={`/outfits/new?date=${todayIso}`} className="solid-button">
            첫 기록 남기기
          </Link>
        </div>
      ) : (
        <div className="diary-feed-scroll">
          <DiaryFeedGrid posts={sortedPosts} wardrobeItems={wardrobeItems} />
        </div>
      )}
    </section>
  );
}
