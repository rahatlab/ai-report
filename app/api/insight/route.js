import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { analyzeCSV, CsvError } from "@/lib/analyze";
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

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const { profiles, overview, parsed } = analyzeCSV(body.csv);
    const ai = await generateAIReport(overview, profiles, parsed.rows, body.provider);
    return NextResponse.json({ ai });
  } catch (e) {
    const status = e instanceof CsvError ? e.status : 500;
    return NextResponse.json(
      { error: e?.message || "AI report banate somossa hoy" },
      { status }
    );
  }
}
