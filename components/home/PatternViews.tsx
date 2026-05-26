const patternViews = [
  "Steps to 1 (log scale)",
  "Peak Value Distribution",
  "Odd Step Density",
  "First Descent Delay",
];

export function PatternViews() {
  return (
    <section className="px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          <div className="mb-4 flex items-center justify-between">
            <p className="section-heading">Heatmaps &amp; Pattern Views</p>
            <button className="text-[11px] font-medium text-teal-600 hover:underline dark:text-teal-400">
              View all
            </button>
          </div>

          {/* View selector */}
          <div className="mb-5 flex flex-wrap gap-1.5">
            {patternViews.map((view, i) => (
              <button
                key={view}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  i === 0
                    ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {view}
              </button>
            ))}
          </div>

          {/* Heatmap placeholder */}
          <div className="placeholder-panel min-h-[240px]">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                <svg
                  className="h-6 w-6 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Heatmap Visualization
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                D3-powered heatmaps coming in Phase 2
              </p>
            </div>
          </div>

          {/* Axis labels placeholder */}
          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
            <span>Starting Number</span>
            <span>Steps (log scale)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
