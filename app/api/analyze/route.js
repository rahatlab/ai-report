import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { analyzeCSV, CsvError } from "@/lib/analyze";
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

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const { parsed, profiles, overview, charts } = analyzeCSV(body.csv);

    const shown = parsed.rows.slice(0, TABLE_CAP);
    const table = {
      columns: parsed.columns,
      rows: shown.map((r) => parsed.columns.map((c) => (r[c] ?? ""))),
      total: parsed.rows.length,
      shown: shown.length,
    };

    return NextResponse.json({
      meta: {
        fileName: body.fileName || "upload.csv",
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
      { error: e?.message || "CSV analyze korate somossa hoy" },
      { status }
    );
  }
}
