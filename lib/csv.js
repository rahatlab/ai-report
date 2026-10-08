import Papa from "papaparse";

export const MAX_ROWS = 10000;

// ---------- number / date helpers ----------

export function toNumber(value) {
  if (value === null || value === undefined) return NaN;
  let s = String(value).trim();
  if (s === "") return NaN;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }

  s = s
    .replace(/[$€£₹¥₺]/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .replace(/%$/, "")
    .replace(/^(kg|g|lb|lbs|km|m|cm|mm|ton)$/i, "");

  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return negative ? -n : n;
}

const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";

export function looksLikeDate(value) {
  if (value === null || value === undefined) return false;
  const s = String(value).trim();
  if (!s || s.length > 40) return false;

  const patterns = [
    /^\d{4}-\d{1,2}-\d{1,2}([ T]\d{1,2}:\d{2}(:\d{2})?)?$/, // 2024-01-31
    /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/, // 31/01/2024
    new RegExp(`^\\d{1,2}\\s+(${MONTHS})[a-z]*\\s+\\d{4}$`, "i"), // 31 Jan 2024
    new RegExp(`^(${MONTHS})[a-z]*\\s+\\d{1,2},?\\s+\\d{4}$`, "i"), // Jan 31, 2024
    /^\d{4}[/-]\d{1,2}$/, // 2024-01
  ];

  for (const p of patterns) {
    if (p.test(s)) {
      const t = Date.parse(s);
      return !Number.isNaN(t);
    }
  }
  return false;
}

function toDate(value) {
  const t = Date.parse(String(value).trim());
  return Number.isNaN(t) ? null : t;
}

// ---------- type detection ----------

function isMissing(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function detectType(values) {
  const present = values.filter((v) => !isMissing(v));
  if (present.length === 0) return "empty";

  const numeric = present.filter((v) => !Number.isNaN(toNumber(v))).length;
  const dated = present.filter((v) => looksLikeDate(v)).length;
  const n = present.length;

  if (dated / n >= 0.8) return "date";
  if (numeric / n >= 0.8) return "number";
  return "category";
}

// ---------- stats ----------

function round(n, d = 2) {
  if (!Number.isFinite(n)) return n;
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

function median(sorted) {
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

function quantile(sorted, q) {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  return next !== undefined ? sorted[base] + rest * (next - sorted[base]) : sorted[base];
}

function numberStats(values) {
  const nums = values.map(toNumber).filter((n) => !Number.isNaN(n));
  if (nums.length === 0) return { count: 0 };
  const sorted = [...nums].sort((a, b) => a - b);
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / nums.length;
  const variance = nums.reduce((acc, x) => acc + (x - mean) ** 2, 0) / nums.length;

  return {
    count: nums.length,
    sum: round(sum),
    mean: round(mean),
    median: round(median(sorted)),
    std: round(Math.sqrt(variance)),
    min: round(sorted[0]),
    max: round(sorted[sorted.length - 1]),
    p25: round(quantile(sorted, 0.25)),
    p75: round(quantile(sorted, 0.75)),
    zeros: nums.filter((x) => x === 0).length,
    negatives: nums.filter((x) => x < 0).length,
  };
}

function categoryStats(values, limit = 10) {
  const present = values.filter((v) => !isMissing(v)).map((v) => String(v).trim());
  const counts = new Map();
  for (const v of present) counts.set(v, (counts.get(v) || 0) + 1);

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return {
    count: present.length,
    unique: counts.size,
    top: sorted.slice(0, limit).map(([value, count]) => ({ value, count })),
    singleValue: counts.size === 1,
  };
}

function dateStats(values) {
  const ts = values.filter((v) => looksLikeDate(v)).map(toDate).filter((t) => t !== null);
  if (ts.length === 0) return { count: 0 };
  const min = new Date(Math.min(...ts));
  const max = new Date(Math.max(...ts));
  return {
    count: ts.length,
    min: min.toISOString().slice(0, 10),
    max: max.toISOString().slice(0, 10),
  };
}

export function profileColumn(name, rows) {
  const values = rows.map((r) => r[name]);
  const type = detectType(values);
  const total = values.length;
  const missing = values.filter(isMissing).length;

  const base = {
    name,
    type,
    total,
    missing,
    present: total - missing,
    missingPct: total ? round((missing / total) * 100, 1) : 0,
  };

  if (type === "number") return { ...base, ...numberStats(values) };
  if (type === "date") return { ...base, ...dateStats(values) };
  if (type === "category") return { ...base, ...categoryStats(values) };
  return base;
}

// ---------- parse ----------

export function parseCSV(text) {
  const cleaned = String(text || "").replace(/^\uFEFF/, "");

  const result = Papa.parse(cleaned, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => String(h || "").trim(),
  });

  let columns = (result.meta && result.meta.fields) || [];
  columns = columns.filter((c, i) => c !== "" && c != null && columns.indexOf(c) === i);

  const allRows = (result.data || []).filter((row) =>
    columns.some((c) => !isMissing(row[c]))
  );

  const truncated = allRows.length > MAX_ROWS;
  const rows = truncated ? allRows.slice(0, MAX_ROWS) : allRows;

  return { columns, rows, truncated, totalRows: allRows.length, errors: result.errors || [] };
}

// ---------- overview ----------

export function buildOverview(profiles, parsed) {
  const totalCells = profiles.reduce((a, p) => a + p.total, 0);
  const missingCells = profiles.reduce((a, p) => a + p.missing, 0);

  return {
    rows: parsed.totalRows,
    rowsUsed: parsed.rows.length,
    truncated: parsed.truncated,
    columns: profiles.length,
    numeric: profiles.filter((p) => p.type === "number").length,
    categories: profiles.filter((p) => p.type === "category").length,
    dates: profiles.filter((p) => p.type === "date").length,
    missingCells,
    totalCells,
    missingPct: totalCells ? round((missingCells / totalCells) * 100, 1) : 0,
    completeColumns: profiles.filter((p) => p.missing === 0).length,
  };
}
