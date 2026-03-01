"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

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

function normalizeCategory(value: string): string {
  const raw = value.trim().toLowerCase();
  if (!raw) return "";
  if (["tops", "top", "blouse", "shirt", "tee", "knit", "sweater"].some((key) => raw.includes(key))) {
    return "Tops";
  }
  if (["bottoms", "bottom", "pants", "jeans", "skirt", "shorts"].some((key) => raw.includes(key))) {
    return "Bottoms";
  }
  if (["outerwear", "coat", "jacket", "padding", "parka", "cardigan"].some((key) => raw.includes(key))) {
    return "Outerwear";
  }
  if (["footwear", "shoe", "sneaker", "boot", "loafer", "sandals"].some((key) => raw.includes(key))) {
    return "Footwear";
  }
  if (["accessories", "accessory", "bag", "hat", "belt", "jewelry", "scarf"].some((key) => raw.includes(key))) {
    return "Accessories";
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
    reader.onerror = () => reject(new Error("Failed to read file."));
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

  const [product, setProduct] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState("");
  const [sizeDetailJson, setSizeDetailJson] = useState("");
  const [sizeGuide, setSizeGuide] = useState<SizeGuide | null>(null);
  const [selectedSizeRowIndex, setSelectedSizeRowIndex] = useState<number | null>(null);

  const [imagePrefill, setImagePrefill] = useState("");
  const [localImageUrl, setLocalImageUrl] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const searchRequestSeqRef = useRef(0);
  const urlFetchRequestSeqRef = useRef(0);
  const sizeTableRequestSeqRef = useRef(0);
  const suppressNextAutoSearchRef = useRef(false);

  const previewSrc = localImageUrl || imagePrefill;

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
          throw new Error(body.error || "Product search failed");
        }

        setSearchResults(Array.isArray(body.items) ? body.items : []);
        setHasSearched(true);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        if (requestSeq !== searchRequestSeqRef.current) return;
        setSearchResults([]);
        setSearchError(error instanceof Error ? error.message : "Product search failed");
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

  function resetVisibleState() {
    if (localImageUrl) {
      URL.revokeObjectURL(localImageUrl);
    }
    if (fileRef.current) fileRef.current.value = "";

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
    setSize("");
    setSizeDetailJson("");
    setSizeGuide(null);
    setSelectedSizeRowIndex(null);

    setImagePrefill("");
    setLocalImageUrl("");
  }

  function onChangeInputMode(nextMode: InputMode) {
    if (nextMode === inputMode) return;
    resetVisibleState();
    setInputMode(nextMode);
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

    setImagePrefill(item.image_path || "");
    setUrlImageCandidates(item.image_path ? [item.image_path] : []);
    if (localImageUrl) {
      URL.revokeObjectURL(localImageUrl);
      setLocalImageUrl("");
    }
    if (fileRef.current) fileRef.current.value = "";

    suppressNextAutoSearchRef.current = true;
    setSearchResults([]);
    setSearchError("");
    setHasSearched(false);
    setSearchQuery(item.name || "");
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (localImageUrl) {
      URL.revokeObjectURL(localImageUrl);
    }
    setUrlImageCandidates([]);
    if (!file) {
      setLocalImageUrl("");
      return;
    }
    setImagePrefill("");
    setLocalImageUrl(URL.createObjectURL(file));
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

    setImagePrefill(normalized);
    setUrlFetchError("");
    if (localImageUrl) {
      URL.revokeObjectURL(localImageUrl);
      setLocalImageUrl("");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSizeTableImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setSizeTableImageName(file?.name || "");
    setSizeTableError("");
    if (!file) return;
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
        throw new Error("Failed to encode size chart image.");
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
        throw new Error(payload.error || "Failed to extract size table.");
      }

      const parsedGuideRaw = parseSizeGuide(payload.data);
      const parsedGuide = parsedGuideRaw ? ensureSizeFirstColumn(parsedGuideRaw) : null;
      if (!parsedGuide || parsedGuide.rows.length === 0) {
        throw new Error("Failed to normalize extracted size table.");
      }

      const firstRow = parsedGuide.rows[0];
      setSizeGuide(parsedGuide);
      setSize(firstRow[0] || "");
      setSizeDetailJson(buildSizeDetail(parsedGuide.headers, firstRow));
      setSelectedSizeRowIndex(0);
    } catch (error) {
      if (requestSeq !== sizeTableRequestSeqRef.current) return;
      setSizeTableError(error instanceof Error ? error.message : "Failed to extract size table.");
    } finally {
      if (requestSeq === sizeTableRequestSeqRef.current) {
        setSizeTableLoading(false);
      }
    }
  }

  async function onFetchFromProductUrl() {
    const targetUrl = productUrl.trim();
    if (!targetUrl) {
      setUrlFetchError("Please enter a product URL.");
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
        throw new Error(body.error || "Failed to fetch product metadata.");
      }

      const extracted = body.data;
      const candidateUrls = uniqHttpUrls([
        ...(Array.isArray(body.data.productImageCandidates) ? body.data.productImageCandidates : []),
        body.data.productImage?.sourceUrl || "",
      ]).slice(0, 4);
      const selectedCandidateUrl = candidateUrls[0] || "";

      if (localImageUrl) {
        URL.revokeObjectURL(localImageUrl);
        setLocalImageUrl("");
      }
      if (fileRef.current) fileRef.current.value = "";

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
        setUrlFetchError("No autofill data was found for this URL.");
      }
    } catch (error) {
      if (requestSeq !== urlFetchRequestSeqRef.current) return;
      setUrlFetchError(error instanceof Error ? error.message : "Failed to fetch product metadata.");
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
          <p className="item-new-kicker">Curate Collection</p>
          <h1>Add New Item</h1>
        </div>
        <div className="item-new-actions">
          <Link href="/wardrobe" className="ghost-button">
            Cancel
          </Link>
          <button type="submit" form="itemCreateForm" className="solid-button">
            Save Item
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
          Search
        </button>
        <button
          type="button"
          className={`item-input-mode-button${inputMode === "url" ? " is-active" : ""}`}
          onClick={() => onChangeInputMode("url")}
        >
          URL
        </button>
        <button
          type="button"
          className={`item-input-mode-button${inputMode === "manual" ? " is-active" : ""}`}
          onClick={() => onChangeInputMode("manual")}
        >
          Manual
        </button>
      </div>

      {inputMode === "search" ? (
        <p className="item-input-mode-help">Search existing shared products and autofill quickly.</p>
      ) : null}
      {inputMode === "url" ? (
        <p className="item-input-mode-help">Paste a product URL to autofill brand, item name, and images.</p>
      ) : null}
      {inputMode === "manual" ? (
        <p className="item-input-mode-help">Fill in the fields below directly when there is no source product.</p>
      ) : null}

      {inputMode === "search" ? (
        <>
          <div className="item-search-row">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Type brand or product name"
            />
          </div>
          {hasSearchResults ? (
            <div className="item-search-results">
              {searchError ? <p>{searchError}</p> : null}
              {!searchError && searchResults.length === 0 && !searchLoading ? <p>No matching products</p> : null}
              {searchResults.map((item, index) => (
                <button
                  type="button"
                  key={`${item.brand}-${item.name}-${index}`}
                  className="item-search-result"
                  onClick={() => applyProductItem(item)}
                >
                  <span>{item.name || "Untitled"}</span>
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
              placeholder="Paste product URL"
            />
          </div>
          <div className="item-search-row">
            <button
              type="button"
              className="ghost-button"
              onClick={onFetchFromProductUrl}
              disabled={urlFetchLoading}
            >
              {urlFetchLoading ? "Fetching..." : "Fetch Product Info"}
            </button>
          </div>
          {urlFetchError ? <p className="item-url-error">{urlFetchError}</p> : null}
        </>
      ) : null}

      <form id="itemCreateForm" action="/api/items" method="post" encType="multipart/form-data" className="item-form">
        <input type="hidden" name="input_mode" value={inputMode} />
        <div className="item-media-card">
          <p>Item Image</p>
          <div className="item-image-preview">
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSrc} alt="Item preview" />
            ) : (
              <span>No image selected</span>
            )}
          </div>
          <input ref={fileRef} type="file" name="image" accept="image/*" onChange={onFileChange} />
          {urlImageCandidates.length > 1 ? (
            <div className="item-image-candidates">
              <p>Image candidates</p>
              <div className="item-image-candidate-list">
                {urlImageCandidates.slice(0, 4).map((candidateUrl, index) => {
                  const isSelected = imagePrefill === candidateUrl && !localImageUrl;
                  return (
                    <button
                      type="button"
                      key={`${candidateUrl}-${index}`}
                      className={`item-image-candidate${isSelected ? " is-selected" : ""}`}
                      onClick={() => selectImageCandidate(candidateUrl)}
                      aria-label={`Use image candidate ${index + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={candidateUrl} alt={`Candidate ${index + 1}`} />
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
            Brand
            <input
              type="text"
              name="brand"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              placeholder="Celine"
              required
            />
          </label>
          <label>
            Item Name
            <input
              type="text"
              name="product"
              value={product}
              onChange={(event) => setProduct(event.target.value)}
              placeholder="Vintage Silk Blouse"
              required
            />
          </label>
          <label>
            Category
            <input
              type="text"
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Category"
            />
          </label>
          <label>
            Size
            <input
              type="text"
              name="size"
              value={size}
              onChange={(event) => {
                setSize(event.target.value);
                setSizeDetailJson("");
              }}
              placeholder="S, M, 27, 240mm"
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
              <label htmlFor="sizeTableImageInput" className="size-table-upload-box">
                <strong>Size Table Image</strong>
                <span>
                  {sizeTableLoading
                    ? "Analyzing size chart..."
                    : sizeTableImageName || "Click here to upload a size chart image. We will analyze it automatically."}
                </span>
              </label>
              {sizeTableError ? <p className="item-url-error">{sizeTableError}</p> : null}
            </div>
          ) : null}
          <input type="hidden" name="size_detail_json" value={sizeDetailJson} />

          {sizeGuide ? (
            <div className="size-guide">
              <p>Size table</p>
              <div className="size-guide-table-wrap">
                <table className="size-guide-table">
                  <thead>
                    <tr>
                      {sizeGuide.headers.map((header, index) => (
                        <th key={`${header}-${index}`} scope="col">
                          {header || `Col ${index + 1}`}
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

          <label>
            Styling Notes
            <textarea name="note" placeholder="Fit notes or styling ideas..." rows={4} />
          </label>
        </div>
      </form>
    </section>
  );
}


