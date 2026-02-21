"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";

type DiaryTagItem = {
  id: number;
  name: string;
  category: string | null;
};

type FileView = {
  key: string;
  name: string;
  previewUrl: string;
};

type NewPhotoTagPickerProps = {
  items: DiaryTagItem[];
  inputName: string;
  hiddenInputName: string;
  label?: string;
};

function makeFileKey(file: File, index: number): string {
  return `${file.name}|${file.size}|${file.lastModified}|${index}`;
}

export function NewPhotoTagPicker({
  items,
  inputName,
  hiddenInputName,
  label = "Upload Photos",
}: NewPhotoTagPickerProps) {
  const [files, setFiles] = useState<FileView[]>([]);
  const [tagMap, setTagMap] = useState<Record<string, number[]>>({});

  useEffect(() => {
    return () => {
      files.forEach((file) => URL.revokeObjectURL(file.previewUrl));
    };
  }, [files]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    files.forEach((file) => URL.revokeObjectURL(file.previewUrl));

    const nextFiles = selected.map((file, index) => ({
      key: makeFileKey(file, index),
      name: file.name,
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
  }

  function toggleTag(fileKey: string, itemId: number) {
    setTagMap((prev) => {
      const current = prev[fileKey] || [];
      const has = current.includes(itemId);
      const nextTags = has ? current.filter((id) => id !== itemId) : [...current, itemId];
      return { ...prev, [fileKey]: nextTags };
    });
  }

  const hiddenValue = useMemo(() => {
    const list = files.map((file) => tagMap[file.key] || []);
    return JSON.stringify(list);
  }, [files, tagMap]);

  return (
    <section className="new-photo-picker">
      <label className="new-photo-picker-label">
        {label}
        <input type="file" name={inputName} accept="image/*" multiple onChange={handleFileChange} />
      </label>

      <input type="hidden" name={hiddenInputName} value={hiddenValue} />

      {files.length > 0 ? (
        <div className="new-photo-list">
          {files.map((file) => (
            <article key={file.key} className="new-photo-card">
              <div className="new-photo-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file.previewUrl} alt={file.name} />
              </div>
              <div className="new-photo-meta">
                <p>{file.name}</p>
                {items.length > 0 ? (
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
                  <p className="new-photo-empty-tag">No wardrobe items available for tagging.</p>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
