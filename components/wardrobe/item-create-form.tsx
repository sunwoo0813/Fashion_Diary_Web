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

function buildSizeDetail(headers: string[], values: string[]) {
  const pairs: Record<string, string> = {};
  headers.forEach((header, index) => {
    pairs[header || `col_${index + 1}`] = values[index] || "";
  });
  return JSON.stringify({ headers, values, pairs });
}

export function ItemCreateForm({ initialError }: ItemCreateFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductItem[]>([]);
  const [searchError, setSearchError] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [product, setProduct] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState("");
  const [sizeDetailJson, setSizeDetailJson] = useState("");
  const [sizeGuide, setSizeGuide] = useState<SizeGuide | null>(null);

  const [imagePrefill, setImagePrefill] = useState("");
  const [localImageUrl, setLocalImageUrl] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const searchRequestSeqRef = useRef(0);
  const suppressNextAutoSearchRef = useRef(false);

  const previewSrc = localImageUrl || imagePrefill;

  useEffect(() => {
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
  }, [searchQuery]);

  function applyProductItem(item: ProductItem) {
    setBrand(item.brand || "");
    setProduct(item.name || "");
    setCategory(normalizeCategory(item.category || "") || category);

    const parsedGuide = parseSizeGuide(item.size_table);
    if (parsedGuide && parsedGuide.rows.length > 0) {
      const first = parsedGuide.rows[0];
      setSizeGuide(parsedGuide);
      setSize(first[0] || "");
      setSizeDetailJson(buildSizeDetail(parsedGuide.headers, first));
    } else {
      setSizeGuide(null);
      const fallbackSize =
        typeof item.size_table === "string" ? item.size_table.trim() : "";
      setSize(fallbackSize);
      setSizeDetailJson("");
    }

    setImagePrefill(item.image_path || "");
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

      <form id="itemCreateForm" action="/api/items" method="post" encType="multipart/form-data" className="item-form">
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
          <input type="hidden" name="image_path_prefill" value={imagePrefill} />
        </div>

        <div className="item-fields-card">
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
            Category
            <select
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              required
            >
              <option value="" disabled>
                Select category
              </option>
              <option value="Tops">Tops</option>
              <option value="Outerwear">Outerwear</option>
              <option value="Bottoms">Bottoms</option>
              <option value="Footwear">Footwear</option>
              <option value="Accessories">Accessories</option>
            </select>
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
          <input type="hidden" name="size_detail_json" value={sizeDetailJson} />

          {sizeGuide ? (
            <div className="size-guide">
              <p>Size table</p>
              <div className="size-guide-buttons">
                {sizeGuide.rows.map((row, index) => {
                  const label = row[0] || `Size ${index + 1}`;
                  return (
                    <button type="button" key={`${label}-${index}`} onClick={() => selectSizeGuideRow(index)}>
                      {label}
                    </button>
                  );
                })}
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
