"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";

import {
  cropImageFile,
  loadImageDimensions,
  runWithConcurrency,
  type CropDraft,
} from "@/lib/diary/photo-utils";

type ExistingPhoto = {
  id: number;
  url: string;
};

type NewPhotoTagPickerProps = {
  inputName: string;
  hiddenInputName: string;
  uploadedUrlsInputName: string;
  formId: string;
  label?: string;
  existingPhotos?: ExistingPhoto[];
  deletedInputName?: string;
};

type NewPhotoEntry = {
  kind: "new";
  key: string;
  file: File;
  previewUrl: string;
};

type ExistingPhotoEntry = {
  kind: "existing";
  key: string;
  id: number;
  previewUrl: string;
};

type PhotoEntry = NewPhotoEntry | ExistingPhotoEntry;

type UploadTicketResponse = {
  ok?: boolean;
  error?: string;
  tickets?: Array<{
    signedUrl?: string;
    publicUrl?: string;
  }>;
  ticket?: {
    signedUrl?: string;
    publicUrl?: string;
  };
};

const MAX_SINGLE_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 80 * 1024 * 1024;
const UPLOAD_CONCURRENCY = 3;

function ImagePlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M15 8h.01" />
      <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="m4 15 4-4c.6-.6 1.4-.6 2 0l5 5" />
      <path d="m14 13 1-1c.6-.6 1.4-.6 2 0l3 3" />
      <path d="M12 8v6" />
      <path d="M9 11h6" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 16V6" />
      <path d="m7 11 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 13H6L5 6" />
      <path d="M10 10v6" />
      <path d="M14 10v6" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function makeFileKey(file: File, index: number): string {
  return `${file.name}|${file.size}|${file.lastModified}|${index}`;
}

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toExistingEntries(existingPhotos: ExistingPhoto[]): ExistingPhotoEntry[] {
  return existingPhotos.map((photo) => ({
    kind: "existing",
    key: `existing-${photo.id}`,
    id: photo.id,
    previewUrl: photo.url,
  }));
}

export function NewPhotoTagPicker({
  inputName,
  hiddenInputName,
  uploadedUrlsInputName,
  formId,
  label = "사진 업로드",
  existingPhotos = [],
  deletedInputName = "delete_photo_ids",
}: NewPhotoTagPickerProps) {
  const [entries, setEntries] = useState<PhotoEntry[]>(() => toExistingEntries(existingPhotos));
  const [deletedExistingIds, setDeletedExistingIds] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [pendingCropFiles, setPendingCropFiles] = useState<File[]>([]);
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const [cropError, setCropError] = useState("");
  const [isCropSaving, setIsCropSaving] = useState(false);
  const [cropViewport, setCropViewport] = useState({ width: 0, height: 0 });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadedUrlsRef = useRef<HTMLInputElement | null>(null);
  const previousEntriesRef = useRef<PhotoEntry[]>([]);
  const cropViewportRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

  const newEntries = useMemo(
    () => entries.filter((entry): entry is NewPhotoEntry => entry.kind === "new"),
    [entries],
  );

  useEffect(() => {
    const previousEntries = previousEntriesRef.current;
    const currentKeys = new Set(entries.map((entry) => entry.key));

    previousEntries.forEach((entry) => {
      if (entry.kind === "new" && !currentKeys.has(entry.key)) {
        URL.revokeObjectURL(entry.previewUrl);
      }
    });

    previousEntriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    return () => {
      previousEntriesRef.current.forEach((entry) => {
        if (entry.kind === "new") {
          URL.revokeObjectURL(entry.previewUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    setUploadedUrls([]);
    setUploadError("");
    setUploadProgress({ done: 0, total: 0 });
  }, [newEntries]);

  useEffect(() => {
    if (!cropDraft) return;

    function updateViewport() {
      const element = cropViewportRef.current;
      if (!element) return;
      setCropViewport({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, [cropDraft]);

  useEffect(() => {
    if (entries.length === 0) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex((prev) => Math.min(prev, entries.length - 1));
  }, [entries]);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;

    const onSubmit = async (event: Event) => {
      if (!(event instanceof SubmitEvent)) return;
      if (form.dataset.photoUploadReady === "1") {
        delete form.dataset.photoUploadReady;
        return;
      }
      if (newEntries.length === 0) return;
      if (uploadedUrls.length === newEntries.length && uploadedUrls.length > 0) return;

      event.preventDefault();
      if (isUploading) return;

      setUploadError("");
      setIsUploading(true);
      setUploadProgress({ done: 0, total: newEntries.length });

      try {
        const ticketResponse = await fetch("/api/outfits/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: newEntries.map((entry) => ({
              fileName: entry.file.name,
              fileSize: entry.file.size,
              contentType: entry.file.type,
            })),
          }),
        });

        const ticketBody = (await ticketResponse.json()) as UploadTicketResponse;
        const ticketList = Array.isArray(ticketBody.tickets)
          ? ticketBody.tickets
          : ticketBody.ticket
            ? [ticketBody.ticket]
            : [];

        if (!ticketResponse.ok || !ticketBody.ok || ticketList.length !== newEntries.length) {
          throw new Error("사진 업로드 준비에 실패했어요.");
        }

        const nextUrls: string[] = new Array(newEntries.length);
        await runWithConcurrency(newEntries, UPLOAD_CONCURRENCY, async (entry, index) => {
          const ticket = ticketList[index];
          const signedUrl = String(ticket?.signedUrl || "").trim();
          const publicUrl = String(ticket?.publicUrl || "").trim();

          if (!signedUrl || !publicUrl) {
            throw new Error("업로드 주소가 올바르지 않아요.");
          }

          const body = new FormData();
          body.append("cacheControl", "3600");
          body.append("", entry.file);

          const uploadResponse = await fetch(signedUrl, {
            method: "PUT",
            headers: { "x-upsert": "false" },
            body,
          });

          if (!uploadResponse.ok) {
            throw new Error(`사진 업로드에 실패했어요. (상태 코드: ${uploadResponse.status})`);
          }

          nextUrls[index] = publicUrl;
          setUploadProgress((prev) => ({ ...prev, done: Math.min(prev.total, prev.done + 1) }));
        });

        if (uploadedUrlsRef.current) {
          uploadedUrlsRef.current.value = JSON.stringify(nextUrls);
        }
        setUploadedUrls(nextUrls);

        form.dataset.photoUploadReady = "1";
        const submitter = event.submitter;
        if (submitter instanceof HTMLElement) {
          form.requestSubmit(submitter);
        } else {
          form.requestSubmit();
        }
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "사진 업로드에 실패했어요.");
      } finally {
        setIsUploading(false);
      }
    };

    form.addEventListener("submit", onSubmit);
    return () => {
      form.removeEventListener("submit", onSubmit);
    };
  }, [formId, isUploading, newEntries, uploadedUrls]);

  const appendEntries = useCallback(
    (selected: File[]) => {
      const existingBytes = newEntries.reduce((sum, entry) => sum + entry.file.size, 0);
      const additionalBytes = selected.reduce((sum, file) => sum + file.size, 0);
      const totalBytes = existingBytes + additionalBytes;
      const tooLargeFile = selected.find((file) => file.size > MAX_SINGLE_FILE_BYTES);

      if (tooLargeFile) {
        setUploadError(
          `${tooLargeFile.name} 파일 크기는 ${formatSize(tooLargeFile.size)}입니다. 각 파일은 ${formatSize(MAX_SINGLE_FILE_BYTES)} 이하여야 업로드할 수 있어요.`,
        );
        return;
      }

      if (totalBytes > MAX_TOTAL_FILE_BYTES) {
        setUploadError(`선택한 사진 전체 용량은 ${formatSize(totalBytes)}입니다. 최대 ${formatSize(MAX_TOTAL_FILE_BYTES)}까지 가능해요.`);
        return;
      }

      const nextEntries: NewPhotoEntry[] = selected.map((file, index) => ({
        kind: "new",
        key: makeFileKey(file, newEntries.length + index),
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      setEntries((current) => [...current, ...nextEntries]);
      setCurrentIndex(entries.length);
      setUploadError("");
    },
    [entries.length, newEntries],
  );

  const openNextCropDraft = useCallback(async (queue: File[]) => {
    const nextFile = queue[0];
    if (!nextFile) {
      setCropDraft(null);
      return;
    }

    const objectUrl = URL.createObjectURL(nextFile);
    try {
      const dimensions = await loadImageDimensions(objectUrl);
      setCropDraft({
        file: nextFile,
        objectUrl,
        imageWidth: dimensions.width,
        imageHeight: dimensions.height,
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
      });
      setCropError("");
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      setCropError(error instanceof Error ? error.message : "이미지를 불러오지 못했습니다.");
      setPendingCropFiles((current) => current.slice(1));
    }
  }, []);

  useEffect(() => {
    if (cropDraft || pendingCropFiles.length === 0) return;
    void openNextCropDraft(pendingCropFiles);
  }, [cropDraft, openNextCropDraft, pendingCropFiles]);

  const queueFilesForCrop = useCallback(
    (selected: File[]) => {
      const existingBytes = newEntries.reduce((sum, entry) => sum + entry.file.size, 0);
      const additionalBytes = selected.reduce((sum, file) => sum + file.size, 0);
      const totalBytes = existingBytes + additionalBytes;
      const tooLargeFile = selected.find((file) => file.size > MAX_SINGLE_FILE_BYTES);

      if (tooLargeFile) {
        setUploadError(
          `${tooLargeFile.name} 파일 크기는 ${formatSize(tooLargeFile.size)}입니다. 각 파일은 ${formatSize(MAX_SINGLE_FILE_BYTES)} 이하여야 업로드할 수 있습니다.`,
        );
        return;
      }

      if (totalBytes > MAX_TOTAL_FILE_BYTES) {
        setUploadError(`선택한 사진 전체 용량은 ${formatSize(totalBytes)}입니다. 최대 ${formatSize(MAX_TOTAL_FILE_BYTES)}까지 가능합니다.`);
        return;
      }

      setUploadError("");
      setCropError("");
      setPendingCropFiles((current) => [...current, ...selected]);
    },
    [newEntries],
  );

  useEffect(() => {
    if (pendingCropFiles.length === 0) return;
    if (cropDraft) return;
    if (cropError) {
      setCropError("");
    }
  }, [cropDraft, cropError, pendingCropFiles.length]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    if (selected.length > 0) {
      queueFilesForCrop(selected.filter((file) => file.type.startsWith("image/")));
    }
    event.target.value = "";
  }

  const handlePickerOpen = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleRemoveCurrentPhoto = useCallback(() => {
    setEntries((current) => {
      if (current.length === 0) return current;
      const target = current[currentIndex];
      if (target?.kind === "existing") {
        setDeletedExistingIds((prev) => (prev.includes(target.id) ? prev : [...prev, target.id]));
      }
      const next = current.filter((_, index) => index !== currentIndex);
      setCurrentIndex((prev) => {
        if (next.length === 0) return 0;
        if (prev >= next.length) return next.length - 1;
        return prev;
      });
      return next;
    });
  }, [currentIndex]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      const selected = Array.from(event.dataTransfer.files || []).filter((file) => file.type.startsWith("image/"));
      if (selected.length === 0) return;
      queueFilesForCrop(selected);
    },
    [queueFilesForCrop],
  );

  const getCropBounds = useCallback(() => {
    if (!cropDraft || cropViewport.width === 0 || cropViewport.height === 0) {
      return null;
    }

    const baseScale = Math.max(cropViewport.width / cropDraft.imageWidth, cropViewport.height / cropDraft.imageHeight);
    const displayWidth = cropDraft.imageWidth * baseScale * cropDraft.zoom;
    const displayHeight = cropDraft.imageHeight * baseScale * cropDraft.zoom;

    return {
      maxOffsetX: Math.max(0, (displayWidth - cropViewport.width) / 2),
      maxOffsetY: Math.max(0, (displayHeight - cropViewport.height) / 2),
    };
  }, [cropDraft, cropViewport.height, cropViewport.width]);

  const handleCropZoomChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextZoom = Number(event.target.value);
      setCropDraft((current) => {
        if (!current) return current;
        const nextDraft = { ...current, zoom: nextZoom };
        if (cropViewport.width === 0 || cropViewport.height === 0) return nextDraft;

        const baseScale = Math.max(cropViewport.width / current.imageWidth, cropViewport.height / current.imageHeight);
        const displayWidth = current.imageWidth * baseScale * nextZoom;
        const displayHeight = current.imageHeight * baseScale * nextZoom;
        const maxOffsetX = Math.max(0, (displayWidth - cropViewport.width) / 2);
        const maxOffsetY = Math.max(0, (displayHeight - cropViewport.height) / 2);
        nextDraft.offsetX = clamp(current.offsetX, -maxOffsetX, maxOffsetX);
        nextDraft.offsetY = clamp(current.offsetY, -maxOffsetY, maxOffsetY);
        return nextDraft;
      });
    },
    [cropViewport.height, cropViewport.width],
  );

  const handleCropPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!cropDraft) return;
    const target = event.currentTarget;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: cropDraft.offsetX,
      originY: cropDraft.offsetY,
    };
    target.setPointerCapture(event.pointerId);
  }, [cropDraft]);

  const handleCropPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      const bounds = getCropBounds();
      if (!dragState || !bounds) return;

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;

      setCropDraft((current) => {
        if (!current) return current;
        return {
          ...current,
          offsetX: clamp(dragState.originX + deltaX, -bounds.maxOffsetX, bounds.maxOffsetX),
          offsetY: clamp(dragState.originY + deltaY, -bounds.maxOffsetY, bounds.maxOffsetY),
        };
      });
    },
    [getCropBounds],
  );

  const handleCropPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleCropCancel = useCallback(() => {
    if (cropDraft) {
      URL.revokeObjectURL(cropDraft.objectUrl);
    }
    setCropDraft(null);
    setPendingCropFiles([]);
    setCropError("");
    setIsCropSaving(false);
  }, [cropDraft]);

  const handleCropConfirm = useCallback(async () => {
    if (!cropDraft || cropViewport.width === 0 || cropViewport.height === 0) return;

    setIsCropSaving(true);
    setCropError("");
    try {
      const croppedFile = await cropImageFile(cropDraft, cropViewport.width, cropViewport.height);
      appendEntries([croppedFile]);
      URL.revokeObjectURL(cropDraft.objectUrl);
      setCropDraft(null);
      setPendingCropFiles((current) => current.slice(1));
    } catch (error) {
      setCropError(error instanceof Error ? error.message : "이미지를 자르지 못했습니다.");
    } finally {
      setIsCropSaving(false);
    }
  }, [appendEntries, cropDraft, cropViewport.height, cropViewport.width]);

  const stageBaseScale =
    cropDraft && cropViewport.width > 0 && cropViewport.height > 0
      ? Math.max(cropViewport.width / cropDraft.imageWidth, cropViewport.height / cropDraft.imageHeight)
      : 1;

  const hiddenValue = useMemo(() => JSON.stringify(newEntries.map(() => [])), [newEntries]);
  const uploadedUrlsValue = useMemo(() => JSON.stringify(uploadedUrls), [uploadedUrls]);
  const previewSrc = entries.length > 0 ? entries[currentIndex]?.previewUrl : "";

  return (
    <section className="new-photo-picker">
      <label className="new-photo-picker-label">{label}</label>
      <input
        ref={inputRef}
        type="file"
        data-input-name={inputName}
        accept="image/*"
        multiple
        onChange={handleFileChange}
        disabled={isUploading}
      />

      <input type="hidden" name={hiddenInputName} value={hiddenValue} />
      <input ref={uploadedUrlsRef} type="hidden" name={uploadedUrlsInputName} value={uploadedUrlsValue} />
      {deletedExistingIds.map((id) => (
        <input key={id} type="hidden" name={deletedInputName} value={id} />
      ))}

      {!previewSrc ? (
        <div
          className={`new-photo-dropzone${isDragging ? " is-dragging" : ""}`}
          role="button"
          tabIndex={0}
          onClick={handlePickerOpen}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handlePickerOpen();
            }
          }}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <span className="new-photo-dropzone-empty">
            <strong className="new-photo-dropzone-icon">
              <ImagePlusIcon />
            </strong>
            <em>클릭해서 코디 사진을 첨부하세요.</em>
            <small>또는 파일을 여기에 드래그하세요.</small>
          </span>
        </div>
      ) : (
        <div className="new-photo-carousel">
          <div className="new-photo-preview-large">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewSrc} alt={`코디 사진 ${currentIndex + 1}`} />
          </div>
          <div className="new-photo-carousel-controls">
            <button
              type="button"
              className="new-photo-nav-button"
              onClick={() => setCurrentIndex((prev) => (prev - 1 + entries.length) % entries.length)}
              disabled={entries.length < 2}
              aria-label="이전 사진"
            >
              <ChevronLeftIcon />
            </button>
            <span className="new-photo-counter">
              {currentIndex + 1} / {entries.length}
            </span>
            <button
              type="button"
              className="new-photo-nav-button"
              onClick={() => setCurrentIndex((prev) => (prev + 1) % entries.length)}
              disabled={entries.length < 2}
              aria-label="다음 사진"
            >
              <ChevronRightIcon />
            </button>
            <button type="button" className="new-photo-add-more-inline" onClick={handlePickerOpen}>
              <UploadIcon />
              <span>사진 추가</span>
            </button>
            <button type="button" className="new-photo-remove-inline" onClick={handleRemoveCurrentPhoto}>
              <TrashIcon />
              <span>사진 삭제</span>
            </button>
          </div>
        </div>
      )}

      {isUploading ? (
        <p className="new-photo-status">
          저장 전에 사진을 업로드하고 있어요. ({uploadProgress.done}/{uploadProgress.total})
        </p>
      ) : null}
      {!isUploading && newEntries.length > 0 && uploadedUrls.length === newEntries.length ? (
        <p className="new-photo-status">사진 업로드가 완료됐어요. 바로 저장할 수 있어요.</p>
      ) : null}
      {uploadError ? <p className="form-error">{uploadError}</p> : null}

      {cropDraft ? (
        <div className="photo-crop-modal-backdrop" role="dialog" aria-modal="true" aria-label="코디 사진 자르기">
          <div className="photo-crop-modal">
            <div className="photo-crop-modal-head">
              <div>
                <p className="photo-crop-modal-kicker">Crop</p>
                <h2>코디 사진 영역 선택</h2>
                <p>4:5 프레임 안에 보일 영역만 저장됩니다. 사진을 드래그해서 위치를 맞추세요.</p>
              </div>
              <span className="photo-crop-modal-step">
                1 / {pendingCropFiles.length}
              </span>
            </div>

            <div className="photo-crop-stage-shell">
              <div
                ref={cropViewportRef}
                className="photo-crop-stage"
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
                onPointerCancel={handleCropPointerUp}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cropDraft.objectUrl}
                  alt="크롭할 코디 사진"
                  className="photo-crop-stage-image"
                  style={{
                    transform: `translate(calc(-50% + ${cropDraft.offsetX}px), calc(-50% + ${cropDraft.offsetY}px)) scale(${stageBaseScale * cropDraft.zoom})`,
                  }}
                  draggable={false}
                />
              </div>
            </div>

            <div className="photo-crop-controls">
              <label className="photo-crop-zoom">
                <span>확대</span>
                <input type="range" min="1" max="3" step="0.01" value={cropDraft.zoom} onChange={handleCropZoomChange} />
              </label>
              <div className="photo-crop-actions">
                <button type="button" className="ghost-button" onClick={handleCropCancel} disabled={isCropSaving}>
                  취소
                </button>
                <button type="button" className="solid-button" onClick={handleCropConfirm} disabled={isCropSaving}>
                  {isCropSaving ? "저장 중..." : "이 영역으로 사용"}
                </button>
              </div>
            </div>

            {cropError ? <p className="form-error">{cropError}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
