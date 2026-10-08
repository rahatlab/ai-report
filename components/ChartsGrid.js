"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
} from "recharts";
import useDark from "./useDark";

const PALETTE = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f43f5e",
];

function fmt(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return n;
  const a = Math.abs(n);
  if (a === 0) return "0";
  if (a >= 1e12) return String(Math.round((n / 1e12) * 10) / 10) + "T";
  if (a >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "k";
  if (a >= 1) return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  if (a >= 0.001) return String(Math.round(n * 10000) / 10000);
  return n.toExponential(1);
}

// x label lambho/onek hole ghuriye dekhao, na hole sidho
function xTicks(d, xKey) {
  const long = d.length > 7 || d.some((o) => String(o?.[xKey] ?? "").length > 9);
  return long
    ? { angle: -30, height: 64, anchor: "end", interval: d.length <= 16 ? 0 : "preserveStartEnd" }
    : { angle: 0, height: 40, anchor: "middle", interval: "preserveStartEnd" };
}

// metric naam diye tooltip (shudhu "value" na)
function tipName(chart, fallback) {
  return chart.metric || fallback;
}

function ChartBody({ chart, dark }) {
  const grid = dark ? "#334155" : "#e2e8f0";
  const tick = dark ? "#94a3b8" : "#64748b";
  const tipStyle = {
    background: dark ? "#0f172a" : "#ffffff",
    border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
    borderRadius: 10,
    color: dark ? "#e2e8f0" : "#0f172a",
    fontSize: 12,
  };
  const axis = { fill: tick, fontSize: 11 };
  const d = chart.data || [];
  const xt = xTicks(d, chart.xKey);

  if (chart.type === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={d} margin={{ top: 8, right: 12, left: -6, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
          <XAxis
            dataKey={chart.xKey}
            tick={axis}
            angle={xt.angle}
            textAnchor={xt.anchor}
            height={xt.height}
            interval={xt.interval}
            minTickGap={12}
          />
          <YAxis tick={axis} tickFormatter={fmt} width={54} />
          <Tooltip
            contentStyle={tipStyle}
            formatter={(value, name) => [fmt(value), tipName(chart, name)]}
          />
          <Line
            type="monotone"
            dataKey={chart.yKey}
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={d.length <= 25 ? { r: 3 } : false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chart.type === "scatter") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, left: -6, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis
            type="number"
            dataKey={chart.xKey}
            name={chart.xLabel}
            tick={axis}
            tickFormatter={fmt}
          />
          <YAxis
            type="number"
            dataKey={chart.yKey}
            name={chart.yLabel}
            tick={axis}
            tickFormatter={fmt}
            width={54}
          />
          <Tooltip
            contentStyle={tipStyle}
            cursor={{ strokeDasharray: "3 3", stroke: tick }}
            formatter={(value, name) => [fmt(value), name]}
          />
          <Scatter data={d} fill="#6366f1" fillOpacity={0.6} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (chart.type === "pie") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={d}
            dataKey="value"
            nameKey="label"
            innerRadius="52%"
            outerRadius="82%"
            paddingAngle={2}
            stroke={dark ? "#0f172a" : "#ffffff"}
          >
            {d.map((entry, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tipStyle}
            formatter={(value, name, item) => {
              const pct = item?.payload?.pct;
              return [`${fmt(value)}${pct != null ? ` (${pct}%)` : ""}`, name];
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={34}
            wrapperStyle={{ fontSize: 11, color: tick }}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // bar (default) — histogram hole bucket gulo tight (compact), na hole gap
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={d}
        margin={{ top: 8, right: 12, left: -6, bottom: 4 }}
        barGap={0}
        barCategoryGap={chart.compact ? "2%" : "14%"}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis
          dataKey={chart.xKey}
          tick={axis}
          angle={xt.angle}
          textAnchor={xt.anchor}
          height={xt.height}
          interval={xt.interval}
        />
        <YAxis tick={axis} tickFormatter={fmt} width={54} />
        <Tooltip
          contentStyle={tipStyle}
          cursor={{ fill: dark ? "#33415533" : "#00000010" }}
          formatter={(value, name) => [fmt(value), tipName(chart, name)]}
        />
        <Bar dataKey={chart.yKey} fill="#6366f1" radius={chart.compact ? [3, 3, 0, 0] : [6, 6, 0, 0]} maxBarSize={64} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChartCard({ chart, dark }) {
  const typeLabel =
    chart.badge ||
    (chart.type === "line"
      ? "Line"
      : chart.type === "pie"
      ? "Donut"
      : chart.type === "scatter"
      ? "Scatter"
      : "Bar");

  return (
    <div className="print-full print-break rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold leading-tight">{chart.title}</h3>
          {chart.subtitle && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {chart.subtitle}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {typeLabel}
        </span>
      </div>
      <div className="h-56 sm:h-64">
        <ChartBody chart={chart} dark={dark} />
      </div>
    </div>
  );
}

export default function ChartsGrid({ charts }) {
  const dark = useDark();

  if (!charts || charts.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        Ei data theke chart banano jay ni.
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Charts
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {charts.map((c) => (
          <ChartCard key={c.id} chart={c} dark={dark} />
        ))}
      </div>
    </section>
  );
}
