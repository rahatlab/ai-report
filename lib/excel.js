import ExcelJS from "exceljs";
import { MAX_ROWS } from "./csv";

// Excel date -> "YYYY-MM-DD" (local tz, UTC shift avoid)
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Excel cell value tar format onek rokom hote pare — sob ek value-e ana
function cellToValue(v) {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return fmtDate(v);

  if (typeof v === "object") {
    if (Array.isArray(v.richText)) return v.richText.map((t) => t?.text ?? "").join("");
    if (v.text !== undefined) return v.text; // hyperlink / shared string
    if (v.result !== undefined) return cellToValue(v.result); // formula result
    if (v.formula !== undefined) return ""; // formula with no cached result
    if (v.error !== undefined) return "#ERROR";
    return "";
  }

  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return v; // string | number
}

function dedupe(name, seen) {
  let base = name;
  let n = 1;
  while (seen.has(base)) {
    n += 1;
    base = `${name}_${n}`;
  }
  seen.add(base);
  return base;
}

/**
 * First worksheet → { columns, rows, truncated, totalRows }
 * (CSV parser er shathe same shape, tai same pipeline-e chole)
 */
export async function parseExcel(buffer) {
  let workbook;
  try {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
  } catch (e) {
    const msg = String(e?.message || e);
    if (/not a zip|invalid|unsupported/i.test(msg)) {
      throw new Error(
        "Excel file pora jay ni. Purano .xls hole .xlsx ba CSV te save kore abar try koro."
      );
    }
    throw new Error(`Excel parse failed: ${msg.slice(0, 150)}`);
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return { columns: [], rows: [], truncated: false, totalRows: 0 };

  // ---- header row (first row) ----
  const headerRow = sheet.getRow(1);
  let colCount = headerRow.cellCount || sheet.columnCount || 0;
  colCount = Math.max(0, Math.min(colCount, 500)); // sanity cap

  const seen = new Set();
  const columns = [];
  for (let c = 1; c <= colCount; c++) {
    let h = String(cellToValue(headerRow.getCell(c).value) ?? "").trim();
    if (!h) h = `Column_${c}`;
    columns.push(dedupe(h, seen));
  }
  if (columns.length === 0) return { columns: [], rows: [], truncated: false, totalRows: 0 };

  // ---- data rows ----
  const allRows = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // header skip
    if (allRows.length >= MAX_ROWS) return;

    const obj = {};
    let hasValue = false;
    for (let i = 0; i < columns.length; i++) {
      const raw = cellToValue(row.getCell(i + 1).value);
      const v = typeof raw === "string" ? raw.trim() : raw;
      obj[columns[i]] = v;
      if (v !== "" && v !== null && v !== undefined) hasValue = true;
    }
    if (hasValue) allRows.push(obj);
  });

  // Total row count (cap-er baire) — truncated hole sheet rowCount use
  const truncated = allRows.length >= MAX_ROWS;
  const sheetRows = sheet.rowCount || 0;
  const totalRows = truncated ? Math.max(allRows.length, sheetRows - 1) : allRows.length;

  return { columns, rows: allRows, truncated, totalRows };
}
