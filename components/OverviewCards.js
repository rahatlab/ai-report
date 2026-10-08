"use client";

function Card({ label, value, sub, tone = "indigo" }) {
  const tones = {
    indigo: "from-indigo-500 to-indigo-600",
    sky: "from-sky-500 to-sky-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
    rose: "from-rose-500 to-rose-600",
    violet: "from-violet-500 to-violet-600",
  };
  return (
    <div className="print-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br ${tones[tone] || tones.indigo}`}
        />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
      {sub && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>
      )}
    </div>
  );
}

export default function OverviewCards({ overview }) {
  if (!overview) return null;
  const o = overview;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Overview
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
        <Card label="Rows" value={o.rows} sub={o.truncated ? `used ${o.rowsUsed}` : "all rows"} tone="indigo" />
        <Card label="Columns" value={o.columns} sub={`${o.numeric} num · ${o.categories} cat`} tone="sky" />
        <Card label="Numeric" value={o.numeric} sub="number columns" tone="emerald" />
        <Card label="Dates" value={o.dates} sub="date columns" tone="violet" />
        <Card
          label="Missing"
          value={`${o.missingPct}%`}
          sub={`${o.missingCells} cells`}
          tone={o.missingPct > 5 ? "rose" : "amber"}
        />
        <Card label="Complete" value={o.completeColumns} sub="no missing col" tone="amber" />
      </div>
    </section>
  );
}
