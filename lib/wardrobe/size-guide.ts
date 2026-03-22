export type SizeGuide = {
  headers: string[];
  rows: string[][];
};

export function parseSizeGuide(rawValue: unknown): SizeGuide | null {
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

export function ensureSizeFirstColumn(guide: SizeGuide): SizeGuide {
  const current = toRectangularGuide(guide);
  const transposed = transposeGuide(current);
  const selected =
    sizeFirstColumnScore(transposed) > sizeFirstColumnScore(current) ? transposed : current;
  if (selected.headers.length === 0) return selected;
  const headers = [...selected.headers];
  headers[0] = "사이즈";
  return { headers, rows: selected.rows };
}

export function buildSizeDetail(headers: string[], values: string[]) {
  const pairs: Record<string, string> = {};
  headers.forEach((header, index) => {
    pairs[header || `col_${index + 1}`] = values[index] || "";
  });
  return JSON.stringify({ headers, values, pairs });
}
