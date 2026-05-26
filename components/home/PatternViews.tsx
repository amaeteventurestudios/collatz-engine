"use client";

import { useState } from "react";

const patternViews = [
  "Steps to 1 (log scale)",
  "Peak Value Distribution",
  "Odd Step Density",
  "First Descent Delay",
];

/*
 * A static visual heatmap placeholder.
 * Each inner array is one row of column intensity values (0–1).
 * Colors are mapped: low → blue, mid → teal/green, high → orange/red.
 * Pattern mimics actual Collatz step-count distribution across starting numbers.
 */
const HEATMAP_ROWS: number[][] = [
  [0.2, 0.4, 0.9, 0.3, 0.7, 0.5, 0.95, 0.2, 0.6, 0.85, 0.4, 0.7, 0.3, 0.9, 0.5, 0.8, 0.35, 0.65, 0.9, 0.45],
  [0.15, 0.6, 0.75, 0.4, 0.5, 0.85, 0.6, 0.3, 0.8, 0.45, 0.7, 0.55, 0.9, 0.35, 0.75, 0.6, 0.5, 0.8, 0.4, 0.7],
  [0.3, 0.5, 0.6, 0.8, 0.35, 0.65, 0.45, 0.75, 0.55, 0.9, 0.25, 0.7, 0.5, 0.6, 0.8, 0.4, 0.85, 0.3, 0.6, 0.5],
  [0.4, 0.7, 0.45, 0.6, 0.9, 0.3, 0.75, 0.55, 0.65, 0.4, 0.85, 0.5, 0.3, 0.8, 0.45, 0.7, 0.6, 0.5, 0.75, 0.35],
  [0.55, 0.35, 0.8, 0.5, 0.4, 0.7, 0.3, 0.85, 0.45, 0.6, 0.5, 0.35, 0.75, 0.6, 0.4, 0.9, 0.55, 0.65, 0.3, 0.8],
  [0.6, 0.8, 0.35, 0.7, 0.55, 0.45, 0.85, 0.4, 0.7, 0.3, 0.65, 0.8, 0.5, 0.45, 0.75, 0.35, 0.6, 0.9, 0.5, 0.4],
  [0.75, 0.5, 0.65, 0.35, 0.8, 0.6, 0.4, 0.7, 0.3, 0.85, 0.55, 0.4, 0.7, 0.9, 0.35, 0.65, 0.8, 0.45, 0.6, 0.55],
  [0.9, 0.65, 0.5, 0.85, 0.6, 0.75, 0.55, 0.35, 0.8, 0.5, 0.7, 0.6, 0.85, 0.4, 0.55, 0.7, 0.45, 0.35, 0.8, 0.65],
];

function intensityToClass(v: number): string {
  if (v >= 0.88) return "bg-red-500 dark:bg-red-400";
  if (v >= 0.75) return "bg-orange-400 dark:bg-orange-300";
  if (v >= 0.62) return "bg-yellow-400 dark:bg-yellow-300";
  if (v >= 0.48) return "bg-green-400 dark:bg-green-300";
  if (v >= 0.35) return "bg-teal-400 dark:bg-teal-300";
  return "bg-sky-500 dark:bg-sky-400";
}

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

          {/* View tabs */}
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

          {/* Static heatmap grid */}
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Y-axis labels + grid */}
            <div className="flex">
              <div className="flex w-10 flex-col items-end justify-around py-2 pr-2 text-[9px] text-slate-400 dark:text-slate-600">
                <span>High</span>
                <span></span>
                <span></span>
                <span></span>
                <span>Low</span>
              </div>
              <div className="flex-1 py-2 pr-2">
                <div className="flex flex-col gap-0.5">
                  {HEATMAP_ROWS.map((row, ri) => (
                    <div key={ri} className="flex gap-0.5">
                      {row.map((val, ci) => (
                        <div
                          key={ci}
                          className={`h-5 flex-1 rounded-sm transition-opacity ${intensityToClass(val)}`}
                          style={{ opacity: 0.45 + val * 0.55 }}
                          title={`Value: ${(val * 100).toFixed(0)}%`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* X-axis + legend strip */}
            <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400 dark:text-slate-500">
                  Starting number →
                </span>
                <div className="flex items-center gap-2">
                  {[
                    { label: "Fewer steps", cls: "bg-sky-500" },
                    { label: "More steps", cls: "bg-red-500" },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1">
                      <span className={`h-2 w-4 rounded-sm ${l.cls} opacity-70`} />
                      <span className="text-[9px] text-slate-400 dark:text-slate-500">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Demo heatmap. Pattern views activate with real batch data in Phase 3. Colors represent
            relative step-count intensity — not verified computation.
          </p>
        </div>
      </div>
    </section>
  );
}
