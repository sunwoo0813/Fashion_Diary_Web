"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

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

async function runWithConcurrency<T>(
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadedUrlsRef = useRef<HTMLInputElement | null>(null);
  const previousEntriesRef = useRef<PhotoEntry[]>([]);

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

  const appendFiles = useCallback(
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

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    if (selected.length > 0) {
      appendFiles(selected);
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
      appendFiles(selected);
    },
    [appendFiles],
  );

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
    </section>
  );
}
