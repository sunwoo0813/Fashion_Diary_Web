"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

type DiaryTagItem = {
  id: number;
  name: string;
  category: string | null;
};

type FileView = {
  key: string;
  name: string;
  file: File;
  previewUrl: string;
};

type NewPhotoTagPickerProps = {
  items: DiaryTagItem[];
  inputName: string;
  hiddenInputName: string;
  uploadedUrlsInputName: string;
  formId: string;
  label?: string;
};

type UploadTicketResponse = {
  ok?: boolean;
  error?: string;
  tickets?: Array<{
    bucket?: string;
    path?: string;
    token?: string;
    signedUrl?: string;
    publicUrl?: string;
  }>;
  ticket?: {
    bucket?: string;
    path?: string;
    token?: string;
    signedUrl?: string;
    publicUrl?: string;
  };
};

const MAX_SINGLE_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 80 * 1024 * 1024;
const UPLOAD_CONCURRENCY = 3;

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

export function NewPhotoTagPicker({
  items,
  inputName,
  hiddenInputName,
  uploadedUrlsInputName,
  formId,
  label = "Upload Photos",
}: NewPhotoTagPickerProps) {
  const [files, setFiles] = useState<FileView[]>([]);
  const [tagMap, setTagMap] = useState<Record<string, number[]>>({});
  const [tagPanelOpenMap, setTagPanelOpenMap] = useState<Record<string, boolean>>({});
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [uploadError, setUploadError] = useState("");
  const uploadedUrlsRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      files.forEach((file) => URL.revokeObjectURL(file.previewUrl));
    };
  }, [files]);

  useEffect(() => {
    setUploadedUrls([]);
    setUploadError("");
    setUploadProgress({ done: 0, total: 0 });
  }, [files]);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;

    const onSubmit = async (event: Event) => {
      if (!(event instanceof SubmitEvent)) return;
      if (form.dataset.photoUploadReady === "1") {
        delete form.dataset.photoUploadReady;
        return;
      }
      if (files.length === 0) {
        return;
      }
      if (uploadedUrls.length === files.length && uploadedUrls.length > 0) {
        return;
      }

      event.preventDefault();
      if (isUploading) return;

      setUploadError("");
      setIsUploading(true);
      setUploadProgress({ done: 0, total: files.length });

      try {
        const ticketResponse = await fetch("/api/outfits/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: files.map((entry) => ({
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
        if (!ticketResponse.ok || !ticketBody.ok || ticketList.length !== files.length) {
          throw new Error(ticketBody.error || "Failed to prepare photo upload.");
        }

        const nextUrls: string[] = new Array(files.length);
        await runWithConcurrency(files, UPLOAD_CONCURRENCY, async (entry, index) => {
          const file = entry.file;
          const ticket = ticketList[index];
          const signedUrl = String(ticket?.signedUrl || "").trim();
          const publicUrl = String(ticket?.publicUrl || "").trim();
          if (!signedUrl || !publicUrl) {
            throw new Error("Upload ticket is invalid.");
          }

          const body = new FormData();
          body.append("cacheControl", "3600");
          body.append("", file);

          const uploadResponse = await fetch(signedUrl, {
            method: "PUT",
            headers: { "x-upsert": "false" },
            body,
          });
          if (!uploadResponse.ok) {
            const text = await uploadResponse.text().catch(() => "");
            throw new Error(text || `Photo upload failed with status ${uploadResponse.status}.`);
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
        setUploadError(error instanceof Error ? error.message : "Photo upload failed.");
      } finally {
        setIsUploading(false);
      }
    };

    form.addEventListener("submit", onSubmit);
    return () => {
      form.removeEventListener("submit", onSubmit);
    };
  }, [files, formId, isUploading, uploadedUrls]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    const totalBytes = selected.reduce((sum, file) => sum + file.size, 0);
    const tooLargeFile = selected.find((file) => file.size > MAX_SINGLE_FILE_BYTES);

    if (tooLargeFile) {
      setUploadError(
        `${tooLargeFile.name} is ${formatSize(tooLargeFile.size)}. Each file must be ${formatSize(
          MAX_SINGLE_FILE_BYTES,
        )} or less.`,
      );
      event.target.value = "";
      return;
    }

    if (totalBytes > MAX_TOTAL_FILE_BYTES) {
      setUploadError(`Selected photos total ${formatSize(totalBytes)}. Limit is ${formatSize(MAX_TOTAL_FILE_BYTES)}.`);
      event.target.value = "";
      return;
    }

    files.forEach((file) => URL.revokeObjectURL(file.previewUrl));

    const nextFiles = selected.map((file, index) => ({
      key: makeFileKey(file, index),
      name: file.name,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setFiles(nextFiles);
    setTagMap((prev) => {
      const next: Record<string, number[]> = {};
      nextFiles.forEach((fileView) => {
        next[fileView.key] = prev[fileView.key] || [];
      });
      return next;
    });
    setTagPanelOpenMap((prev) => {
      const next: Record<string, boolean> = {};
      nextFiles.forEach((fileView) => {
        next[fileView.key] = prev[fileView.key] || false;
      });
      return next;
    });

    event.target.value = "";
  }

  function toggleTag(fileKey: string, itemId: number) {
    setTagMap((prev) => {
      const current = prev[fileKey] || [];
      const has = current.includes(itemId);
      const nextTags = has ? current.filter((id) => id !== itemId) : [...current, itemId];
      return { ...prev, [fileKey]: nextTags };
    });
  }

  function toggleTagPanel(fileKey: string) {
    setTagPanelOpenMap((prev) => ({ ...prev, [fileKey]: !prev[fileKey] }));
  }

  const hiddenValue = useMemo(() => {
    const list = files.map((file) => tagMap[file.key] || []);
    return JSON.stringify(list);
  }, [files, tagMap]);

  const uploadedUrlsValue = useMemo(() => JSON.stringify(uploadedUrls), [uploadedUrls]);

  return (
    <section className="new-photo-picker">
      <label className="new-photo-picker-label">
        {label}
        <input
          type="file"
          data-input-name={inputName}
          accept="image/*"
          multiple
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </label>

      <input type="hidden" name={hiddenInputName} value={hiddenValue} />
      <input ref={uploadedUrlsRef} type="hidden" name={uploadedUrlsInputName} value={uploadedUrlsValue} />

      {isUploading ? (
        <p className="new-photo-status">
          Uploading photos before submit... ({uploadProgress.done}/{uploadProgress.total})
        </p>
      ) : null}
      {!isUploading && files.length > 0 && uploadedUrls.length === files.length ? (
        <p className="new-photo-status">Photos uploaded. Ready to save.</p>
      ) : null}
      {uploadError ? <p className="form-error">{uploadError}</p> : null}

      {files.length > 0 ? (
        <div className="new-photo-list">
          {files.map((file) => {
            const selectedCount = (tagMap[file.key] || []).length;
            const isTagPanelOpen = Boolean(tagPanelOpenMap[file.key]);
            return (
              <article key={file.key} className="new-photo-card">
                <div className="new-photo-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={file.previewUrl} alt={file.name} />
                </div>
                <div className="new-photo-meta">
                  <div className="new-photo-meta-head">
                    <p className="new-photo-file-name">{file.name}</p>
                    <button
                      type="button"
                      className="new-photo-tag-toggle"
                      aria-expanded={isTagPanelOpen}
                      onClick={() => toggleTagPanel(file.key)}
                    >
                      {isTagPanelOpen ? "상품태그 닫기" : "상품태그 추가"}
                    </button>
                  </div>

                  {isTagPanelOpen ? (
                    items.length > 0 ? (
                      <div className="new-photo-tags">
                        {items.map((item) => {
                          const checked = (tagMap[file.key] || []).includes(item.id);
                          return (
                            <label key={`${file.key}-${item.id}`} className="new-photo-tag">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleTag(file.key, item.id)}
                              />
                              <span>{item.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="new-photo-empty-tag">옷장에 등록된 옷이 없어요.</p>
                    )
                  ) : (
                    <p className="new-photo-tag-hint">
                      {selectedCount > 0
                        ? `${selectedCount}개 태그 선택됨`
                        : "상품태그 추가 버튼을 눌러 내 옷장을 불러오세요."}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
