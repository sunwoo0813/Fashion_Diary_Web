import Link from "next/link";

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
  const dateParam = readParam(searchParams?.date).trim();
  const defaultDate = dateParam || todayIso();
  const error = readParam(searchParams?.error).trim();

  const { appUserId } = await requireAppUserContext();
  const items = await getUserWardrobeItems(appUserId);

  return (
    <section className="outfit-new-page">
      <header className="outfit-header">
        <div>
          <p className="diary-kicker">New Entry</p>
          <h1>Today&apos;s Look</h1>
        </div>
        <div className="outfit-header-actions">
          <Link href={`/diary/${defaultDate}`} className="ghost-button">
            Cancel
          </Link>
          <button type="submit" form="outfitCreateForm" className="solid-button">
            Publish
          </button>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      <form id="outfitCreateForm" action="/api/outfits" method="post" encType="multipart/form-data" className="outfit-form">
        <label>
          Date
          <input type="date" name="date" defaultValue={defaultDate} required />
        </label>
        <label>
          Note
          <textarea name="note" placeholder="How did this outfit make you feel?" rows={4} />
        </label>

        <WeatherFields defaultCity="Seoul" defaultTMin={0} defaultTMax={0} defaultHumidity={0} defaultRain={false} />

        <NewPhotoTagPicker
          items={items.map((item) => ({ id: item.id, name: item.name, category: item.category }))}
          inputName="photos"
          hiddenInputName="photo_tags_json"
          uploadedUrlsInputName="photo_urls_json"
          formId="outfitCreateForm"
          label="Upload Outfit Photos"
        />
      </form>
    </section>
  );
}
