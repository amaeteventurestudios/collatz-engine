"use client";

import { useState } from "react";

const patternViews = [
  "Steps to 1 (log scale)",
  "Peak Value Distribution",
  "Odd Step Density",
  "First Descent Delay",
];

export function PatternViews() {
  const [activeView, setActiveView] = useState(patternViews[0]);

  return (
    <section className="px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="section-heading">Heatmaps &amp; Pattern Views</p>
            <button className="shrink-0 text-[11px] font-medium text-teal-600 hover:underline dark:text-teal-400">
              View all
            </button>
          </div>

          {/* View tabs — horizontally scrollable on mobile */}
          <div className="-mx-5 mb-5 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {patternViews.map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`flex-shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  activeView === view
                    ? "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {view}
              </button>
            ))}
          </div>

          {/* Heatmap placeholder */}
          <div className="placeholder-panel min-h-[240px]">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 dark:bg-slate-700">
                <svg
                  className="h-7 w-7 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {activeView}
              </p>
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                D3-powered heatmap — arriving in Phase 3
              </p>
            </div>
          </div>

          {/* Axis labels */}
          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
            <span>Starting Number →</span>
            <span>← Steps (log scale)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
