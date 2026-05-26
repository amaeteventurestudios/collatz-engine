import { getDemoBatch, DEMO_BATCH_START, DEMO_BATCH_END } from "@/lib/collatz/demo-batch";
import { EngineRuntimeCard, LocalTimeCard } from "@/components/home/TimeStatusCards";

// Pre-computed at module load (fast: ~15 ms for 1–1,000)
const demo = getDemoBatch();

const staticStats = [
  {
    label: "Engine Status",
    value: "Ready",
    sub: "Core computation loaded",
    valueClass: "text-teal-600 dark:text-teal-400",
  },
  {
    label: "Trajectories Catalogued",
    value: demo.numbers_tested.toLocaleString("en-US"),
    sub: "Demo batch · no live data yet",
    valueClass: "text-slate-900 dark:text-slate-100",
  },
  {
    label: "Current Catalog Range",
    value: `${DEMO_BATCH_START.toLocaleString("en-US")}–${DEMO_BATCH_END.toLocaleString("en-US")}`,
    sub: "Demo range · Phase 5/6 for live",
    valueClass: "text-slate-900 dark:text-slate-100",
  },
  {
    label: "Latest Batch Completed",
    value: `${demo.duration_ms} ms`,
    sub: `${demo.numbers_tested.toLocaleString("en-US")} numbers · ${demo.max_steps} step max`,
    valueClass: "text-slate-900 dark:text-slate-100",
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
            — Engine ready · batch runner active
          </span>
        </div>
        <span className="rounded-full bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold text-teal-600 dark:text-teal-400">
          Phase 4B — Time system added · Autonomous cataloging Phase 5/6
        </span>
      </div>

      {/* Stats grid — 4 static stats + 2 live time cards */}
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {/* Static stats */}
          {staticStats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center rounded-xl px-3 py-3 text-center"
            >
              <p className="stat-label">{stat.label}</p>
              <p
                className={`mt-1.5 text-sm font-bold leading-tight tabular-nums ${stat.valueClass}`}
              >
                {stat.value}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-slate-400 dark:text-slate-500">
                {stat.sub}
              </p>
            </div>
          ))}

          {/* Live time cards (client components) */}
          <EngineRuntimeCard />
          <LocalTimeCard />
        </div>
      </div>
    </section>
  );
}
