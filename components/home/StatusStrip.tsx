const stats = [
  { label: "Trajectories Catalogued", value: "—", accent: false },
  { label: "Current Catalog Range", value: "—", accent: false },
  { label: "Latest Batch Completed", value: "—", accent: false },
  { label: "Numbers Analyzed by This Engine", value: "—", accent: false },
  { label: "Records in This Dataset", value: "—", accent: false },
];

export function StatusStrip() {
  return (
    <section className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
      {/* Status header row */}
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
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          Placeholder — engine not yet running
        </span>
      </div>

      {/* Stats grid */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="stat-label">{stat.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100 sm:text-2xl">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
