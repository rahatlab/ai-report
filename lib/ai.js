// ============================================================
//  AI report generator — Gemini + Groq (duitai free tier)
//  Provider switch: .env -> AI_PROVIDER  (or per-request override)
// ============================================================

const TIMEOUT_MS = 25000;

function getLanguage() {
  const lang = (process.env.REPORT_LANG || "en").toLowerCase();
  return lang.startsWith("bn") ? "Bangla" : "English";
}

export function resolveProvider(requested) {
  const envProvider = (process.env.AI_PROVIDER || "").toLowerCase().trim();
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasGroq = !!process.env.GROQ_API_KEY;

  const chain = [];
  if (requested) chain.push(String(requested).toLowerCase().trim());
  if (envProvider) chain.push(envProvider);
  if (hasGemini) chain.push("gemini");
  if (hasGroq) chain.push("groq");

  for (const p of chain) {
    if (p === "gemini" && hasGemini) return "gemini";
    if (p === "groq" && hasGroq) return "groq";
  }
  return hasGemini ? "gemini" : hasGroq ? "groq" : null;
}

export function providerStatus() {
  return {
    hasGemini: !!process.env.GEMINI_API_KEY,
    hasGroq: !!process.env.GROQ_API_KEY,
    active: resolveProvider(),
  };
}

// ---------- prompt ----------

function shortValue(v, max = 40) {
  const s = String(v ?? "");
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function profileLine(p) {
  if (p.type === "number") {
    return `- ${p.name} (number): rows=${p.present}, missing=${p.missing}, min=${p.min}, max=${p.max}, mean=${p.mean}, median=${p.median}, sum=${p.sum}`;
  }
  if (p.type === "date") {
    return `- ${p.name} (date): min=${p.min}, max=${p.max}, missing=${p.missing}`;
  }
  if (p.type === "category") {
    const top = (p.top || [])
      .slice(0, 6)
      .map((t) => `${t.value}:${t.count}`)
      .join(", ");
    return `- ${p.name} (category): unique=${p.unique}, missing=${p.missing}, top=[${top}]`;
  }
  return `- ${p.name}: empty/unknown`;
}

export function buildPrompt(overview, profiles, rows) {
  const lang = getLanguage();
  const cols = profiles.slice(0, 40).map(profileLine).join("\n");

  const sampleCols = profiles.slice(0, 15).map((p) => p.name);
  const sample = rows.slice(0, 8).map((r) => {
    const o = {};
    for (const c of sampleCols) o[c] = shortValue(r[c]);
    return o;
  });

  return `You are a senior data analyst. Analyze the CSV dataset below and produce a clear, decision-ready report.

## Dataset overview
- File rows: ${overview.rows} (analyzed: ${overview.rowsUsed}${overview.truncated ? ", truncated" : ""})
- Columns: ${overview.columns} (numeric: ${overview.numeric}, category: ${overview.categories}, date: ${overview.dates})
- Missing cells: ${overview.missingCells} / ${overview.totalCells} (${overview.missingPct}%)

## Column profiles
${cols || "- (none)"}

## Sample rows (first 8)
${JSON.stringify(sample, null, 1)}

## Task
Return ONLY a valid JSON object (no markdown fences, no extra text) with EXACTLY this shape:
{
  "executiveSummary": "2-4 sentence high-level summary of what the data shows",
  "keyInsights": ["4-6 specific, concrete insights with real numbers from the profiles above"],
  "anomalies": ["2-4 notable anomalies, outliers, or data-quality issues (empty array if none)"],
  "recommendations": ["2-4 actionable next steps based on the data"],
  "dataQuality": "1-2 sentences on completeness and trustworthiness of this dataset"
}

Rules:
- Write the values in ${lang}.
- Use actual numbers/percentages from the profiles. Do NOT invent columns or values.
- Keep each bullet under ~20 words. Be specific, not generic.`;
}

// ---------- providers ----------

// transient error (rate limit / high demand / network) hole retry
const RETRYABLE = new Set([0, 408, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 2;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// network error / timeout hole fake response (status 0) -> retryable
async function safeFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch (e) {
    return {
      ok: false,
      status: 0,
      json: async () => ({}),
      text: async () => String((e && e.message) || e),
    };
  }
}

// overload hole automatic alternate model e switch (503 handle)
function geminiCandidates() {
  const primary = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const list = [primary, "gemini-3.5-flash", "gemini-3.5-flash-lite"];
  return [...new Set(list)].slice(0, MAX_ATTEMPTS);
}

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  const models = geminiCandidates();

  const makeBody = (jsonMode) => ({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 8192, // thinking + report — 2048-e JSON truncate hocchilo
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  });

  const headers = { "Content-Type": "application/json", "x-goog-api-key": key };
  let jsonMode = true;
  let lastErr = "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(1000 * attempt);

    const model = models[attempt] || models[0];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

    let res = await safeFetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(makeBody(jsonMode)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    // JSON mode unsupported (400) -> plain text diye, pore jsonMode off rakhbo
    if (res.status === 400 && jsonMode) {
      jsonMode = false;
      res = await safeFetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(makeBody(false)),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    }

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const text = (data?.candidates?.[0]?.content?.parts || [])
        .map((p) => p?.text || "")
        .join("")
        .trim();
      if (text) return text;
      lastErr = `Gemini(${model}) returned empty response`;
      continue;
    }

    const err = await res.text().catch(() => "");
    lastErr = `Gemini(${model}) ${res.status}: ${err.slice(0, 300)}`;
    if (!RETRYABLE.has(res.status)) throw new Error(lastErr);
  }

  throw new Error(lastErr || "Gemini failed after retries");
}

async function callGroq(prompt) {
  const key = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const makeBody = (jsonMode) => ({
    model,
    temperature: 0.4,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
  });

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
  let jsonMode = true;
  let lastErr = "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(1200 * attempt);

    let res = await safeFetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(makeBody(jsonMode)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    // response_format unsupported (400) -> plain diye, pore off rakhbo
    if (res.status === 400 && jsonMode) {
      jsonMode = false;
      res = await safeFetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(makeBody(false)),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    }

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) return text;
      lastErr = "Groq returned empty response";
      continue;
    }

    const err = await res.text().catch(() => "");
    lastErr = `Groq ${res.status}: ${err.slice(0, 300)}`;
    if (!RETRYABLE.has(res.status)) throw new Error(lastErr);
  }

  throw new Error(lastErr || "Groq failed after retries");
}

// ---------- JSON extraction (defensive) ----------

function extractJSON(raw) {
  if (!raw) return null;
  let t = String(raw).trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

  try {
    return JSON.parse(t);
  } catch {
    /* continue */
  }
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(t.slice(start, end + 1));
    } catch {
      /* continue */
    }
  }
  return null;
}

function normalize(obj) {
  if (!obj || typeof obj !== "object") return null;
  const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  return {
    executiveSummary: str(obj.executiveSummary) || str(obj.summary),
    keyInsights: arr(obj.keyInsights || obj.insights),
    anomalies: arr(obj.anomalies),
    recommendations: arr(obj.recommendations),
    dataQuality: str(obj.dataQuality),
  };
}

// ---------- main ----------

export async function generateAIReport(overview, profiles, rows, requestedProvider) {
  const provider = resolveProvider(requestedProvider);

  if (!provider) {
    return {
      available: false,
      provider: null,
      model: null,
      reason: "No AI key set. Add GEMINI_API_KEY or GROQ_API_KEY in .env.local",
    };
  }

  const prompt = buildPrompt(overview, profiles, rows);

  try {
    const raw = provider === "groq" ? await callGroq(prompt) : await callGemini(prompt);
    const parsed = normalize(extractJSON(raw));

    if (!parsed) {
      return {
        available: false,
        provider,
        model: provider === "groq" ? process.env.GROQ_MODEL : process.env.GEMINI_MODEL,
        reason: "AI response was not valid JSON. Try again.",
        raw: String(raw).slice(0, 1500),
      };
    }

    return {
      available: true,
      provider,
      model:
        provider === "groq"
          ? process.env.GROQ_MODEL || "openai/gpt-oss-120b"
          : process.env.GEMINI_MODEL || "gemini-3.5-flash",
      ...parsed,
    };
  } catch (e) {
    return {
      available: false,
      provider,
      model: null,
      reason: e?.message || "AI request failed",
    };
  }
}
