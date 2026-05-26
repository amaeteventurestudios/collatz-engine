import { getDemoBatch, DEMO_BATCH_START, DEMO_BATCH_END } from "@/lib/collatz/demo-batch";

// Pre-computed at module load (fast: ~15 ms for 1–1,000)
const demo = getDemoBatch();

const stats = [
  {
    label: "Engine Library",
    value: "Ready",
    sub: "Core computation loaded",
    valueClass: "text-teal-600 dark:text-teal-400",
  },
  {
    label: "Batch Runner",
    value: "Ready",
    sub: `${demo.numbers_tested.toLocaleString("en-US")} computed · ${demo.duration_ms} ms`,
    valueClass: "text-teal-600 dark:text-teal-400",
  },
  {
    label: "Demo Batch",
    value: `${DEMO_BATCH_START.toLocaleString("en-US")}–${DEMO_BATCH_END.toLocaleString("en-US")}`,
    sub: `${demo.max_steps} step max · ${demo.near_escape_candidates.length} candidates`,
    valueClass: "text-slate-900 dark:text-slate-100",
  },
  {
    label: "Autonomous Cataloging",
    value: "Pending",
    sub: "Phase 5/6 — not yet active",
    valueClass: "text-slate-500 dark:text-slate-400",
  },
  {
    label: "Dataset Records",
    value: "0",
    sub: "No live records catalogued",
    valueClass: "text-2xl font-bold text-slate-900 dark:text-slate-100",
  },
];

export function StatusStrip() {
  return (
    <section className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
      {/* Live status header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-800 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="live-dot" />
          <span className="text-xs font-bold uppercase tracking-widest text-green-600 dark:text-green-400">
            Live
          </span>
          <span className="hidden text-[11px] text-slate-500 dark:text-slate-400 sm:inline">
            — Engine library loaded · batch runner ready
          </span>
        </div>
        <span className="rounded-full bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold text-teal-600 dark:text-teal-400">
          Phase 4 — Batch runner ready · Autonomous cataloging Phase 5/6
        </span>
      </div>

      {/* Stats grid */}
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="stat-label">{stat.label}</p>
              <p
                className={`mt-1.5 text-sm font-bold leading-tight tabular-nums sm:text-base ${stat.valueClass}`}
              >
                {stat.value}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
