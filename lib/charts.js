import { toNumber, looksLikeDate } from "./csv";

// ============================================================
//  Auto chart builder — column role bujhe Recharts chart select kore
//
//  Column roles:
//    measure  -> real amount/quantity (sum / avg)   -> bar, line, scatter, histogram
//    year     -> year-like ordinal (1974..2026)      -> trend / distribution (sum na!)
//    id       -> mobile/code/serial (unique number) -> chart-e kokhono ase na
//    category -> name/status/gender                 -> bar / donut (share)
//    date     -> time                               -> line (trend)
// ============================================================

// ---------- helpers ----------

function round(n, d = 2) {
  if (!Number.isFinite(n)) return n;
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

function missing(v) {
  return v === null || v === undefined || String(v).trim() === "";
}

// label formatting (histogram bucket etc.)
function numLabel(n, decimals = 0) {
  if (!Number.isFinite(n)) return String(n);
  const s = decimals > 0 ? n.toFixed(Math.min(6, decimals)) : String(Math.round(n));
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

// ---------- column role detection ----------

// strong identifier naam (phone/id system) — unique na holeo chart-e bad
const STRONG_ID =
  /(mobile|phone|contact|whatsapp|telegram|nid|ssn|passport|aadhaar|iban|swift|ifsc|upi|uuid|guid)/i;

// identifier-ish naam — uniqueness sathe millei id
const NAME_ID =
  /(^|[^a-z])(id|ids|code|key|hash|ref|reference|serial|roll|ticket|invoice|receipt|account|card|zip|postal|pincode|tel|number|no|sl)([^a-z]|$)|^(id|no|sl)$/i;

// sum na, average beshi meaningful
const AVG_HINT =
  /(^|[^a-z])(age|rate|ratio|percent|percentage|score|rating|rank|grade|temperature|temp|avg|average|efficiency|utilization|satisfaction|index|density|duration|latency|speed|weight|height|price|dob)([^a-z]|$)/i;

const YEAR_HINT = /(^|[^a-z])(year|yr|years|batch|session|fy|quarter|qtr)([^a-z]|$)/i;

// numeric column theke one-pass signature (unique ratio, int kina, range)
function numericSignatures(rows, names) {
  const sigs = new Map();
  const sets = new Map();
  for (const n of names) {
    sigs.set(n, { present: 0, allInt: true, min: Infinity, max: -Infinity });
    sets.set(n, new Set());
  }

  for (const r of rows) {
    for (const n of names) {
      const v = toNumber(r[n]);
      if (Number.isNaN(v)) continue;
      const s = sigs.get(n);
      s.present++;
      if (!Number.isInteger(v)) s.allInt = false;
      if (v < s.min) s.min = v;
      if (v > s.max) s.max = v;
      sets.get(n).add(v);
    }
  }

  for (const n of names) {
    const s = sigs.get(n);
    s.unique = sets.get(n).size;
    s.uniqueRatio = s.present ? s.unique / s.present : 0;
    if (!Number.isFinite(s.min)) {
      s.min = 0;
      s.max = 0;
    }
    sets.delete(n);
  }
  return sigs;
}

// 1974..2026 er moddhe value -> year column (batch/year/session)
function isYearLike(profile, sig) {
  if (sig.present < 2) return false;
  const inRange = sig.min >= 1900 && sig.max <= 2150 && sig.max - sig.min <= 250;
  if (inRange) return true;
  return YEAR_HINT.test(profile.name) && sig.min >= 1900 && sig.max <= 2150;
}

// mobile / code / serial — "number" holeo chart-er metric banano jay na
function isIdentifier(profile, sig, yearLike) {
  if (yearLike || sig.present < 2) return false;
  if (STRONG_ID.test(profile.name)) return true;

  const nameId = NAME_ID.test(profile.name);
  const digits = sig.allInt ? String(Math.trunc(Math.abs(sig.max))).length : 0;
  const bigInt = sig.allInt && sig.max >= 1e7; // phone / big serial

  // shobcheye beshi unique + int — ONLY jodi value-gulo boropath boro (code/phone).
  // choto unique int (1..5000) measure/serial hote pare -> chart-e rakhbo.
  if (sig.uniqueRatio >= 0.99 && sig.allInt && bigInt) return true;
  if (nameId && sig.uniqueRatio >= 0.5) return true; // roll/code/number + unique
  if (nameId && digits >= 10) return true;
  if (bigInt && sig.uniqueRatio >= 0.6) return true; // 1e7+ near-unique int
  return false;
}

function pickAgg(col) {
  if (!col || col.role === "id" || col.yearLike) return "count"; // sum mathematically meaningless
  if (AVG_HINT.test(col.name)) return "avg"; // age/score/rate -> average
  return "sum";
}

function classify(profiles, rows) {
  const nums = profiles.filter((p) => p.type === "number" && (p.count || 0) > 0);
  const dates = profiles.filter((p) => p.type === "date" && (p.count || 0) > 0);
  const cats = profiles.filter(
    (p) => p.type === "category" && !p.singleValue && (p.unique || 0) >= 2
  );

  const sigs = numericSignatures(rows, nums.map((p) => p.name));

  const infos = nums.map((p) => {
    const sig = sigs.get(p.name) || {
      present: 0,
      unique: 0,
      uniqueRatio: 0,
      allInt: false,
      min: 0,
      max: 0,
    };
    const yearLike = isYearLike(p, sig);
    const id = isIdentifier(p, sig, yearLike);
    return {
      ...p,
      sig,
      yearLike,
      id,
      role: id ? "id" : yearLike ? "year" : "measure",
    };
  });

  return {
    dates,
    cats,
    infos,
    measures: infos.filter((c) => c.role === "measure"),
    years: infos.filter((c) => c.role === "year"),
    ids: infos.filter((c) => c.role === "id"),
  };
}

// ---------- aggregation ----------

function aggWord(agg) {
  return agg === "sum" ? "summed" : agg === "avg" ? "average" : "row count";
}

// onek point hole bucket kore merge kore (sum/count/avg thik rakhbe)
function limitPoints(arr, max, agg) {
  if (arr.length <= max) return arr;
  const size = Math.ceil(arr.length / max);
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    const chunk = arr.slice(i, i + size);
    let sum = 0;
    let n = 0;
    for (const c of chunk) {
      sum += c.sum;
      n += c.n;
    }
    out.push({
      label: chunk[0].label,
      sum,
      n,
      value: round(agg === "avg" && n ? sum / n : sum),
    });
  }
  return out;
}

function aggByDate(rows, dateCol, valueCol, agg) {
  const map = new Map();
  for (const r of rows) {
    if (!looksLikeDate(r[dateCol])) continue;
    let v = 1;
    if (valueCol) {
      v = toNumber(r[valueCol]);
      if (Number.isNaN(v)) continue;
    }
    const key = String(r[dateCol]).trim();
    const e = map.get(key) || { sum: 0, n: 0 };
    e.sum += v;
    e.n += 1;
    map.set(key, e);
  }

  const arr = [...map.entries()]
    .map(([label, e]) => ({
      label,
      sum: e.sum,
      n: e.n,
      value: round(agg === "avg" && e.n ? e.sum / e.n : e.sum),
    }))
    .sort((a, b) => Date.parse(a.label) - Date.parse(b.label));
  return limitPoints(arr, 60, agg);
}

// year column (fractional hole floor kore group) — sum na, yearly view
function aggByYear(rows, yearCol, valueCol, agg) {
  const map = new Map();
  for (const r of rows) {
    const y = toNumber(r[yearCol]);
    if (Number.isNaN(y)) continue;
    let v = 1;
    if (valueCol) {
      v = toNumber(r[valueCol]);
      if (Number.isNaN(v)) continue;
    }
    const key = String(Math.floor(y));
    const e = map.get(key) || { sum: 0, n: 0 };
    e.sum += v;
    e.n += 1;
    map.set(key, e);
  }

  const arr = [...map.entries()]
    .map(([label, e]) => ({
      label,
      sum: e.sum,
      n: e.n,
      value: round(agg === "avg" && e.n ? e.sum / e.n : e.sum),
    }))
    .sort((a, b) => Number(a.label) - Number(b.label));
  return limitPoints(arr, 40, agg);
}

function countByCategory(rows, catCol, top = 8) {
  const map = new Map();
  for (const r of rows) {
    if (missing(r[catCol])) continue;
    const key = String(r[catCol]).trim();
    map.set(key, (map.get(key) || 0) + 1);
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, top).map(([label, value]) => ({ label, value }));
  const rest = sorted.slice(top);
  if (rest.length) {
    head.push({ label: `Other (${rest.length})`, value: rest.reduce((a, b) => a + b[1], 0) });
  }
  const total = head.reduce((a, b) => a + b.value, 0);
  return head.map((h) => ({ ...h, pct: total ? round((h.value / total) * 100, 1) : 0 }));
}

// agg-aware: count / sum / average — thik na hole count fallback
function aggByCategory(rows, catCol, valueCol, agg, top = 10) {
  if (!valueCol || agg === "count") return countByCategory(rows, catCol, top);

  const map = new Map();
  for (const r of rows) {
    if (missing(r[catCol])) continue;
    const v = toNumber(r[valueCol]);
    if (Number.isNaN(v)) continue;
    const key = String(r[catCol]).trim();
    const e = map.get(key) || { sum: 0, n: 0 };
    e.sum += v;
    e.n += 1;
    map.set(key, e);
  }

  return [...map.entries()]
    .map(([label, e]) => ({ label, value: round(agg === "avg" ? e.sum / e.n : e.sum) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, top);
}

// ---------- scatter (correlation check) ----------

function scatterPoints(rows, xCol, yCol, max = 400) {
  const out = [];
  const step = Math.max(1, Math.floor(rows.length / max));
  for (let i = 0; i < rows.length; i += step) {
    const r = rows[i];
    const x = toNumber(r[xCol]);
    const y = toNumber(r[yCol]);
    if (Number.isNaN(x) || Number.isNaN(y)) continue;
    out.push({ x: round(x, 3), y: round(y, 3) });
  }
  return out;
}

function pearson(rows, xCol, yCol) {
  let n = 0,
    sx = 0,
    sy = 0,
    sxx = 0,
    syy = 0,
    sxy = 0;
  for (const r of rows) {
    const x = toNumber(r[xCol]);
    const y = toNumber(r[yCol]);
    if (Number.isNaN(x) || Number.isNaN(y)) continue;
    n++;
    sx += x;
    sy += y;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }
  if (n < 3) return 0;
  const cov = n * sxy - sx * sy;
  const vx = n * sxx - sx * sx;
  const vy = n * syy - sy * sy;
  if (vx <= 0 || vy <= 0) return 0;
  return cov / Math.sqrt(vx * vy);
}

// dui-tai real measure hole + jodi relationship thake (<0.2 hole scatter meaningless)
function bestScatter(rows, measures) {
  const cols = measures.slice(0, 6);
  let best = null;
  for (let i = 0; i < cols.length; i++) {
    for (let j = i + 1; j < cols.length; j++) {
      const r = pearson(rows, cols[i].name, cols[j].name);
      if (!best || Math.abs(r) > Math.abs(best.r)) {
        best = { x: cols[i], y: cols[j], r };
      }
    }
  }
  if (!best || Math.abs(best.r) < 0.2) return null;

  const data = scatterPoints(rows, best.x.name, best.y.name, 400);
  if (data.length < 3) return null;
  return { ...best, data };
}

// ---------- histogram (nice round buckets) ----------

function niceNum(x, roundFlag) {
  if (!(x > 0)) return 1;
  const exp = Math.floor(Math.log10(x));
  const f = x / Math.pow(10, exp);
  let nf;
  if (roundFlag) nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  else nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * Math.pow(10, exp);
}

function histogram(rows, colName, target = 12) {
  const nums = [];
  for (const r of rows) {
    const v = toNumber(r[colName]);
    if (!Number.isNaN(v)) nums.push(v);
  }
  if (nums.length < 2) return [];

  let min = Infinity;
  let max = -Infinity;
  for (const v of nums) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) {
    const d = Number.isInteger(min) ? 0 : 2;
    return [{ label: numLabel(min, d), value: nums.length }];
  }

  let step = niceNum((max - min) / Math.max(1, target - 1), true);
  if (!(step < max - min)) step = (max - min) / target; // oboshyo komtite bucket
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const bins = Math.max(1, Math.min(60, Math.round((end - start) / step)));
  const decimals = step >= 1 ? 0 : Math.min(6, Math.ceil(-Math.log10(step)));

  const counts = new Array(bins).fill(0);
  for (const v of nums) {
    let idx = Math.floor((v - start) / step);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  }

  return counts.map((count, i) => {
    const a = start + i * step;
    const b = start + (i + 1) * step;
    return { label: `${numLabel(a, decimals)}–${numLabel(b, decimals)}`, value: count };
  });
}

// ---------- main ----------

export function buildCharts(profiles, rows) {
  if (!Array.isArray(rows) || !rows.length) return [];

  const { dates, cats, measures, years } = classify(profiles, rows);

  // chart readability onujay preference
  const rankBar = (c) => ((c.unique >= 3 && c.unique <= 30) ? 0 : 1);
  const barCats = cats
    .filter((c) => c.unique >= 2 && c.unique <= 50)
    .sort((a, b) => rankBar(a) - rankBar(b) || a.unique - b.unique);
  const pieCats = cats
    .filter((c) => c.unique >= 2 && c.unique <= 8)
    .sort((a, b) => a.unique - b.unique);

  const pieCat = pieCats[0] || null;
  const charts = [];
  const add = (c) => {
    if (c && Array.isArray(c.data) && c.data.length >= 2) {
      charts.push(c);
      return true;
    }
    return false;
  };

  // ---- 1) date + measure -> time trend (line) ----
  let trendDone = false;
  if (dates.length) {
    const d = dates[0];
    const m = measures[0] || null;
    const agg = pickAgg(m);
    const data = aggByDate(rows, d.name, m ? m.name : null, agg);
    trendDone = add({
      id: "trend",
      type: "line",
      badge: "Trend",
      title: m ? `${m.name} over time` : "Rows over time",
      subtitle: `By ${d.name} (${aggWord(agg)})`,
      xKey: "label",
      yKey: "value",
      metric: m ? m.name : "count",
      agg,
      data,
    });
  }

  // ---- 2) category x measure -> bar (agg-aware) ----
  let barCat = null;
  if (barCats.length) {
    const m = measures[0] || null;
    const agg = pickAgg(m);

    let cat = barCats.find((c) => !pieCat || c.name !== pieCat.name);
    if (!cat) {
      // ekmatro category donut-e ache -> count bar duplicate na, shudhu real measure hole bar
      cat = agg === "count" ? null : barCats[0];
    }

    if (cat) {
      const data = aggByCategory(rows, cat.name, m ? m.name : null, agg, 10);
      if (
        add({
          id: m ? "cat-bar" : "count-bar",
          type: "bar",
          badge: "Bar",
          title: m ? `${m.name} by ${cat.name}` : `Row count by ${cat.name}`,
          subtitle: m ? `Top ${data.length} (${aggWord(agg)})` : `Top ${data.length}`,
          xKey: "label",
          yKey: "value",
          metric: m ? m.name : "count",
          agg,
          data,
        })
      ) {
        barCat = cat;
      }
    }
  }

  // ---- 3) category share -> donut ----
  if (pieCat) {
    add({
      id: "share",
      type: "pie",
      badge: "Donut",
      title: `${pieCat.name} distribution`,
      subtitle: "Share of rows",
      data: countByCategory(rows, pieCat.name, 8),
      metric: "count",
    });
  }

  // ---- 4) two real measures + correlation -> scatter ----
  const sc = bestScatter(rows, measures);
  if (sc) {
    add({
      id: "scatter",
      type: "scatter",
      badge: "Scatter",
      title: `${sc.y.name} vs ${sc.x.name}`,
      subtitle: `Correlation r = ${round(sc.r, 2)}`,
      xKey: "x",
      yKey: "y",
      xLabel: sc.x.name,
      yLabel: sc.y.name,
      data: sc.data,
    });
  }

  // ---- 5) year column -> yearly view (line / distribution bar) ----
  if (years.length && !trendDone) {
    const y = years[0];
    const m = measures[0] || null;
    const agg = pickAgg(m);
    const data = aggByYear(rows, y.name, m ? m.name : null, agg);
    if (data.length >= 2) {
      add({
        id: "year-view",
        type: m ? "line" : "bar",
        badge: m ? "Trend" : "Distribution",
        title: m ? `${m.name} by ${y.name}` : `${y.name} distribution`,
        subtitle: m ? `Yearly (${aggWord(agg)})` : `Rows per ${y.name}`,
        xKey: "label",
        yKey: "value",
        metric: m ? m.name : "count",
        agg,
        data,
      });
    }
  }

  // ---- 6) measure distribution -> histogram ----
  if (measures.length) {
    const m = measures[0];
    const data = histogram(rows, m.name, 12);
    if (
      data.length >= 2 &&
      add({
        id: "hist",
        type: "bar",
        badge: "Histogram",
        title: `${m.name} distribution`,
        subtitle: `Histogram (${data.length} buckets)`,
        xKey: "label",
        yKey: "value",
        metric: "count",
        agg: "count",
        compact: true,
        data,
      })
    ) {
      /* added */
    }
  }

  // ---- 7) fallback: chart kom hole arek category count bar ----
  if (charts.length < 3) {
    const used = new Set([barCat && barCat.name, pieCat && pieCat.name]);
    const extra =
      barCats.find((c) => !used.has(c.name)) ||
      (!charts.length
        ? cats.slice().sort((a, b) => b.unique - a.unique)[0] || null
        : null);

    if (extra) {
      add({
        id: "extra-count",
        type: "bar",
        badge: "Bar",
        title: `Row count by ${extra.name}`,
        subtitle: `Top 10`,
        xKey: "label",
        yKey: "value",
        metric: "count",
        agg: "count",
        data: countByCategory(rows, extra.name, 10),
      });
    }
  }

  return charts.slice(0, 6);
}
