const records = [
  {
    icon: "⏱",
    label: "Longest Path",
    value: "—",
    sub: "steps",
    color: "text-orange-500 dark:text-orange-400",
    ring: "ring-orange-500/20 dark:ring-orange-400/20",
  },
  {
    icon: "▲",
    label: "Highest Peak",
    value: "—",
    sub: "peak value",
    color: "text-blue-500 dark:text-blue-400",
    ring: "ring-blue-500/20 dark:ring-blue-400/20",
  },
  {
    icon: "↗",
    label: "Highest Peak Ratio",
    value: "—",
    sub: "vs start",
    color: "text-green-500 dark:text-green-400",
    ring: "ring-green-500/20 dark:ring-green-400/20",
  },
  {
    icon: "↘",
    label: "Longest First Descent Delay",
    value: "—",
    sub: "steps",
    color: "text-yellow-500 dark:text-yellow-400",
    ring: "ring-yellow-500/20 dark:ring-yellow-400/20",
  },
  {
    icon: "≡",
    label: "Highest Odd-Step Density",
    value: "—",
    sub: "of steps",
    color: "text-violet-500 dark:text-violet-400",
    ring: "ring-violet-500/20 dark:ring-violet-400/20",
  },
  {
    icon: "★",
    label: "Latest Record Breaker",
    value: "—",
    sub: "last 24h",
    color: "text-teal-500 dark:text-teal-400",
    ring: "ring-teal-500/20 dark:ring-teal-400/20",
  },
];

export function RecordsPreview() {
  return (
    <section id="records" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        {/* Section heading */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 sm:text-xl">
              Key Records
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All-time highs across all catalogued trajectories
            </p>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Populated when engine runs
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {records.map((rec) => (
            <div
              key={rec.label}
              className={`engine-card-sm text-center ring-1 ${rec.ring}`}
            >
              <span className="text-2xl">{rec.icon}</span>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {rec.label}
              </p>
              <p className={`mt-2.5 text-3xl font-bold tabular-nums ${rec.color}`}>{rec.value}</p>
              <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{rec.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
