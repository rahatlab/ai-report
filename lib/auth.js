// Simple signed-cookie auth (Web Crypto -> works in Node + Edge both)
const COOKIE_NAME = "session";
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 din

function getSecret() {
  return process.env.SESSION_SECRET || "ai-report-dev-secret-please-change-in-production";
}

function enc(str) {
  return new TextEncoder().encode(str);
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getKey() {
  return crypto.subtle.importKey(
    "raw",
    enc(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function hmac(value) {
  const key = await getKey();
  return toHex(await crypto.subtle.sign("HMAC", key, enc(value)));
}

export async function createSessionToken() {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const sig = await hmac(String(exp));
  return `${exp}.${sig}`;
}

export async function verifySessionToken(token) {
  if (!token || typeof token !== "string") return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!expStr || !sig || !Number.isFinite(exp)) return false;
  if (Math.floor(Date.now() / 1000) > exp) return false;

  try {
    const expected = await hmac(expStr);
    if (expected.length !== sig.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

// Password check — default 0000 (.env APP_PASSWORD diye change kora jay)
export function checkPassword(input) {
  const expected = process.env.APP_PASSWORD || "0000";
  return typeof input === "string" && input === expected;
}

export { COOKIE_NAME, TTL_SECONDS };
