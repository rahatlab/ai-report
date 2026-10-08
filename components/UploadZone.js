"use client";

import { useRef, useState } from "react";

// sample sales CSV (test korte ek click-e)
function buildSample() {
  const regions = ["Asia", "Europe", "North America", "South America", "Africa"];
  const products = ["Laptop", "Phone", "Tablet", "Monitor", "Headset"];
  const lines = ["date,region,product,units,revenue"];
  let d = new Date(2024, 0, 1);
  for (let i = 0; i < 45; i++) {
    const date = d.toISOString().slice(0, 10);
    const region = regions[i % regions.length];
    const product = products[(i * 3) % products.length];
    const units = 5 + ((i * 7) % 40);
    const price = 80 + ((i * 13) % 400);
    lines.push(`${date},${region},${product},${units},${units * price}`);
    d = new Date(d.getTime() + 86400000 * 2);
  }
  return lines.join("\n");
}

export default function UploadZone({ onFile, loading, error }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  function take(files) {
    const f = files && files[0];
    if (f) onFile(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setDrag(false);
    take(e.dataTransfer.files);
  }

  function loadSample() {
    const file = new File([buildSample()], "sample_sales.csv", { type: "text/csv" });
    onFile(file);
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current && inputRef.current.click()}
        className={
          "cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition sm:p-14 " +
          (drag
            ? "dropzone-active border-indigo-500"
            : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500 dark:hover:bg-slate-800/60")
        }
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xlsm,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => take(e.target.files)}
        />

        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/30">
          {loading ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-8 w-8 animate-spin">
              <path d="M21 12a9 9 0 1 1-6.2-8.6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M17 8l-5-5-5 5" />
              <path d="M12 3v12" />
            </svg>
          )}
        </div>

        <h2 className="text-lg font-semibold sm:text-xl">
          {loading ? "Analyzing..." : "CSV / Excel file drop koro / click koro"}
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          .csv · .xlsx — Max ~3MB, header row lagbe
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            loadSample();
          }}
          disabled={loading}
          className="mt-5 rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Sample CSV diye test koro
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
          {error}
        </div>
      )}
    </div>
  );
}
