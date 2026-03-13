import Link from "next/link";
import { redirect } from "next/navigation";

import { ConfirmSubmitButton } from "@/components/common/confirm-submit-button";
import { OutfitDateCalendar } from "@/components/diary/outfit-date-calendar";
import { OutfitItemSelector } from "@/components/diary/outfit-item-selector";
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

export default async function OutfitEditPage({ params, searchParams }: OutfitEditPageProps) {
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
          <h1>코디 수정</h1>
        </div>
        <div className="outfit-header-actions">
          <Link href="/diary" className="ghost-button">
            취소
          </Link>
          <form action={`/api/outfits/${outfit.id}`} method="post">
            <input type="hidden" name="_action" value="delete" />
            <ConfirmSubmitButton
              className="danger-button outfit-header-danger"
              message="이 코디 게시물을 삭제할까요? 사진과 연결된 아이템 기록도 함께 삭제됩니다."
            >
              코디 삭제
            </ConfirmSubmitButton>
          </form>
          <button type="submit" form="outfitEditForm" className="solid-button">
            저장
          </button>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      <form
        id="outfitEditForm"
        action={`/api/outfits/${outfit.id}`}
        method="post"
        encType="multipart/form-data"
        className="outfit-form outfit-create-form"
      >
        <input type="hidden" name="_action" value="update" />

        <div className="outfit-create-media-card">
          <NewPhotoTagPicker
            inputName="photos"
            hiddenInputName="photo_tags_new_json"
            uploadedUrlsInputName="photo_urls_new_json"
            formId="outfitEditForm"
            label="코디 사진"
            existingPhotos={outfit.photos.map((photo) => ({
              id: photo.id,
              url: photo.photo_path,
            }))}
          />
        </div>

        <div className="outfit-create-fields-card">
          <div className="outfit-create-section-head">
            <p className="outfit-create-section-kicker">기록</p>
            <h2>코디 정보 수정</h2>
            <span>날짜, 메모, 입은 옷과 날씨를 다시 정리하세요.</span>
          </div>
          <label>
            날짜
            <OutfitDateCalendar name="date" defaultValue={outfit.date} />
          </label>
          <label>
            메모
            <textarea name="note" defaultValue={outfit.note || ""} rows={5} />
          </label>

          <OutfitItemSelector
            items={items.map((item) => ({
              id: item.id,
              name: item.name,
              category: item.category,
            }))}
            defaultSelectedIds={outfit.outfit_items.map((item) => item.id)}
          />

          <WeatherFields
            defaultCity="서울"
            defaultTMin={outfit.t_min ?? 0}
            defaultTMax={outfit.t_max ?? 0}
            defaultHumidity={outfit.humidity ?? 0}
            defaultRain={Boolean(outfit.rain)}
          />
        </div>
      </form>
    </section>
  );
}
