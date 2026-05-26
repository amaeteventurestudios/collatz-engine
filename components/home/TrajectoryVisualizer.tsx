"use client";

import { useState } from "react";

const viewModes = ["Trajectory", "Tree View", "Sequence", "Odd-Only (3n+1)"];
const legendItems = [
  { color: "bg-violet-500", label: "Odd steps (3n+1)" },
  { color: "bg-sky-500", label: "Even steps (n/2)" },
  { color: "bg-yellow-400", label: "Peaks" },
  { color: "bg-orange-400", label: "First descent" },
];

export function TrajectoryVisualizer() {
  const [activeView, setActiveView] = useState("Trajectory");

  return (
    <section id="visualizer" className="scroll-mt-20 px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="section-heading">Collatz Trajectory Visualizer</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Interactive chart view — coming in Phase 2
              </p>
            </div>

            {/* View mode tabs */}
            <div className="flex flex-wrap gap-1.5">
              {viewModes.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setActiveView(mode)}
                  className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    activeView === mode
                      ? "bg-teal-500/20 text-teal-600 ring-1 ring-teal-500/40 dark:text-teal-400"
                      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mb-4 flex flex-wrap items-center gap-4">
            {legendItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-sm ${item.color}`} />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Chart placeholder */}
          <div className="placeholder-panel min-h-[280px] sm:min-h-[340px]">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                <svg
                  className="h-6 w-6 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Trajectory Chart
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Full Recharts visualization coming in Phase 2
              </p>
            </div>
          </div>

          {/* Options row */}
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            {["Animate latest", "Show records", "Highlight near-escape"].map((opt) => (
              <label key={opt} className="flex cursor-not-allowed items-center gap-1.5 opacity-50">
                <input type="checkbox" defaultChecked className="h-3 w-3 rounded" readOnly />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{opt}</span>
              </label>
            ))}
            <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">
              Controls active in Phase 2
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
