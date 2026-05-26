const stats = [
  {
    label: "Trajectories Catalogued",
    value: "Demo Mode",
    sub: "Engine not yet connected",
    valueClass: "text-slate-500 dark:text-slate-400",
  },
  {
    label: "Current Catalog Range",
    value: "Awaiting Engine",
    sub: "Range set in Phase 3",
    valueClass: "text-slate-500 dark:text-slate-400",
  },
  {
    label: "Latest Batch Completed",
    value: "Phase 2 Shell",
    sub: "Batches begin in Phase 3",
    valueClass: "text-slate-500 dark:text-slate-400",
  },
  {
    label: "Numbers Analyzed by This Engine",
    value: "Not Yet Connected",
    sub: "Analysis begins in Phase 3",
    valueClass: "text-slate-500 dark:text-slate-400",
  },
  {
    label: "Records in This Dataset",
    value: "0",
    sub: "No records catalogued yet",
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
            — All systems operational
          </span>
        </div>
        <span className="rounded-full bg-yellow-500/10 px-2.5 py-1 text-[10px] font-semibold text-yellow-600 dark:text-yellow-400">
          Demo Mode — Engine connects in Phase 3
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
