import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { analyzeFile, CsvError } from "@/lib/analyze";
import { generateAIReport } from "@/lib/ai";

export const maxDuration = 60;

async function isAuthed() {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}

// AI report alada endpoint — chart/stats fast ashe, AI jetay ashe
export async function POST(request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const fileType =
      (request.headers.get("x-file-type") || "csv").toLowerCase() === "excel"
        ? "excel"
        : "csv";

    const buffer = Buffer.from(await request.arrayBuffer());
    const { profiles, overview, parsed } = await analyzeFile(buffer, fileType);

    const ai = await generateAIReport(overview, profiles, parsed.rows);
    return NextResponse.json({ ai });
  } catch (e) {
    const status = e instanceof CsvError ? e.status : 500;
    return NextResponse.json(
      { error: e?.message || "AI report banate somossa hoy" },
      { status }
    );
  }
}
