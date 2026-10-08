"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import UploadZone from "./UploadZone";
import OverviewCards from "./OverviewCards";
import AIInsight from "./AIInsight";
import ChartsGrid from "./ChartsGrid";
import ColumnStats from "./ColumnStats";
import DataTable from "./DataTable";

const MAX_BYTES = 3_000_000;

function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("File pora jay ni"));
    r.readAsText(file);
  });
}

function IconBtn({ onClick, title, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 " +
        className
      }
    >
      {children}
    </button>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [ai, setAi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiError, setAiError] = useState("");
  const [fileName, setFileName] = useState("");

  async function handleFile(file) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("File onek boro — max ~3MB CSV diye submit koro.");
      return;
    }
    let text;
    try {
      text = await readFile(file);
    } catch (e) {
      setError(e.message || "File pora jay ni");
      return;
    }
    runAnalysis(text, file.name || "upload.csv");
  }

  function runAnalysis(csv, name) {
    setFileName(name);
    setData(null);
    setAi(null);
    setError("");
    setAiError("");
    setLoading(true);
    setAiLoading(true);

    const body = JSON.stringify({ csv, fileName: name });
    const opts = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    };

    fetch("/api/analyze", opts)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Analyze failed");
        setData(d);
      })
      .catch((e) => setError(e.message || "Analyze failed"))
      .finally(() => setLoading(false));

    fetch("/api/insight", opts)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "AI report failed");
        setAi(d.ai);
      })
      .catch((e) => setAiError(e.message || "AI report failed"))
      .finally(() => setAiLoading(false));
  }

  function reset() {
    setData(null);
    setAi(null);
    setFileName("");
    setError("");
    setAiError("");
    setLoading(false);
    setAiLoading(false);
  }

  async function logout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    router.push("/login");
    router.refresh();
  }

  const provider = data?.meta?.provider;

  return (
    <div className="min-h-screen">
      {/* ---------- header ---------- */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M3 3v18h18" />
                <path d="M7 14l3-3 3 3 5-6" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight sm:text-base">
                AI CSV Report
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {data ? fileName : "CSV upload → AI analysis"}
              </p>
            </div>
          </div>

          <div className="no-print flex items-center gap-2">
            {data && (
              <>
                <IconBtn
                  onClick={() => window.print()}
                  title="Print / PDF"
                  className="hidden sm:inline-flex"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  <span className="hidden md:inline">PDF</span>
                </IconBtn>
                <IconBtn onClick={reset} title="New file">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="hidden md:inline">New</span>
                </IconBtn>
              </>
            )}
            <ThemeToggle />
            <IconBtn onClick={logout} title="Logout" className="text-rose-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
            </IconBtn>
          </div>
        </div>
      </header>

      {/* ---------- body ---------- */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {!data ? (
          <div>
            <div className="mx-auto mb-8 max-w-2xl text-center">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                CSV diye <span className="text-indigo-500">instant AI report</span> nao
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
                Summary, chart, statistics ar AI insight — sob ek sathe, ek click-e.
              </p>
            </div>
            <UploadZone onFile={handleFile} loading={loading} error={error} />
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* meta bar */}
            <div className="print-full flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <span className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {fileName}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-3">
                <span>{data.overview.rows} rows</span>
                <span>·</span>
                <span>{data.overview.columns} columns</span>
                {provider && (
                  <>
                    <span>·</span>
                    <span className="capitalize">{provider}</span>
                  </>
                )}
                <span>·</span>
                <span>
                  {new Date(data.meta.generatedAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </span>
            </div>

            <OverviewCards overview={data.overview} />

            <AIInsight ai={ai} loading={aiLoading} error={aiError} />

            <ChartsGrid charts={data.charts} />

            <ColumnStats profiles={data.profiles} />

            <DataTable table={data.table} />

            <div className="no-print flex justify-center pt-2">
              <button
                type="button"
                onClick={reset}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:opacity-95"
              >
                + Ar ekta CSV analyze koro
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
