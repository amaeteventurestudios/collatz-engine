import { getDemoBatch, DEMO_BATCH_START, DEMO_BATCH_END } from "@/lib/collatz/demo-batch";
import { formatSteps } from "@/lib/collatz/format";
import type { NearEscapeFlag } from "@/lib/collatz/batch-types";

const demo = getDemoBatch();

// Show the top 8 by peak_ratio; full list available via "View all"
const TOP_N = 8;
const topCandidates = [...demo.near_escape_candidates]
  .sort((a, b) => b.peak_ratio - a.peak_ratio)
  .slice(0, TOP_N);

const FLAG_LABELS: Record<NearEscapeFlag, string> = {
  high_peak_ratio: "High peak ratio",
  long_first_descent: "Long first descent",
  high_odd_step_density: "High odd density",
  long_path: "Long path",
  batch_record: "Batch record",
};

const FLAG_COLORS: Record<NearEscapeFlag, string> = {
  high_peak_ratio: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  long_first_descent: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  high_odd_step_density: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  long_path: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  batch_record: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
};

const tableColumns = [
  { label: "Number", hint: "Starting n" },
  { label: "Peak Ratio", hint: "Peak ÷ n" },
  { label: "First Descent", hint: "Steps before drop below n" },
  { label: "Flags", hint: "Why flagged" },
];

export function NearEscapeCandidates() {
  const hasCandidates = topCandidates.length > 0;

  return (
    <section id="near-escape" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <div>
              <p className="section-heading">Near-Escape Candidates</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Numbers with unusually high peak ratios or delayed first descents from demo batch{" "}
                {DEMO_BATCH_START.toLocaleString("en-US")}–{DEMO_BATCH_END.toLocaleString("en-US")}
              </p>
            </div>
            <button className="shrink-0 text-[11px] font-medium text-teal-600 hover:underline dark:text-teal-400">
              View all ({demo.near_escape_candidates.length})
            </button>
          </div>

          {/* Definition callout — prominent */}
          <div className="mb-5 mt-4 flex items-start gap-3 rounded-xl border border-orange-500/30 bg-orange-500/8 px-4 py-4 dark:border-orange-400/30 dark:bg-orange-400/8">
            <span className="mt-0.5 shrink-0 text-base text-orange-500 dark:text-orange-400">△</span>
            <div>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold text-orange-700 dark:text-orange-300">
                  What is a near-escape candidate?
                </p>
                <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                  Visualization label only
                </span>
              </div>
              <p className="text-xs leading-relaxed text-orange-600/80 dark:text-orange-300/70">
                Near-escape candidates are trajectories that climb unusually high, delay descent,
                or show unusually high odd-step density before collapsing back to 1. These numbers
                are flagged for analytical interest based on configurable thresholds.{" "}
                <span className="font-semibold">
                  All verified numbers reach 1.
                </span>{" "}
                Near-escape is a visualization label, not a mathematical claim.
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Column headers */}
            <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
              {tableColumns.map((col) => (
                <div key={col.label} className="px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {col.label}
                  </p>
                  <p className="mt-0.5 text-[9px] text-slate-400 dark:text-slate-600">
                    {col.hint}
                  </p>
                </div>
              ))}
            </div>

            {hasCandidates ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {topCandidates.map((c) => (
                  <div
                    key={c.start_number}
                    className="grid grid-cols-4 items-start gap-2 px-3 py-3 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                  >
                    {/* Number */}
                    <div>
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                        {c.start_number.toLocaleString("en-US")}
                      </span>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {formatSteps(c.steps_to_1)} steps
                      </p>
                    </div>

                    {/* Peak ratio */}
                    <div>
                      <span className="font-mono text-sm font-bold text-orange-600 dark:text-orange-400">
                        ×{c.peak_ratio.toFixed(0)}
                      </span>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        peak: {c.peak_value_string}
                      </p>
                    </div>

                    {/* First descent */}
                    <div>
                      <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {c.first_descent_step !== null
                          ? `step ${c.first_descent_step}`
                          : "—"}
                      </span>
                    </div>

                    {/* Flags */}
                    <div className="flex flex-wrap gap-1">
                      {c.flags.map((flag) => (
                        <span
                          key={flag}
                          className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${FLAG_COLORS[flag]}`}
                        >
                          {FLAG_LABELS[flag]}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
                <span className="text-3xl text-slate-300 dark:text-slate-700">◇</span>
                <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  No near-escape candidates in this batch
                </p>
                <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                  Try lowering the detection thresholds, or run a larger batch range.
                </p>
              </div>
            )}
          </div>

          <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Showing top {Math.min(TOP_N, demo.near_escape_candidates.length)} of{" "}
            {demo.near_escape_candidates.length} candidates by peak ratio · Demo batch{" "}
            {DEMO_BATCH_START.toLocaleString("en-US")}–{DEMO_BATCH_END.toLocaleString("en-US")} ·
            All numbers reach 1
          </p>
        </div>
      </div>
    </section>
  );
}
