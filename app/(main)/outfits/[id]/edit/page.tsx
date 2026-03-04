import Link from "next/link";
import { redirect } from "next/navigation";

import { NewPhotoTagPicker } from "@/components/diary/new-photo-tag-picker";
import { WeatherFields } from "@/components/diary/weather-fields";
import { requireAppUserContext } from "@/lib/app-user";
import { getOutfitEditData } from "@/lib/queries/diary";

function readParam(value: string | string[] | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) return value[0] || "";
  return value;
}

type OutfitEditPageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function OutfitEditPage({
  params,
  searchParams,
}: OutfitEditPageProps) {
  const outfitId = Number(params.id);
  if (!Number.isInteger(outfitId) || outfitId <= 0) {
    redirect("/diary");
  }

  const { appUserId } = await requireAppUserContext();
  const data = await getOutfitEditData(appUserId, outfitId);
  if (!data) {
    redirect("/diary");
  }

  const error = readParam(searchParams?.error).trim();
  const outfit = data.outfit;
  const items = data.items;

  return (
    <section className="outfit-edit-page">
      <header className="outfit-header">
        <div>
          <p className="diary-kicker">기록 수정</p>
          <h1>코디 #{outfit.id}</h1>
        </div>
        <div className="outfit-header-actions">
          <Link href={`/diary/${outfit.date}`} className="ghost-button">
            해당 날짜로
          </Link>
          <button type="submit" form="outfitEditForm" className="solid-button">
            변경 저장
          </button>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      <form id="outfitEditForm" action={`/api/outfits/${outfit.id}`} method="post" encType="multipart/form-data" className="outfit-form">
        <input type="hidden" name="_action" value="update" />

        <label>
          날짜
          <input type="date" name="date" defaultValue={outfit.date} required />
        </label>
        <label>
          메모
          <textarea name="note" defaultValue={outfit.note || ""} rows={4} />
        </label>

        <WeatherFields
          defaultCity="서울"
          defaultTMin={outfit.t_min ?? 0}
          defaultTMax={outfit.t_max ?? 0}
          defaultHumidity={outfit.humidity ?? 0}
          defaultRain={Boolean(outfit.rain)}
        />

        <section className="existing-photo-section">
          <h2>기존 사진</h2>
          {outfit.photos.length === 0 ? (
            <p className="diary-no-photo">첨부된 사진이 없어요.</p>
          ) : (
            <div className="existing-photo-list">
              {outfit.photos.map((photo) => {
                const taggedIdSet = new Set(photo.tag_items.map((item) => item.id));
                return (
                  <article key={photo.id} className="existing-photo-card">
                    <div className="existing-photo-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.photo_path} alt={`사진 ${photo.id}`} />
                    </div>
                    <label className="existing-photo-delete">
                      <input type="checkbox" name="delete_photo_ids" value={photo.id} />
                      이 사진 삭제
                    </label>
                    <div className="existing-photo-tags">
                      {items.map((item) => (
                        <label key={`${photo.id}-${item.id}`} className="new-photo-tag">
                          <input
                            type="checkbox"
                            name={`existing_photo_tags_${photo.id}`}
                            value={item.id}
                            defaultChecked={taggedIdSet.has(item.id)}
                          />
                          <span>{item.name}</span>
                        </label>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <NewPhotoTagPicker
          items={items.map((item) => ({ id: item.id, name: item.name, category: item.category }))}
          inputName="photos"
          hiddenInputName="photo_tags_new_json"
          uploadedUrlsInputName="photo_urls_new_json"
          formId="outfitEditForm"
          label="새 사진 추가"
        />
      </form>

      <form action={`/api/outfits/${outfit.id}`} method="post">
        <input type="hidden" name="_action" value="delete" />
        <button type="submit" className="danger-button">
          코디 삭제
        </button>
      </form>
    </section>
  );
}
