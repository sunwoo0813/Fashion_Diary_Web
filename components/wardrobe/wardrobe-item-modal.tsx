"use client";

import type { WardrobeItem } from "@/lib/queries/wardrobe";

type SizeGrid = {
  headers: string[];
  rows: string[][];
};

type WardrobeItemModalProps = {
  item: WardrobeItem;
  position: { top: number; left: number };
  brandLabel: string;
  productLabel: string;
  wearCount: number;
  recentWearDate: string;
  onClose: () => void;
};

function itemCountText(count: number) {
  if (count <= 0) return "아직 착용하지 않았어요";
  if (count === 1) return "1회 착용";
  return `${count}회 착용`;
}

function formatRecentWearDate(value: string | null | undefined): string {
  const date = String(value || "").trim();
  if (!date) return "-";

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function parseSizeGrid(detail: unknown): SizeGrid | null {
  if (!detail || typeof detail !== "object") return null;
  const source = detail as Record<string, unknown>;

  const headers = Array.isArray(source.headers)
    ? source.headers.map((value) => String(value ?? "").trim()).filter(Boolean)
    : [];

  const rowsFromRows = Array.isArray(source.rows)
    ? source.rows.map((row) => (Array.isArray(row) ? row : [row]).map((value) => String(value ?? "").trim()))
    : [];
  if (headers.length > 0 && rowsFromRows.length > 0) {
    return { headers, rows: rowsFromRows };
  }

  const values = Array.isArray(source.values)
    ? source.values.map((value) => String(value ?? "").trim())
    : [];
  if (headers.length > 0 && values.length > 0) {
    return { headers, rows: [values] };
  }

  const pairs = source.pairs && typeof source.pairs === "object" ? (source.pairs as Record<string, unknown>) : null;
  if (pairs) {
    const pairHeaders = Object.keys(pairs).map((key) => key.trim()).filter(Boolean);
    if (pairHeaders.length > 0) {
      const row = pairHeaders.map((key) => String(pairs[key] ?? "").trim());
      return { headers: pairHeaders, rows: [row] };
    }
  }

  return null;
}

function visibleSizeGridColumns(grid: SizeGrid): number[] {
  return grid.headers
    .map((header, index) => ({ header: header.trim().toLowerCase(), index }))
    .filter(({ header, index }) => !(index === 0 && header === "사이즈"))
    .map(({ index }) => index);
}

export function WardrobeItemModal({
  item,
  position,
  brandLabel,
  productLabel,
  wearCount,
  recentWearDate,
  onClose,
}: WardrobeItemModalProps) {
  const sizeGrid = parseSizeGrid(item.size_detail);
  const sizeGridColumns = sizeGrid ? visibleSizeGridColumns(sizeGrid) : [];

  return (
    <div
      className="wardrobe-inline-modal-layer"
      onClick={onClose}
    >
      <aside
        className="wardrobe-inline-modal"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="wardrobe-inline-modal-head">
          <div className="wardrobe-inline-modal-title">
            <strong>{brandLabel}</strong>
            <p>{productLabel || "이름 없음"}</p>
          </div>
          <button
            type="button"
            className="wardrobe-inline-close"
            aria-label="아이템 상세 닫기"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="wardrobe-inline-body">
          <p><span>사이즈</span><strong>{item.size || "-"}</strong></p>
          <p><span>착용 횟수</span><strong>{itemCountText(wearCount)}</strong></p>
          <p><span>최근 착용일</span><strong>{formatRecentWearDate(recentWearDate)}</strong></p>

          <div className="wardrobe-inline-size">
            <span>사이즈 표</span>
            {sizeGrid ? (
              <div className="wardrobe-inline-size-wrap">
                <table className="wardrobe-inline-size-table">
                  <thead>
                    <tr>
                      {sizeGridColumns.map((index) => (
                        <th key={`${sizeGrid.headers[index]}-${index}`}>
                          {sizeGrid.headers[index] || `열 ${index + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sizeGrid.rows.map((row, rowIndex) => (
                      <tr key={`size-row-${rowIndex}`}>
                        {sizeGridColumns.map((colIndex) => (
                          <td key={`size-cell-${rowIndex}-${colIndex}`}>{row[colIndex] || "-"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <strong>-</strong>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
