export type CropDraft = {
  file: File;
  objectUrl: string;
  imageWidth: number;
  imageHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

const CROP_OUTPUT_WIDTH = 1200;
const CROP_OUTPUT_HEIGHT = 1500;

export function loadImageDimensions(objectUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
    image.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    image.src = objectUrl;
  });
}

export async function cropImageFile(
  draft: CropDraft,
  viewportWidth: number,
  viewportHeight: number,
): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = CROP_OUTPUT_WIDTH;
  canvas.height = CROP_OUTPUT_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("이미지 편집을 시작할 수 없습니다.");
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    nextImage.src = draft.objectUrl;
  });

  const baseScale = Math.max(viewportWidth / draft.imageWidth, viewportHeight / draft.imageHeight);
  const displayWidth = draft.imageWidth * baseScale * draft.zoom;
  const displayHeight = draft.imageHeight * baseScale * draft.zoom;
  const imageLeft = (viewportWidth - displayWidth) / 2 + draft.offsetX;
  const imageTop = (viewportHeight - displayHeight) / 2 + draft.offsetY;

  const sourceX = ((0 - imageLeft) / displayWidth) * draft.imageWidth;
  const sourceY = ((0 - imageTop) / displayHeight) * draft.imageHeight;
  const sourceWidth = (viewportWidth / displayWidth) * draft.imageWidth;
  const sourceHeight = (viewportHeight / displayHeight) * draft.imageHeight;

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  context.drawImage(
    image,
    clamp(sourceX, 0, draft.imageWidth),
    clamp(sourceY, 0, draft.imageHeight),
    clamp(sourceWidth, 1, draft.imageWidth),
    clamp(sourceHeight, 1, draft.imageHeight),
    0,
    0,
    CROP_OUTPUT_WIDTH,
    CROP_OUTPUT_HEIGHT,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (!nextBlob) {
        reject(new Error("이미지를 자르지 못했습니다."));
        return;
      }
      resolve(nextBlob);
    }, draft.file.type || "image/jpeg", 0.92);
  });

  const extension = draft.file.name.includes(".") ? draft.file.name.slice(draft.file.name.lastIndexOf(".")) : ".jpg";
  const croppedName = draft.file.name.replace(/\.[^.]+$/, "") || "cropped-photo";
  return new File([blob], `${croppedName}-cropped${extension}`, {
    type: blob.type || draft.file.type || "image/jpeg",
    lastModified: Date.now(),
  });
}

export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
) {
  const limit = Math.max(1, Math.min(concurrency, items.length));
  let cursor = 0;

  const runners = Array.from({ length: limit }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  });

  await Promise.all(runners);
}
