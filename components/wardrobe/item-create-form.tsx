"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { useImageUpload } from "@/components/wardrobe/use-image-upload";

type SizeGuide = {
  headers: string[];
  rows: string[][];
};

type ProductItem = {
  brand: string;
  name: string;
  category: string;
  size_table: unknown;
  image_path: string;
};

type ItemCreateFormProps = {
  initialError: string;
};

type InputMode = "search" | "url" | "manual";

const CATEGORY_OPTIONS = [
  { value: "Top", label: "상의" },
  { value: "Outer", label: "아우터" },
  { value: "Bottom", label: "하의" },
  { value: "Shoes", label: "신발" },
  { value: "ACC", label: "악세서리" },
] as const;
const DETAIL_CATEGORY_OPTIONS = {
  Top: [
    { value: "short_sleeve_tshirt", label: "반팔" },
    { value: "long_sleeve_tshirt", label: "긴팔" },
    { value: "shirt", label: "셔츠" },
    { value: "polo_shirt", label: "카라티" },
    { value: "sweatshirt", label: "맨투맨" },
    { value: "hoodie", label: "후드티" },
    { value: "knit", label: "니트" },
    { value: "sleeveless", label: "슬리브" },
    { value: "vest", label: "조끼" },
    { value: "blouse", label: "블라우스" },
  ],
  Outer: [
    { value: "cardigan", label: "가디건" },
    { value: "hood_zipup", label: "후드집업" },
    { value: "jacket", label: "자켓" },
    { value: "blazer", label: "블레이저" },
    { value: "leather_jacket", label: "가죽자켓" },
    { value: "windbreaker", label: "바람막이" },
    { value: "coat", label: "코트" },
    { value: "padding", label: "패딩" },
    { value: "fleece", label: "플리스" },
  ],
  Bottom: [
    { value: "shorts", label: "반바지" },
    { value: "jeans", label: "청바지" },
    { value: "slacks", label: "슬랙스" },
    { value: "cotton_pants", label: "면바지/치노팬츠류" },
    { value: "jogger_pants", label: "조거팬츠/트레이닝팬츠" },
    { value: "leggings", label: "레깅스" },
    { value: "skirt", label: "스커트" },
  ],
} as const;
const SEASON_OPTIONS = [
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "fall", label: "Fall" },
  { value: "winter", label: "Winter" },
] as const;
const COLOR_OPTIONS = [
  { value: "black", label: "블랙" },
  { value: "white", label: "화이트" },
  { value: "gray", label: "그레이" },
  { value: "navy", label: "네이비" },
  { value: "blue", label: "블루" },
  { value: "beige", label: "베이지" },
  { value: "brown", label: "브라운" },
  { value: "khaki", label: "카키" },
  { value: "green", label: "그린" },
  { value: "red", label: "레드" },
  { value: "pink", label: "핑크" },
  { value: "yellow", label: "옐로우" },
  { value: "purple", label: "퍼플" },
  { value: "orange", label: "오렌지" },
  { value: "ivory", label: "아이보리" },
] as const;
const DENIM_COLOR_OPTIONS = [
  { value: "light_blue_denim", label: "연청" },
  { value: "medium_blue_denim", label: "중청" },
  { value: "dark_blue_denim", label: "진청" },
  { value: "raw_denim", label: "생지" },
  { value: "black_denim", label: "흑청" },
  { value: "gray_denim", label: "그레이 데님" },
  { value: "white_denim", label: "화이트 데님" },
] as const;
const THICKNESS_OPTIONS = [
  { value: "light", label: "얇음" },
  { value: "medium", label: "보통" },
  { value: "heavy", label: "두꺼움" },
] as const;

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

function normalizeCategory(value: string): string {
  const raw = value.trim().toLowerCase();
  if (!raw) return "";
  if (["tops", "top", "blouse", "shirt", "tee", "knit", "sweater"].some((key) => raw.includes(key))) {
    return "Top";
  }
  if (["bottoms", "bottom", "pants", "jeans", "skirt", "shorts"].some((key) => raw.includes(key))) {
    return "Bottom";
  }
  if (["outerwear", "coat", "jacket", "padding", "parka", "cardigan"].some((key) => raw.includes(key))) {
    return "Outer";
  }
  if (["footwear", "shoe", "sneaker", "boot", "loafer", "sandals"].some((key) => raw.includes(key))) {
    return "Shoes";
  }
  if (["accessories", "accessory", "bag", "hat", "belt", "jewelry", "scarf"].some((key) => raw.includes(key))) {
    return "ACC";
  }
  return "";
}

function parseSizeGuide(rawValue: unknown): SizeGuide | null {
  if (!rawValue) return null;

  if (typeof rawValue === "object" && rawValue !== null) {
    if (Array.isArray(rawValue)) {
      if (rawValue.length < 2) return null;
      if (!Array.isArray(rawValue[0])) return null;
      const headers = (rawValue[0] as unknown[]).map((value) => String(value ?? "").trim());
      const rows = (rawValue.slice(1) as unknown[]).map((row) =>
        (Array.isArray(row) ? row : [row]).map((value) => String(value ?? "").trim()),
      );
      if (!headers.length || !rows.length) return null;
      return { headers, rows };
    }

    const data = rawValue as Record<string, unknown>;
    const headersValue = data.headers || data.columns;
    const rowsValue = data.rows || data.values || data.data;
    if (Array.isArray(headersValue) && Array.isArray(rowsValue)) {
      const headers = headersValue.map((value) => String(value ?? "").trim());
      const rows = rowsValue.map((row) =>
        (Array.isArray(row) ? row : [row]).map((value) => String(value ?? "").trim()),
      );
      if (!headers.length || !rows.length) return null;
      return { headers, rows };
    }
  }

  if (typeof rawValue !== "string") return null;
  const text = rawValue.trim();
  if (!text) return null;
  try {
    const jsonValue = JSON.parse(text) as unknown;
    return parseSizeGuide(jsonValue);
  } catch {
    // Continue with plain text parsing.
  }

  const lines = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const splitters = ["\t", "|", ",", "/", ";"];
  const splitLine = (line: string) => {
    for (const splitter of splitters) {
      if (!line.includes(splitter)) continue;
      const parts = line
        .split(splitter)
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length > 1) return parts;
    }
    return line
      .split(/\s{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);
  };

  const rows = lines.map(splitLine).filter((row) => row.length > 1);
  if (rows.length < 2) return null;
  return { headers: rows[0], rows: rows.slice(1) };
}

function isLikelySizeValue(value: string): boolean {
  const text = value.trim().toUpperCase();
  if (!text) return false;
  if (/^(XXS|XS|S|M|L|XL|XXL|XXXL|FREE|ONE ?SIZE)$/.test(text)) return true;
  if (/^\d{1,3}(?:\.\d+)?(?:MM|CM)?$/.test(text)) return true;
  if (/^(EU|US|UK|JP|KR)\s*\d{1,3}(?:\.\d+)?$/.test(text)) return true;
  if (/^(W|L)?\d{2,3}(?:\s*\/\s*(W|L)?\d{2,3})$/.test(text)) return true;
  if (/^(XXS|XS|S|M|L|XL|XXL|XXXL)\s*[-/()]?\s*\d{2,3}$/.test(text)) return true;
  if (/^\d{2,3}\s*[-/()]?\s*(XXS|XS|S|M|L|XL|XXL|XXXL)$/.test(text)) return true;
  return false;
}

function isLikelyMeasurementValue(value: string): boolean {
  const text = value.trim().toLowerCase();
  if (!text) return false;
  return /(?:\uCD1D\uC7A5|\uAE30\uC7A5|\uC5B4\uAE68|\uAC00\uC2B4|\uC18C\uB9E4|\uD5C8\uB9AC|\uC5C9\uB369|\uD5C8\uBC85|\uBC11\uC704|\uBC11\uB2E8|length|shoulder|chest|sleeve|waist|hip|thigh|rise|hem|inseam|bust|width)/i.test(
    text,
  );
}

function toRectangularGuide(guide: SizeGuide): SizeGuide {
  const width = Math.max(guide.headers.length, ...guide.rows.map((row) => row.length), 0);
  if (width === 0) return { headers: [], rows: [] };
  const headers = [...guide.headers, ...new Array(width - guide.headers.length).fill("")].slice(0, width);
  const rows = guide.rows.map((row) => [...row, ...new Array(width - row.length).fill("")].slice(0, width));
  return { headers, rows };
}

function transposeGuide(guide: SizeGuide): SizeGuide {
  const normalized = toRectangularGuide(guide);
  const matrix = [normalized.headers, ...normalized.rows];
  const width = normalized.headers.length;
  if (width === 0 || matrix.length === 0) return { headers: [], rows: [] };

  const transposed = Array.from({ length: width }, (_, columnIndex) =>
    matrix.map((row) => String(row[columnIndex] || "").trim()),
  );
  return {
    headers: transposed[0] || [],
    rows: transposed.slice(1),
  };
}

function sizeFirstColumnScore(guide: SizeGuide): number {
  const firstColumn = guide.rows.map((row) => String(row[0] || "").trim()).filter(Boolean);
  if (firstColumn.length === 0) return -1000;

  const sizeCount = firstColumn.filter((value) => isLikelySizeValue(value)).length;
  const measurementCount = firstColumn.filter((value) => isLikelyMeasurementValue(value)).length;

  return sizeCount * 4 - measurementCount * 3;
}

function ensureSizeFirstColumn(guide: SizeGuide): SizeGuide {
  const current = toRectangularGuide(guide);
  const transposed = transposeGuide(current);
  const selected =
    sizeFirstColumnScore(transposed) > sizeFirstColumnScore(current) ? transposed : current;
  if (selected.headers.length === 0) return selected;
  const headers = [...selected.headers];
  headers[0] = "\uC0AC\uC774\uC988";
  return { headers, rows: selected.rows };
}

function buildSizeDetail(headers: string[], values: string[]) {
  const pairs: Record<string, string> = {};
  headers.forEach((header, index) => {
    pairs[header || `col_${index + 1}`] = values[index] || "";
  });
  return JSON.stringify({ headers, values, pairs });
}

function uniqHttpUrls(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  values.forEach((value) => {
    const normalized = String(value || "").trim();
    if (!/^https?:\/\//i.test(normalized)) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    output.push(normalized);
  });

  return output;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("파일을 읽지 못했어요."));
    reader.readAsDataURL(file);
  });
}

function resizeImage(
  base64Str: string,
  maxWidth = 1400,
  outputMimeType = "image/jpeg",
  quality = 0.84,
): Promise<string> {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = base64Str;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      let width = image.width;
      let height = image.height;

      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(base64Str);
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      if (outputMimeType === "image/jpeg" || outputMimeType === "image/webp") {
        resolve(canvas.toDataURL(outputMimeType, quality));
        return;
      }
      resolve(canvas.toDataURL(outputMimeType));
    };
    image.onerror = () => resolve(base64Str);
  });
}

export function ItemCreateForm({ initialError }: ItemCreateFormProps) {
  const [inputMode, setInputMode] = useState<InputMode>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductItem[]>([]);
  const [searchError, setSearchError] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [productUrl, setProductUrl] = useState("");
  const [urlFetchLoading, setUrlFetchLoading] = useState(false);
  const [urlFetchError, setUrlFetchError] = useState("");
  const [urlImageCandidates, setUrlImageCandidates] = useState<string[]>([]);
  const [sizeTableImageName, setSizeTableImageName] = useState("");
  const [sizeTableLoading, setSizeTableLoading] = useState(false);
  const [sizeTableError, setSizeTableError] = useState("");
  const [isDraggingSizeTable, setIsDraggingSizeTable] = useState(false);
  const [formError, setFormError] = useState("");

  const [product, setProduct] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [detailCategory, setDetailCategory] = useState("");
  const [color, setColor] = useState("");
  const [seasons, setSeasons] = useState<string[]>([]);
  const [thickness, setThickness] = useState("");
  const [size, setSize] = useState("");
  const [sizeDetailJson, setSizeDetailJson] = useState("");
  const [sizeGuide, setSizeGuide] = useState<SizeGuide | null>(null);
  const [selectedSizeRowIndex, setSelectedSizeRowIndex] = useState<number | null>(null);

  const [imagePrefill, setImagePrefill] = useState("");
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const searchRequestSeqRef = useRef(0);
  const urlFetchRequestSeqRef = useRef(0);
  const sizeTableRequestSeqRef = useRef(0);
  const suppressNextAutoSearchRef = useRef(false);

  const {
    previewUrl: localImageUrl,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
  } = useImageUpload({
    onUpload: () => {
      setImagePrefill("");
      setUrlImageCandidates([]);
    },
  });

  const previewSrc = localImageUrl || imagePrefill;
  const showDetailCategory = category === "Outer" || category === "Top" || category === "Bottom";
  const detailCategoryOptions =
    category === "Top" || category === "Outer" || category === "Bottom"
      ? DETAIL_CATEGORY_OPTIONS[category]
      : [];
  const colorOptions = detailCategory === "jeans" ? DENIM_COLOR_OPTIONS : COLOR_OPTIONS;

  const handleImageDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleImageDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingImage(true);
  }, []);

  const handleImageDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingImage(false);
  }, []);

  const handleImageDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDraggingImage(false);

      const file = event.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;

      setUrlImageCandidates([]);
      setImagePrefill("");
      const fakeEvent = {
        target: {
          files: [file],
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(fakeEvent);
    },
    [handleFileChange],
  );

  useEffect(() => {
    if (inputMode !== "search") {
      setSearchLoading(false);
      setSearchError("");
      setHasSearched(false);
      setSearchResults([]);
      return;
    }

    if (suppressNextAutoSearchRef.current) {
      suppressNextAutoSearchRef.current = false;
      return;
    }

    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchError("");
      setSearchLoading(false);
      setHasSearched(false);
      return;
    }

    const requestSeq = searchRequestSeqRef.current + 1;
    searchRequestSeqRef.current = requestSeq;
    const abortController = new AbortController();

    const timerId = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");
      try {
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`, {
          signal: abortController.signal,
        });
        const body = (await response.json()) as { ok?: boolean; items?: ProductItem[]; error?: string };
        if (requestSeq !== searchRequestSeqRef.current) return;
        if (!response.ok || !body.ok) {
          throw new Error("상품 검색에 실패했어요.");
        }

        setSearchResults(Array.isArray(body.items) ? body.items : []);
        setHasSearched(true);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        if (requestSeq !== searchRequestSeqRef.current) return;
        setSearchResults([]);
        setSearchError(error instanceof Error ? error.message : "상품 검색에 실패했어요.");
        setHasSearched(true);
      } finally {
        if (requestSeq === searchRequestSeqRef.current) {
          setSearchLoading(false);
        }
      }
    }, 220);

    return () => {
      window.clearTimeout(timerId);
      abortController.abort();
    };
  }, [inputMode, searchQuery]);

  useEffect(() => {
    if (showDetailCategory) return;
    if (!detailCategory) return;
    setDetailCategory("");
  }, [detailCategory, showDetailCategory]);

  useEffect(() => {
    if (detailCategory === "jeans") return;
    if (!DENIM_COLOR_OPTIONS.some((option) => option.value === color)) return;
    setColor("");
  }, [color, detailCategory]);

  function resetVisibleState() {
    handleRemove();

    searchRequestSeqRef.current += 1;
    urlFetchRequestSeqRef.current += 1;
    sizeTableRequestSeqRef.current += 1;
    suppressNextAutoSearchRef.current = false;

    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setSearchLoading(false);
    setHasSearched(false);

    setProductUrl("");
    setUrlFetchLoading(false);
    setUrlFetchError("");
    setUrlImageCandidates([]);

    setSizeTableImageName("");
    setSizeTableLoading(false);
    setSizeTableError("");

    setProduct("");
    setBrand("");
    setCategory("");
    setDetailCategory("");
    setColor("");
    setSeasons([]);
    setThickness("");
    setSize("");
    setSizeDetailJson("");
    setSizeGuide(null);
    setSelectedSizeRowIndex(null);

    setImagePrefill("");
  }

  function onChangeInputMode(nextMode: InputMode) {
    if (nextMode === inputMode) return;
    resetVisibleState();
    setInputMode(nextMode);
  }

  function toggleSeason(nextSeason: string) {
    setFormError("");
    setSeasons((current) =>
      current.includes(nextSeason)
        ? current.filter((season) => season !== nextSeason)
        : [...current, nextSeason],
    );
  }

  function validateForm(): string {
    if (!brand.trim()) return "브랜드를 입력해 주세요.";
    if (!product.trim()) return "아이템명을 입력해 주세요.";
    if (!category.trim()) return "카테고리를 선택해 주세요.";
    if (showDetailCategory && !detailCategory.trim()) return "세부 카테고리를 선택해 주세요.";
    if (!color.trim()) return "색상을 선택해 주세요.";
    if (seasons.length === 0) return "시즌을 하나 이상 선택해 주세요.";
    if (!thickness.trim()) return "두께를 선택해 주세요.";
    if (!size.trim()) return "사이즈를 입력해 주세요.";
    return "";
  }

  function applyProductItem(item: ProductItem) {
    const dbCategory = normalizeCategory(item.category || "") || item.category || "";
    setBrand(item.brand || "");
    setProduct(item.name || "");
    setCategory(dbCategory);

    const parsedGuideRaw = parseSizeGuide(item.size_table);
    const parsedGuide = parsedGuideRaw ? ensureSizeFirstColumn(parsedGuideRaw) : null;
    if (parsedGuide && parsedGuide.rows.length > 0) {
      const first = parsedGuide.rows[0];
      setSizeGuide(parsedGuide);
      setSize(first[0] || "");
      setSizeDetailJson(buildSizeDetail(parsedGuide.headers, first));
      setSelectedSizeRowIndex(0);
    } else {
      setSizeGuide(null);
      const fallbackSize =
        typeof item.size_table === "string" ? item.size_table.trim() : "";
      setSize(fallbackSize);
      setSizeDetailJson("");
      setSelectedSizeRowIndex(null);
    }

    handleRemove();
    setImagePrefill(item.image_path || "");
    setUrlImageCandidates(item.image_path ? [item.image_path] : []);

    suppressNextAutoSearchRef.current = true;
    setSearchResults([]);
    setSearchError("");
    setHasSearched(false);
    setSearchQuery(item.name || "");
  }

  function selectSizeGuideRow(rowIndex: number) {
    if (!sizeGuide) return;
    const row = sizeGuide.rows[rowIndex];
    if (!row) return;
    setSize(row[0] || "");
    setSizeDetailJson(buildSizeDetail(sizeGuide.headers, row));
    setSelectedSizeRowIndex(rowIndex);
  }

  function selectImageCandidate(candidateUrl: string) {
    const normalized = candidateUrl.trim();
    if (!normalized) return;

    handleRemove();
    setImagePrefill(normalized);
    setUrlFetchError("");
  }

  async function onSizeTableImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await processSizeTableFile(file);
  }

  async function processSizeTableFile(file: File) {
    setSizeTableImageName(file.name || "");
    setSizeTableError("");
    const requestSeq = sizeTableRequestSeqRef.current + 1;
    sizeTableRequestSeqRef.current = requestSeq;

    setSizeTableLoading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const optimizedDataUrl = await resizeImage(dataUrl, 1400, "image/jpeg", 0.84);
      const optimizedMimeType =
        optimizedDataUrl.match(/^data:(.*?);base64,/i)?.[1] || "image/jpeg";
      const base64 = optimizedDataUrl.split(",")[1] || "";
      if (!base64) {
        throw new Error("사이즈표 이미지를 인코딩하지 못했어요.");
      }

      const response = await fetch("/api/size-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: optimizedMimeType,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        data?: unknown;
      };
      if (requestSeq !== sizeTableRequestSeqRef.current) return;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error("사이즈 추출에 실패했어요.");
      }

      const parsedGuideRaw = parseSizeGuide(payload.data);
      const parsedGuide = parsedGuideRaw ? ensureSizeFirstColumn(parsedGuideRaw) : null;
      if (!parsedGuide || parsedGuide.rows.length === 0) {
        throw new Error("추출한 사이즈표를 정리하지 못했어요.");
      }

      const firstRow = parsedGuide.rows[0];
      setSizeGuide(parsedGuide);
      setSize(firstRow[0] || "");
      setSizeDetailJson(buildSizeDetail(parsedGuide.headers, firstRow));
      setSelectedSizeRowIndex(0);
    } catch (error) {
      if (requestSeq !== sizeTableRequestSeqRef.current) return;
      setSizeTableError(error instanceof Error ? error.message : "사이즈 추출에 실패했어요.");
    } finally {
      if (requestSeq === sizeTableRequestSeqRef.current) {
        setSizeTableLoading(false);
      }
    }
  }

  const handleSizeTableDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleSizeTableDragEnter = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingSizeTable(true);
  }, []);

  const handleSizeTableDragLeave = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingSizeTable(false);
  }, []);

  const handleSizeTableDrop = useCallback(
    async (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDraggingSizeTable(false);

      const file = event.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;

      await processSizeTableFile(file);
    },
    [],
  );

  async function onFetchFromProductUrl() {
    const targetUrl = productUrl.trim();
    if (!targetUrl) {
      setUrlFetchError("상품 주소를 입력해 주세요.");
      return;
    }
    const requestSeq = urlFetchRequestSeqRef.current + 1;
    urlFetchRequestSeqRef.current = requestSeq;

    setUrlFetchLoading(true);
    setUrlFetchError("");
    setUrlImageCandidates([]);
    try {
      const response = await fetch("/api/product-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        data?: {
          url?: string;
          brand?: string;
          name?: string;
          productImage?: {
            sourceUrl?: string | null;
          } | null;
          productImageCandidates?: string[];
        };
      };
      if (requestSeq !== urlFetchRequestSeqRef.current) return;

      if (!response.ok || !body.ok || !body.data) {
        throw new Error("상품 정보를 불러오지 못했어요.");
      }

      const extracted = body.data;
      const candidateUrls = uniqHttpUrls([
        ...(Array.isArray(body.data.productImageCandidates) ? body.data.productImageCandidates : []),
        body.data.productImage?.sourceUrl || "",
      ]).slice(0, 4);
      const selectedCandidateUrl = candidateUrls[0] || "";

      handleRemove();

      if (selectedCandidateUrl) {
        setImagePrefill(selectedCandidateUrl);
      }

      setUrlImageCandidates(candidateUrls);

      const nextBrand = (extracted.brand || "").trim() || brand;
      const nextName = (extracted.name || "").trim() || product;
      const nextUrl = (extracted.url || "").trim() || productUrl;

      setBrand(nextBrand);
      setProduct(nextName);
      setProductUrl(nextUrl);

      if (!extracted.brand && !extracted.name && !selectedCandidateUrl) {
        setUrlFetchError("이 주소에서 자동 입력 가능한 데이터를 찾지 못했어요.");
      }
    } catch (error) {
      if (requestSeq !== urlFetchRequestSeqRef.current) return;
      setUrlFetchError(error instanceof Error ? error.message : "상품 정보를 불러오지 못했어요.");
    } finally {
      if (requestSeq === urlFetchRequestSeqRef.current) {
        setUrlFetchLoading(false);
      }
    }
  }

  const normalizedSearchQuery = searchQuery.trim();
  const hasSearchResults = useMemo(
    () =>
      Boolean(normalizedSearchQuery) &&
      (searchResults.length > 0 || searchLoading || Boolean(searchError) || hasSearched),
    [hasSearched, normalizedSearchQuery, searchError, searchLoading, searchResults.length],
  );

  return (
    <section className="item-new-page">
      <header className="item-new-header">
        <div>
          <p className="item-new-kicker">컬렉션 관리</p>
          <h1>새 아이템 추가</h1>
        </div>
        <div className="item-new-actions">
          <Link href="/wardrobe" className="ghost-button">
            취소
          </Link>
          <button type="submit" form="itemCreateForm" className="solid-button">
            아이템 저장
          </button>
        </div>
      </header>

      {initialError ? <p className="form-error">{initialError}</p> : null}

      <div className="item-input-mode">
        <button
          type="button"
          className={`item-input-mode-button${inputMode === "search" ? " is-active" : ""}`}
          onClick={() => onChangeInputMode("search")}
        >
          검색
        </button>
        <button
          type="button"
          className={`item-input-mode-button${inputMode === "url" ? " is-active" : ""}`}
          onClick={() => onChangeInputMode("url")}
        >
          주소
        </button>
        <button
          type="button"
          className={`item-input-mode-button${inputMode === "manual" ? " is-active" : ""}`}
          onClick={() => onChangeInputMode("manual")}
        >
          직접 입력
        </button>
      </div>

      {inputMode === "search" ? (
        <p className="item-input-mode-help">공유 상품을 검색해서 필드를 빠르게 자동 입력할 수 있어요.</p>
      ) : null}
      {inputMode === "url" ? (
        <p className="item-input-mode-help">상품 주소를 붙여 넣으면 브랜드, 상품명, 이미지를 자동으로 입력해요.</p>
      ) : null}
      {inputMode === "manual" ? (
        <p className="item-input-mode-help">원하는 상품이 없으면 아래 필드를 직접 입력해 주세요.</p>
      ) : null}

      {inputMode === "search" ? (
        <>
          <div className="item-search-row">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="브랜드 또는 상품명을 입력해 주세요"
            />
          </div>
          {hasSearchResults ? (
            <div className="item-search-results">
              {searchError ? <p>{searchError}</p> : null}
              {!searchError && searchResults.length === 0 && !searchLoading ? <p>일치하는 상품이 없어요.</p> : null}
              {searchResults.map((item, index) => (
                <button
                  type="button"
                  key={`${item.brand}-${item.name}-${index}`}
                  className="item-search-result"
                  onClick={() => applyProductItem(item)}
                >
                  <span>{item.name || "이름 없음"}</span>
                  <small>{[item.brand, item.category].filter(Boolean).join(" / ")}</small>
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
      {inputMode === "url" ? (
        <>
          <div className="item-search-row">
            <input
              type="url"
              value={productUrl}
              onChange={(event) => {
                setProductUrl(event.target.value);
                setUrlFetchError("");
              }}
              placeholder="상품 주소를 붙여 넣어 주세요"
            />
          </div>
          <div className="item-search-row">
            <button
              type="button"
              className="ghost-button"
              onClick={onFetchFromProductUrl}
              disabled={urlFetchLoading}
            >
              {urlFetchLoading ? "불러오는 중..." : "상품 정보 가져오기"}
            </button>
          </div>
          {urlFetchError ? <p className="item-url-error">{urlFetchError}</p> : null}
        </>
      ) : null}

      {formError ? <p className="form-error">{formError}</p> : null}

      <form
        id="itemCreateForm"
        action="/api/items"
        method="post"
        encType="multipart/form-data"
        className="item-form"
        onSubmit={(event) => {
          const nextError = validateForm();
          if (!nextError) {
            setFormError("");
            return;
          }
          event.preventDefault();
          setFormError(nextError);
        }}
      >
        <input type="hidden" name="input_mode" value={inputMode} />
        <div className="item-media-card">
          <p>상품 사진</p>
          {!previewSrc ? (
            <div
              className={`item-image-preview item-image-dropzone${isDraggingImage ? " is-dragging" : ""}`}
              onClick={handleThumbnailClick}
              onDragOver={handleImageDragOver}
              onDragEnter={handleImageDragEnter}
              onDragLeave={handleImageDragLeave}
              onDrop={handleImageDrop}
            >
              <span className="item-image-empty">
                <strong className="item-image-empty-icon">
                  <ImagePlusIcon />
                </strong>
                <em>클릭해서 이미지를 첨부하세요.</em>
                <small>또는 파일을 여기로 드래그하세요.</small>
              </span>
            </div>
          ) : (
            <div className="item-image-preview item-image-preview-filled">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc} alt="상품 이미지 미리보기" />
              <div className="item-image-overlay">
                <button type="button" className="item-image-overlay-button" onClick={handleThumbnailClick}>
                  <UploadIcon />
                </button>
                <button
                  type="button"
                  className="item-image-overlay-button is-danger"
                  onClick={() => {
                    handleRemove();
                    setImagePrefill("");
                  }}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            name="image"
            accept="image/*"
            onChange={(event) => {
              setUrlImageCandidates([]);
              setImagePrefill("");
              handleFileChange(event);
            }}
          />
          {urlImageCandidates.length > 1 ? (
            <div className="item-image-candidates">
              <p>이미지 후보</p>
              <div className="item-image-candidate-list">
                {urlImageCandidates.slice(0, 4).map((candidateUrl, index) => {
                  const isSelected = imagePrefill === candidateUrl && !localImageUrl;
                  return (
                    <button
                      type="button"
                      key={`${candidateUrl}-${index}`}
                      className={`item-image-candidate${isSelected ? " is-selected" : ""}`}
                      onClick={() => selectImageCandidate(candidateUrl)}
                      aria-label={`이미지 후보 ${index + 1} 선택`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={candidateUrl} alt={`후보 이미지 ${index + 1}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <input type="hidden" name="image_path_prefill" value={imagePrefill} />
        </div>

        <div className="item-fields-card">
          <label>
            브랜드
            <input
              type="text"
              name="brand"
              value={brand}
              onChange={(event) => {
                setBrand(event.target.value);
                setFormError("");
              }}
              placeholder="예: 리바이스"
              required
            />
          </label>
          <label>
            아이템명
            <input
              type="text"
              name="product"
              value={product}
              onChange={(event) => {
                setProduct(event.target.value);
                setFormError("");
              }}
              placeholder="예: 빈티지 실크 블라우스"
              required
            />
          </label>
          <label>
            카테고리
            <select
              name="category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setFormError("");
              }}
              required
            >
              <option value="">카테고리를 선택해 주세요</option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {showDetailCategory ? (
            <label>
              세부 카테고리
              <select
                name="detail_category"
                value={detailCategory}
                onChange={(event) => {
                  setDetailCategory(event.target.value);
                  setFormError("");
                }}
                required
              >
                <option value="">세부 카테고리를 선택해 주세요</option>
                {detailCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            색상
            <select
              name="color"
              value={color}
              onChange={(event) => {
                setColor(event.target.value);
                setFormError("");
              }}
              required
            >
              <option value="">색상을 선택해 주세요</option>
              {colorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            시즌
            <div className="item-checkbox-group" role="group" aria-label="시즌 선택">
              {SEASON_OPTIONS.map((option) => (
                <label key={option.value} className="item-checkbox-option">
                  <input
                    type="checkbox"
                    name="season"
                    value={option.value}
                    checked={seasons.includes(option.value)}
                    onChange={() => toggleSeason(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </label>
          <label>
            두께
            <select
              name="thickness"
              value={thickness}
              onChange={(event) => {
                setThickness(event.target.value);
                setFormError("");
              }}
              required
            >
              <option value="">두께를 선택해 주세요</option>
              {THICKNESS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            사이즈
            <input
              type="text"
              name="size"
              value={size}
              onChange={(event) => {
                setSize(event.target.value);
                setSizeDetailJson("");
                setFormError("");
              }}
              placeholder="S, M, 27, 240mm"
              required
            />
          </label>
          {!sizeGuide && inputMode !== "search" ? (
            <div className="size-table-upload">
              <input
                id="sizeTableImageInput"
                type="file"
                name="size_table_image"
                accept="image/*"
                className="size-table-upload-input"
                onChange={onSizeTableImageChange}
              />
              <label
                htmlFor="sizeTableImageInput"
                className={`size-table-upload-box${isDraggingSizeTable ? " is-dragging" : ""}`}
                onDragOver={handleSizeTableDragOver}
                onDragEnter={handleSizeTableDragEnter}
                onDragLeave={handleSizeTableDragLeave}
                onDrop={(event) => {
                  void handleSizeTableDrop(event);
                }}
              >
                <strong>사이즈표 이미지</strong>
                <span>
                  {sizeTableLoading
                    ? "사이즈표 분석 중..."
                    : sizeTableImageName || "클릭하거나 이미지를 드래그해서 사이즈표를 넣어 주세요. 자동으로 분석합니다."}
                </span>
              </label>
              {sizeTableError ? <p className="item-url-error">{sizeTableError}</p> : null}
            </div>
          ) : null}
          <input type="hidden" name="size_detail_json" value={sizeDetailJson} />

          {sizeGuide ? (
            <div className="size-guide">
              <p>사이즈표</p>
              <div className="size-guide-table-wrap">
                <table className="size-guide-table">
                  <thead>
                    <tr>
                      {sizeGuide.headers.map((header, index) => (
                        <th key={`${header}-${index}`} scope="col">
                          {header || `열 ${index + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sizeGuide.rows.map((row, rowIndex) => (
                      <tr
                        key={`row-${rowIndex}`}
                        className={`size-guide-row${selectedSizeRowIndex === rowIndex ? " is-selected" : ""}`}
                        onClick={() => selectSizeGuideRow(rowIndex)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            selectSizeGuideRow(rowIndex);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                      >
                        {sizeGuide.headers.map((_, colIndex) => (
                          <td key={`cell-${rowIndex}-${colIndex}`}>{row[colIndex] || "-"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

        </div>
      </form>
    </section>
  );
}


