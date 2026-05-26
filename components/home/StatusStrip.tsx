const stats = [
  { label: "Status", value: "LIVE", accent: true },
  { label: "Trajectories Catalogued", value: "—" },
  { label: "Current Catalog Range", value: "—" },
  { label: "Latest Batch Completed", value: "—" },
  { label: "Uptime", value: "—" },
  { label: "Numbers Per Batch", value: "—" },
];

export function StatusStrip() {
  return (
    <section className="border-y border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="stat-label">{stat.label}</p>
              {stat.accent ? (
                <div className="mt-1 flex items-center justify-center gap-1.5">
                  <span className="live-dot" />
                  <span className="text-sm font-bold text-green-500 dark:text-green-400">
                    {stat.value}
                  </span>
                </div>
              ) : (
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {stat.value}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
