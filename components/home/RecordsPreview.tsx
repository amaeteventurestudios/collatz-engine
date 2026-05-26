import { getDemoBatch, DEMO_BATCH_START, DEMO_BATCH_END } from "@/lib/collatz/demo-batch";
import { formatBigInt, formatRatio, formatDensity, formatSteps } from "@/lib/collatz/format";

// Pre-computed batch records for the demo range
const demo = getDemoBatch();

const records = [
  {
    icon: "⏱",
    label: "Longest Path",
    value: `${formatSteps(demo.max_steps)} steps`,
    sub: `n = ${demo.max_steps_number.toLocaleString("en-US")} · Demo batch`,
    color: "text-orange-500 dark:text-orange-400",
    ring: "ring-orange-500/20 dark:ring-orange-400/20",
    bg: "bg-orange-500/5 dark:bg-orange-500/5",
  },
  {
    icon: "▲",
    label: "Highest Peak",
    value: formatBigInt(BigInt(demo.max_peak)),
    sub: `n = ${demo.max_peak_number.toLocaleString("en-US")} · Demo batch`,
    color: "text-blue-500 dark:text-blue-400",
    ring: "ring-blue-500/20 dark:ring-blue-400/20",
    bg: "bg-blue-500/5 dark:bg-blue-500/5",
  },
  {
    icon: "↗",
    label: "Highest Peak Ratio",
    value: `×${formatRatio(demo.max_peak_ratio, 0)}`,
    sub: `n = ${demo.max_peak_ratio_number.toLocaleString("en-US")} · peak ÷ n`,
    color: "text-green-500 dark:text-green-400",
    ring: "ring-green-500/20 dark:ring-green-400/20",
    bg: "bg-green-500/5 dark:bg-green-500/5",
  },
  {
    icon: "↘",
    label: "Longest First Descent",
    value:
      demo.longest_first_descent_delay !== null
        ? `${formatSteps(demo.longest_first_descent_delay)} steps`
        : "—",
    sub:
      demo.longest_first_descent_number !== null
        ? `n = ${demo.longest_first_descent_number.toLocaleString("en-US")} · Demo batch`
        : "No data yet",
    color: "text-yellow-500 dark:text-yellow-400",
    ring: "ring-yellow-500/20 dark:ring-yellow-400/20",
    bg: "bg-yellow-500/5 dark:bg-yellow-500/5",
  },
  {
    icon: "≡",
    label: "Highest Odd-Step Density",
    value: formatDensity(demo.highest_odd_step_density),
    sub: `n = ${demo.highest_odd_density_number.toLocaleString("en-US")} · odd steps ÷ total`,
    color: "text-violet-500 dark:text-violet-400",
    ring: "ring-violet-500/20 dark:ring-violet-400/20",
    bg: "bg-violet-500/5 dark:bg-violet-500/5",
  },
  {
    icon: "★",
    label: "Records in This Dataset",
    value: "Phase 5/6",
    sub: "Autonomous cataloging pending",
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
            Demo records from local seed batch (
            {DEMO_BATCH_START.toLocaleString("en-US")}–{DEMO_BATCH_END.toLocaleString("en-US")}) ·
            Computed by the batch runner · No live dataset yet
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {records.map((rec) => (
            <div
              key={rec.label}
              className={`engine-card-sm flex flex-col items-center text-center ring-1 ${rec.ring} ${rec.bg}`}
            >
              <span className={`text-3xl leading-none ${rec.color}`}>{rec.icon}</span>
              <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {rec.label}
              </p>
              <p className={`mt-2 text-sm font-bold leading-tight tabular-nums ${rec.color}`}>
                {rec.value}
              </p>
              <p className="mt-1 text-[9px] leading-snug text-slate-400 dark:text-slate-500">
                {rec.sub}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
          Demo records from local batch ({DEMO_BATCH_START.toLocaleString("en-US")}–
          {DEMO_BATCH_END.toLocaleString("en-US")}). These are not global records. Live dataset
          records begin when autonomous cataloging starts in Phase 5/6.
        </p>
      </div>
    </section>
  );
}
