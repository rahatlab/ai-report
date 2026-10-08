import { toNumber, looksLikeDate } from "./csv";

function round(n, d = 2) {
  if (!Number.isFinite(n)) return n;
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

function missing(v) {
  return v === null || v === undefined || String(v).trim() === "";
}

// too many points hole bucket kore sum kore (chart readable thake)
function limitPoints(arr, max = 60) {
  if (arr.length <= max) return arr;
  const size = Math.ceil(arr.length / max);
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    const chunk = arr.slice(i, i + size);
    const value = chunk.reduce((a, b) => a + b.value, 0);
    out.push({ label: chunk[0].label, value: round(value) });
  }
  return out;
}

function sumByDate(rows, dateCol, numCol) {
  const map = new Map();
  for (const r of rows) {
    if (!looksLikeDate(r[dateCol])) continue;
    const v = toNumber(r[numCol]);
    if (Number.isNaN(v)) continue;
    const key = String(r[dateCol]).trim();
    map.set(key, (map.get(key) || 0) + v);
  }
  const arr = [...map.entries()]
    .map(([label, value]) => ({ label, value: round(value) }))
    .sort((a, b) => Date.parse(a.label) - Date.parse(b.label));
  return limitPoints(arr, 60);
}

function sumByCategory(rows, catCol, numCol, top = 10) {
  const map = new Map();
  for (const r of rows) {
    if (missing(r[catCol])) continue;
    const v = numCol ? toNumber(r[numCol]) : 1;
    if (numCol && Number.isNaN(v)) continue;
    const key = String(r[catCol]).trim();
    map.set(key, (map.get(key) || 0) + v);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value: round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, top);
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
  return head;
}

function scatterData(rows, xCol, yCol, max = 400) {
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

function histogram(rows, col, bins = 12) {
  const nums = rows.map((r) => toNumber(r[col])).filter((n) => !Number.isNaN(n));
  if (nums.length < 2) return [];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) return [{ label: String(round(min)), value: nums.length }];

  const width = (max - min) / bins;
  const counts = new Array(bins).fill(0);
  for (const n of nums) {
    let idx = Math.floor((n - min) / width);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  }
  return counts.map((count, i) => {
    const start = round(min + i * width);
    const end = round(min + (i + 1) * width);
    return { label: `${start}–${end}`, value: count };
  });
}

export function buildCharts(profiles, rows) {
  const charts = [];
  const nums = profiles.filter((p) => p.type === "number" && (p.count || 0) > 0);
  const dates = profiles.filter((p) => p.type === "date");
  const cats = profiles.filter(
    (p) => p.type === "category" && !p.singleValue && (p.unique || 0) >= 2
  );
  const lowCard = cats.filter((p) => p.unique <= 50);
  const pieCats = cats.filter((p) => p.unique <= 10);

  // 1) Date + numeric -> line (time trend)
  if (dates.length && nums.length) {
    const data = sumByDate(rows, dates[0].name, nums[0].name);
    if (data.length >= 2) {
      charts.push({
        id: "trend",
        type: "line",
        title: `${nums[0].name} over time`,
        subtitle: `By ${dates[0].name} (summed)`,
        xKey: "label",
        yKey: "value",
        metric: nums[0].name,
        data,
      });
    }
  }

  // 2) Category + numeric -> bar (totals by category)
  if (lowCard.length && nums.length) {
    const cat = lowCard[0];
    const num = nums[0];
    const data = sumByCategory(rows, cat.name, num.name, 10);
    if (data.length >= 2) {
      charts.push({
        id: "cat-bar",
        type: "bar",
        title: `${num.name} by ${cat.name}`,
        subtitle: `Top ${data.length} (summed)`,
        xKey: "label",
        yKey: "value",
        metric: num.name,
        data,
      });
    }
  }

  // 3) Category share -> donut
  if (pieCats.length) {
    const cat = pieCats[0];
    const data = countByCategory(rows, cat.name, 8);
    if (data.length >= 2) {
      charts.push({
        id: "share",
        type: "pie",
        title: `${cat.name} distribution`,
        subtitle: `Share of rows`,
        data,
        metric: "count",
      });
    }
  }

  // 4) Two numeric -> scatter
  if (nums.length >= 2) {
    const data = scatterData(rows, nums[0].name, nums[1].name, 400);
    if (data.length >= 3) {
      charts.push({
        id: "scatter",
        type: "scatter",
        title: `${nums[1].name} vs ${nums[0].name}`,
        subtitle: `Relationship between two numbers`,
        xKey: "x",
        yKey: "y",
        xLabel: nums[0].name,
        yLabel: nums[1].name,
        data,
      });
    }
  }

  // 5) Numeric distribution -> histogram
  if (nums.length) {
    const data = histogram(rows, nums[0].name, 12);
    if (data.length >= 2) {
      charts.push({
        id: "hist",
        type: "bar",
        title: `${nums[0].name} distribution`,
        subtitle: `Histogram (12 buckets)`,
        xKey: "label",
        yKey: "value",
        metric: "frequency",
        data,
      });
    }
  }

  // 6) Category only (no numeric chilo) -> counts bar
  if (!nums.length && lowCard.length) {
    const cat = lowCard[0];
    const data = countByCategory(rows, cat.name, 10);
    if (data.length >= 2) {
      charts.push({
        id: "count-bar",
        type: "bar",
        title: `Row count by ${cat.name}`,
        subtitle: `Top ${data.length}`,
        xKey: "label",
        yKey: "value",
        metric: "count",
        data,
      });
    }
  }

  return charts.slice(0, 6);
}
