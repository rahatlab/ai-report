import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { analyzeFile, CsvError } from "@/lib/analyze";
import { providerStatus } from "@/lib/ai";

export const maxDuration = 30;

const TABLE_CAP = 2000;

async function isAuthed() {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}

export async function POST(request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const fileName = decodeURIComponent(request.headers.get("x-file-name") || "upload.csv");
    const fileType =
      (request.headers.get("x-file-type") || "csv").toLowerCase() === "excel"
        ? "excel"
        : "csv";

    const buffer = Buffer.from(await request.arrayBuffer());

    const { parsed, profiles, overview, charts } = await analyzeFile(buffer, fileType);

    const shown = parsed.rows.slice(0, TABLE_CAP);
    const table = {
      columns: parsed.columns,
      rows: shown.map((r) => parsed.columns.map((c) => (r[c] ?? ""))),
      total: parsed.rows.length,
      shown: shown.length,
    };

    return NextResponse.json({
      meta: {
        fileName,
        fileType,
        generatedAt: new Date().toISOString(),
        provider: providerStatus().active,
      },
      overview,
      profiles,
      charts,
      table,
    });
  } catch (e) {
    const status = e instanceof CsvError ? e.status : 500;
    return NextResponse.json(
      { error: e?.message || "File analyze korate somossa hoy" },
      { status }
    );
  }
}
