import { parseCSV, profileColumn, buildOverview } from "./csv";
import { buildCharts } from "./charts";

export const MAX_BYTES = 3_000_000; // ~3MB CSV (Vercel-safe)

export class CsvError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Parse + profile + overview + charts (AI chara sob kichu)
export function analyzeCSV(csvText) {
  if (typeof csvText !== "string" || !csvText.trim()) {
    throw new CsvError("CSV content missing", 400);
  }
  if (csvText.length > MAX_BYTES) {
    throw new CsvError("File too large (max ~3MB)", 413);
  }

  const parsed = parseCSV(csvText);

  if (!parsed.columns.length) {
    throw new CsvError("CSV te kono column (header) pelo na", 422);
  }
  if (!parsed.rows.length) {
    throw new CsvError("CSV te kono data row pelo na", 422);
  }

  const profiles = parsed.columns.map((c) => profileColumn(c, parsed.rows));
  const overview = buildOverview(profiles, parsed);
  const charts = buildCharts(profiles, parsed.rows);

  return { parsed, profiles, overview, charts };
}
