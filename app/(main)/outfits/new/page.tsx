import Link from "next/link";

import { OutfitItemSelector } from "@/components/diary/outfit-item-selector";
import { NewPhotoTagPicker } from "@/components/diary/new-photo-tag-picker";
import { WeatherFields } from "@/components/diary/weather-fields";
import { requireAppUserContext } from "@/lib/app-user";
import { getUserWardrobeItems } from "@/lib/queries/diary";

function readParam(value: string | string[] | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) return value[0] || "";
  return value;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type OutfitNewPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function OutfitNewPage({ searchParams }: OutfitNewPageProps) {
  const today = todayIso();
  const error = readParam(searchParams?.error ?? "").trim();

  const { appUserId } = await requireAppUserContext();
  const items = await getUserWardrobeItems(appUserId);

  return (
    <section className="outfit-new-page">
      <header className="outfit-header">
        <div>
          <h1>코디 기록</h1>
        </div>
        <div className="outfit-header-actions">
          <Link href="/diary" className="ghost-button">
            취소
          </Link>
          <button type="submit" form="outfitCreateForm" className="solid-button">
            저장
          </button>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      <form
        id="outfitCreateForm"
        action="/api/outfits"
        method="post"
        encType="multipart/form-data"
        className="outfit-form outfit-create-form"
      >
        <div className="outfit-create-media-card">
          <NewPhotoTagPicker
            inputName="photos"
            hiddenInputName="photo_tags_json"
            uploadedUrlsInputName="photo_urls_json"
            formId="outfitCreateForm"
            label="코디 사진"
          />
        </div>

        <div className="outfit-create-fields-card">
          <input type="hidden" name="date" value={today} />

          <WeatherFields defaultCity="서울" defaultTMin={0} defaultTMax={0} defaultHumidity={0} defaultRain={false} />

          <textarea
            name="note"
            className="outfit-caption"
            placeholder="오늘의 코디를 기록해 보세요..."
            rows={3}
          />

          <OutfitItemSelector
            items={items.map((item) => ({
              id: item.id,
              name: item.name,
              brand: item.brand,
              product_name: item.product_name,
              category: item.category,
              image_path: item.image_path,
            }))}
          />
        </div>
      </form>
    </section>
  );
}
