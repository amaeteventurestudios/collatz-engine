const stats = [
  {
    label: "Engine Library",
    value: "Ready",
    sub: "Core computation loaded",
    valueClass: "text-teal-600 dark:text-teal-400",
  },
  {
    label: "Demo Trajectory",
    value: "n = 27",
    sub: "111 steps · peak 9,232",
    valueClass: "text-slate-900 dark:text-slate-100",
  },
  {
    label: "Cataloging",
    value: "Not Connected",
    sub: "Autonomous runner in Phase 4",
    valueClass: "text-slate-500 dark:text-slate-400",
  },
  {
    label: "Numbers Analyzed",
    value: "11",
    sub: "Seed examples only",
    valueClass: "text-slate-900 dark:text-slate-100",
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
            — Engine library loaded
          </span>
        </div>
        <span className="rounded-full bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold text-teal-600 dark:text-teal-400">
          Phase 3 — Engine ready · Autonomous cataloging in Phase 4
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
