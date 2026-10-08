"use client";

function Bullet({ icon, tone, items }) {
  const tones = {
    sky: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  };
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
          <span
            className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${tones[tone]}`}
          >
            {icon}
          </span>
          <span className="text-slate-700 dark:text-slate-300">{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-4 w-11/12 rounded" />
      <div className="skeleton h-4 w-4/5 rounded" />
      <div className="pt-2 skeleton h-4 w-2/3 rounded" />
    </div>
  );
}

export default function AIInsight({ ai, loading, error }) {
  const providerLabel =
    ai?.provider === "groq" ? "Groq" : ai?.provider === "gemini" ? "Gemini" : null;

  return (
    <section className="print-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-gradient-to-r from-indigo-500/10 to-sky-500/10 px-4 py-3 dark:border-slate-800 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
            </svg>
          </span>
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            AI Analysis Report
          </h2>
        </div>

        {!loading && providerLabel && (
          <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            {providerLabel} · {ai.model}
          </span>
        )}
        {loading && (
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-500">
            <span className="h-2 w-2 animate-ping rounded-full bg-indigo-500" />
            Generating...
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5">
        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            AI report ashe ni: {error}
          </div>
        )}

        {!error && loading && <Skeleton />}

        {!error && !loading && ai && !ai.available && (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            {ai.reason && ai.reason.startsWith("No AI key set") ? (
              <>
                AI key set hoyni — <code className="font-mono">.env.local</code> te{" "}
                <code className="font-mono">GEMINI_API_KEY</code> ba{" "}
                <code className="font-mono">GROQ_API_KEY</code> boshao, tarpor server
                restart koro.
              </>
            ) : (
              <>
                <span className="font-semibold">AI report generate hoy ni.</span>{" "}
                <span className="opacity-80">({ai.reason})</span>
              </>
            )}
          </div>
        )}

        {!error && !loading && ai && ai.available && (
          <div className="space-y-5">
            {ai.executiveSummary && (
              <div>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Executive Summary
                </h3>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 sm:text-[15px]">
                  {ai.executiveSummary}
                </p>
              </div>
            )}

            {ai.keyInsights?.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Key Insights
                </h3>
                <Bullet icon="✦" tone="sky" items={ai.keyInsights} />
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              {ai.anomalies?.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-500">
                    Anomalies
                  </h3>
                  <Bullet icon="!" tone="rose" items={ai.anomalies} />
                </div>
              )}

              {ai.recommendations?.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Recommendations
                  </h3>
                  <Bullet icon="→" tone="emerald" items={ai.recommendations} />
                </div>
              )}
            </div>

            {ai.dataQuality && (
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-950/60">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  Data quality:{" "}
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  {ai.dataQuality}
                </span>
              </div>
            )}
          </div>
        )}

        {!error && !loading && !ai && (
          <p className="text-sm text-slate-500 dark:text-slate-400">AI report ashe ni.</p>
        )}
      </div>
    </section>
  );
}
