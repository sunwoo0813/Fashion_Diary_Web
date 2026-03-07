"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseImageUploadProps = {
  onUpload?: (url: string) => void;
};

export function useImageUpload({ onUpload }: UseImageUploadProps = {}) {
  const previewRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleThumbnailClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }

      const url = URL.createObjectURL(file);
      setFileName(file.name);
      setPreviewUrl(url);
      previewRef.current = url;
      onUpload?.(url);
    },
    [onUpload],
  );

  const handleRemove = useCallback(() => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }
    setPreviewUrl(null);
    setFileName(null);
    previewRef.current = null;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  return {
    previewUrl,
    fileName,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
  };
}
