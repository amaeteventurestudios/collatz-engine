import { getSeedDemoRecords } from "@/lib/collatz/examples";
import { formatBigInt, formatRatio, formatDensity, formatSteps } from "@/lib/collatz/format";

// Computed from the seed examples by the Collatz engine
const demoRecords = getSeedDemoRecords();

const records = [
  {
    icon: "⏱",
    label: "Longest Path",
    value: `${formatSteps(demoRecords.longestPath.steps_to_1)} steps`,
    sub: `n = ${formatBigInt(demoRecords.longestPath.start_number)} · Demo seed examples`,
    color: "text-orange-500 dark:text-orange-400",
    ring: "ring-orange-500/20 dark:ring-orange-400/20",
    bg: "bg-orange-500/5 dark:bg-orange-500/5",
  },
  {
    icon: "▲",
    label: "Highest Peak",
    value: formatBigInt(demoRecords.highestPeak.peak_value),
    sub: `n = ${formatBigInt(demoRecords.highestPeak.start_number)} · Demo seed examples`,
    color: "text-blue-500 dark:text-blue-400",
    ring: "ring-blue-500/20 dark:ring-blue-400/20",
    bg: "bg-blue-500/5 dark:bg-blue-500/5",
  },
  {
    icon: "↗",
    label: "Highest Peak Ratio",
    value: `×${formatRatio(demoRecords.highestPeakRatio.peak_ratio, 0)}`,
    sub: `n = ${formatBigInt(demoRecords.highestPeakRatio.start_number)} · peak ÷ n`,
    color: "text-green-500 dark:text-green-400",
    ring: "ring-green-500/20 dark:ring-green-400/20",
    bg: "bg-green-500/5 dark:bg-green-500/5",
  },
  {
    icon: "≡",
    label: "Highest Odd-Step Density",
    value: formatDensity(demoRecords.highestOddDensity.odd_step_density),
    sub: `n = ${formatBigInt(demoRecords.highestOddDensity.start_number)} · odd steps ÷ total`,
    color: "text-violet-500 dark:text-violet-400",
    ring: "ring-violet-500/20 dark:ring-violet-400/20",
    bg: "bg-violet-500/5 dark:bg-violet-500/5",
  },
  {
    icon: "↘",
    label: "Longest First Descent",
    value: "No records yet",
    sub: "Awaiting engine data",
    color: "text-yellow-500 dark:text-yellow-400",
    ring: "ring-yellow-500/20 dark:ring-yellow-400/20",
    bg: "bg-yellow-500/5 dark:bg-yellow-500/5",
  },
  {
    icon: "★",
    label: "Records in This Dataset",
    value: "Phase 4",
    sub: "Autonomous cataloging begins in Phase 4",
    color: "text-teal-500 dark:text-teal-400",
    ring: "ring-teal-500/20 dark:ring-teal-400/20",
    bg: "bg-teal-500/5 dark:bg-teal-500/5",
  },
];

export function RecordsPreview() {
  return (
    <section id="records" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        {/* Section heading */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
            Key Records
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Records from demo seed examples · Computed by the Collatz engine · No live dataset yet
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {records.map((rec) => (
            <div
              key={rec.label}
              className={`engine-card-sm flex flex-col items-center text-center ring-1 ${rec.ring} ${rec.bg}`}
            >
              <span className="text-2xl">{rec.icon}</span>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {rec.label}
              </p>
              <p className={`mt-2 text-xs font-bold leading-tight ${rec.color}`}>{rec.value}</p>
              <p className="mt-1 text-[9px] leading-snug text-slate-400 dark:text-slate-500">
                {rec.sub}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
          Values marked &ldquo;Demo seed examples&rdquo; are computed locally from{" "}
          {[1, 2, 3, 6, 7, 27, 97, 871, 6171, 77031, 837799].length} known starting numbers. Live
          dataset records begin in Phase 4.
        </p>
      </div>
    </section>
  );
}
