"use client";

const TYPE_STYLE = {
  number: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  category: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  date: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  empty: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

function statsText(p) {
  if (p.type === "number") {
    return `min ${p.min} · max ${p.max} · mean ${p.mean} · median ${p.median} · std ${p.std} · sum ${p.sum}`;
  }
  if (p.type === "date") return `${p.min} → ${p.max}`;
  if (p.type === "category") {
    const top = (p.top || [])
      .slice(0, 4)
      .map((t) => `${t.value} (${t.count})`)
      .join(", ");
    return `unique ${p.unique}${top ? " · " + top : ""}`;
  }
  return "—";
}

export default function ColumnStats({ profiles }) {
  if (!profiles || profiles.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Column Statistics
      </h2>

      <div className="print-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Column</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Missing</th>
                <th className="px-4 py-3 font-semibold">Records</th>
                <th className="px-4 py-3 font-semibold">Statistics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {profiles.map((p) => (
                <tr
                  key={p.name}
                  className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                    {p.name}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${
                        TYPE_STYLE[p.type] || TYPE_STYLE.empty
                      }`}
                    >
                      {p.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    <span className={p.missing > 0 ? "text-rose-500" : "text-slate-400"}>
                      {p.missing} ({p.missingPct}%)
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">
                    {p.present}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400">
                    {statsText(p)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
