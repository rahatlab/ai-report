"use client";

import { useState } from "react";

const SIZES = [10, 25, 50, 100];

export default function DataTable({ table }) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);

  if (!table || !table.columns || table.columns.length === 0) return null;

  const rows = table.rows || [];
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, pages);
  const start = (current - 1) * size;
  const slice = rows.slice(start, start + size);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Data Table
          <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">
            {table.total > total
              ? `showing ${total} of ${table.total} rows`
              : `${total} rows`}
          </span>
        </h2>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 dark:text-slate-400">Rows</label>
          <select
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="print-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="thin-scroll max-h-[520px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-3 py-3 font-semibold text-slate-400 dark:text-slate-500">#</th>
                {table.columns.map((c) => (
                  <th
                    key={c}
                    className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700 dark:text-slate-300"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {slice.map((r, i) => (
                <tr
                  key={i}
                  className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="px-3 py-2 tabular-nums text-slate-400">{start + i + 1}</td>
                  {r.map((v, j) => (
                    <td
                      key={j}
                      className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-300"
                    >
                      {v === "" || v === null || v === undefined ? (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      ) : (
                        String(v)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-2.5 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {total === 0 ? "0 rows" : `${start + 1}–${Math.min(start + size, total)} of ${total}`}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={current <= 1}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Prev
            </button>
            <span className="px-1 text-xs tabular-nums text-slate-600 dark:text-slate-300">
              {current} / {pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={current >= pages}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
