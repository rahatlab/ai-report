import { parseCSV, profileColumn, buildOverview } from "./csv";
import { parseExcel } from "./excel";
import { buildCharts } from "./charts";

export const MAX_BYTES = 3_000_000; // ~3MB file (Vercel-safe)

export class CsvError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// File bytes → parsed → profile → overview → charts (AI chara sob kichu)
// type: "csv" | "excel"
export async function analyzeFile(buffer, type) {
  if (!buffer || buffer.byteLength === 0) {
    throw new CsvError("File khali — kono data nei", 400);
  }
  if (buffer.byteLength > MAX_BYTES) {
    throw new CsvError("File too large (max ~3MB)", 413);
  }

  const isExcel = type === "excel";
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  let parsed;
  if (isExcel) {
    try {
      parsed = await parseExcel(buf);
    } catch (e) {
      throw new CsvError(e?.message || "Excel file pora jay ni", 422);
    }
  } else {
    parsed = parseCSV(buf.toString("utf-8"));
  }

  if (!parsed.columns.length) {
    throw new CsvError(
      isExcel ? "Excel te kono column (header) pelo na" : "CSV te kono column (header) pelo na",
      422
    );
  }
  if (!parsed.rows.length) {
    throw new CsvError(
      isExcel ? "Excel te kono data row pelo na" : "CSV te kono data row pelo na",
      422
    );
  }

  const profiles = parsed.columns.map((c) => profileColumn(c, parsed.rows));
  const overview = buildOverview(profiles, parsed);
  const charts = buildCharts(profiles, parsed.rows);

  return { parsed, profiles, overview, charts };
}
