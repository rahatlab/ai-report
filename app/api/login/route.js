import { NextResponse } from "next/server";
import { checkPassword, createSessionToken, COOKIE_NAME, TTL_SECONDS } from "@/lib/auth";

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!checkPassword(body?.password)) {
    return NextResponse.json({ error: "Galat password. Abaro try koro." }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });
  return res;
}
