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
          {/* Header row */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="section-heading">Collatz Trajectory Visualizer</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Interactive chart — arriving in Phase 3
              </p>
            </div>

            {/* View mode tabs — scrollable on mobile */}
            <div
              className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0"
            >
              {viewModes.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setActiveView(mode)}
                  className={`flex-shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
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

          {/* Legend — 2-col on mobile, row on sm+ */}
          <div className="mb-5 grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
            {legendItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-sm ${item.color}`} />
                <span className="text-xs text-slate-500 dark:text-slate-400">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Chart placeholder */}
          <div className="placeholder-panel min-h-[260px] sm:min-h-[340px]">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 dark:bg-slate-700">
                <svg
                  className="h-7 w-7 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Trajectory Chart
              </p>
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                Recharts visualization — arriving in Phase 3
              </p>
            </div>
          </div>

          {/* Options row */}
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:flex-wrap sm:items-center">
            {["Animate latest", "Show records", "Highlight near-escape"].map((opt) => (
              <label
                key={opt}
                className="flex cursor-not-allowed items-center gap-2 opacity-40"
              >
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-3.5 w-3.5 rounded"
                  readOnly
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">{opt}</span>
              </label>
            ))}
            <span className="text-[10px] text-slate-400 dark:text-slate-500 sm:ml-auto">
              Controls active in Phase 3
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
