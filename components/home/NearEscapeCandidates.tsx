const tableColumns = [
  { label: "Number", hint: "Starting n" },
  { label: "Peak Ratio", hint: "Peak / n" },
  { label: "First Descent Delay", hint: "Steps before first drop below n" },
  { label: "Status", hint: "Candidate classification" },
];

export function NearEscapeCandidates() {
  return (
    <section id="near-escape" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <div>
              <p className="section-heading">Near-Escape Candidates</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Numbers with unusually high peak ratios or delayed first descents — potential
                analytical interest
              </p>
            </div>
            <button className="shrink-0 text-[11px] font-medium text-teal-600 hover:underline dark:text-teal-400">
              View all
            </button>
          </div>

          {/* Definition callout */}
          <div className="mb-5 mt-4 flex items-start gap-2.5 rounded-xl border border-orange-500/20 bg-orange-500/5 px-3.5 py-3 dark:border-orange-400/20 dark:bg-orange-400/5">
            <span className="mt-0.5 shrink-0 text-sm text-orange-500 dark:text-orange-400">△</span>
            <div>
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                What is a near-escape candidate?
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-orange-600/80 dark:text-orange-300/70">
                A number whose trajectory takes an unusually long time to descend below its starting
                value, or reaches an exceptionally high peak relative to n. These are flagged for
                closer inspection — they do not escape to infinity (all verified numbers eventually
                reach 1), but they exhibit statistically notable behavior.
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

            {/* Empty state */}
            <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
              <span className="text-3xl text-slate-300 dark:text-slate-700">◇</span>
              <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                No near-escape candidates yet
              </p>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                Detection begins when the engine is connected and begins cataloging trajectories.
                Candidates are identified automatically based on configurable thresholds.
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Detection begins in Phase 3
                </span>
              </div>
            </div>
          </div>

          <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
            All numbers catalogued by this engine have confirmed Collatz trajectories ending at 1.
            Near-escape status is a visualization label, not a mathematical claim.
          </p>
        </div>
      </div>
    </section>
  );
}
