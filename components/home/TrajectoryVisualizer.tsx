"use client";

import { useState } from "react";

const viewModes = ["Trajectory", "Tree View", "Sequence", "Odd-Only (3n+1)"];

const legendItems = [
  { color: "bg-violet-500", label: "Odd steps (3n+1)" },
  { color: "bg-sky-500", label: "Even steps (n/2)" },
  { color: "bg-yellow-400", label: "Peaks" },
  { color: "bg-orange-400", label: "First descent" },
];

/*
 * Actual Collatz trajectory for n=27, log₁₀ scale
 * ViewBox: 0 0 600 200  |  peak (9232) at y=25, n=1 at y=185
 * Computed: x = step × (600/111), y = 185 − (log10(v)/log10(9232)) × 160
 */
const TRAJECTORY_POINTS =
  "0,127 5,108 11,120 16,101 22,113 27,125 32,105 38,118 43,98 49,110 " +
  "54,91 59,103 65,84 70,96 76,77 81,89 86,101 92,82 97,94 103,106 " +
  "108,87 113,99 119,79 124,92 130,104 135,85 140,97 146,77 151,90 157,70 " +
  "162,82 167,95 173,75 178,87 184,68 189,80 195,61 200,73 205,54 211,66 " +
  "216,78 222,59 227,71 232,83 238,95 243,76 249,88 254,69 259,81 265,62 " +
  "270,74 276,86 281,67 286,79 292,60 297,72 303,84 308,65 313,77 319,58 " +
  "324,70 330,50 335,63 341,43 346,55 351,36 357,48 362,29 368,41 373,53 " +
  "378,66 384,46 389,58 395,39 400,51 405,32 411,44 416,25 422,37 427,49 " +
  "432,61 438,74 443,54 449,66 454,79 459,59 465,71 470,84 476,64 481,77 " +
  "486,89 492,101 497,113 503,94 508,106 513,118 519,130 524,111 530,123 535,103 " +
  "541,115 546,96 551,108 557,120 562,133 568,145 573,157 578,136 584,149 589,161 " +
  "595,173 600,185";

export function TrajectoryVisualizer() {
  const [activeView, setActiveView] = useState("Trajectory");

  return (
    <section id="visualizer" className="scroll-mt-20 px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="section-heading">Collatz Trajectory Visualizer</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Showing n=27 · 111 steps · log scale — real-time engine arriving in Phase 3
              </p>
            </div>

            {/* View mode tabs */}
            <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0">
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

          {/* Legend */}
          <div className="mb-5 grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
            {legendItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-sm ${item.color}`} />
                <span className="text-xs text-slate-500 dark:text-slate-400">{item.label}</span>
              </div>
            ))}
          </div>

          {/* SVG Chart */}
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
            <svg
              viewBox="0 0 600 200"
              width="100%"
              height="auto"
              className="block"
              aria-label="Demo Collatz trajectory for n=27, log scale"
            >
              {/* Grid lines (log scale: 10, 100, 1000) */}
              <line x1="0" y1="145" x2="600" y2="145" stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />
              <line x1="0" y1="104" x2="600" y2="104" stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />
              <line x1="0" y1="64" x2="600" y2="64" stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />

              {/* Y-axis labels */}
              <text x="4" y="149" fontSize="8" fill="currentColor" opacity="0.3">10</text>
              <text x="4" y="108" fontSize="8" fill="currentColor" opacity="0.3">100</text>
              <text x="4" y="68" fontSize="8" fill="currentColor" opacity="0.3">1K</text>

              {/* Trajectory fill (area under line) */}
              <polyline
                points={"0,185 " + TRAJECTORY_POINTS + " 600,185"}
                fill="url(#trailFill)"
                stroke="none"
              />

              {/* Main trajectory line */}
              <polyline
                points={TRAJECTORY_POINTS}
                fill="none"
                stroke="url(#trailLine)"
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Peak marker — n=27 peaks at step 77, value 9232 */}
              <circle cx="416" cy="25" r="4" fill="#facc15" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
              <line x1="416" y1="30" x2="416" y2="185" stroke="#facc15" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="3 3" />

              {/* Peak label */}
              <rect x="422" y="14" width="56" height="14" rx="3" fill="#facc15" fillOpacity="0.15" />
              <text x="425" y="24" fontSize="8.5" fill="#ca8a04" fontWeight="600">Peak: 9,232</text>

              {/* Start marker */}
              <circle cx="0" cy="127" r="3" fill="#14b8a6" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
              <text x="4" y="122" fontSize="8" fill="#14b8a6" fontWeight="600">n=27</text>

              {/* End marker */}
              <circle cx="600" cy="185" r="3" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />

              {/* X-axis step labels */}
              <text x="0" y="198" fontSize="8" fill="currentColor" opacity="0.3">0</text>
              <text x="108" y="198" fontSize="8" fill="currentColor" opacity="0.3">20</text>
              <text x="216" y="198" fontSize="8" fill="currentColor" opacity="0.3">40</text>
              <text x="324" y="198" fontSize="8" fill="currentColor" opacity="0.3">60</text>
              <text x="432" y="198" fontSize="8" fill="currentColor" opacity="0.3">80</text>
              <text x="541" y="198" fontSize="8" fill="currentColor" opacity="0.3">100</text>
              <text x="590" y="198" fontSize="8" fill="currentColor" opacity="0.3">111</text>

              {/* X-axis label */}
              <text x="280" y="198" fontSize="8" fill="currentColor" opacity="0.25" textAnchor="middle">Step</text>

              {/* Gradient defs */}
              <defs>
                <linearGradient id="trailLine" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#14b8a6" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
                <linearGradient id="trailFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            {/* Demo overlay badge */}
            <div className="absolute right-3 top-2">
              <span className="rounded-full bg-yellow-500/15 px-2.5 py-1 text-[10px] font-semibold text-yellow-600 dark:text-yellow-400">
                Demo — n=27
              </span>
            </div>
          </div>

          {/* Demo notice */}
          <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Demo visualization showing the actual log-scale trajectory for n=27 (111 steps, peak
            9,232). Real engine data begins in Phase 3.
          </p>

          {/* Options row */}
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:flex-wrap sm:items-center">
            {["Animate latest", "Show records", "Highlight near-escape"].map((opt) => (
              <label key={opt} className="flex cursor-not-allowed items-center gap-2 opacity-40">
                <input type="checkbox" defaultChecked className="h-3.5 w-3.5 rounded" readOnly />
                <span className="text-xs text-slate-500 dark:text-slate-400">{opt}</span>
              </label>
            ))}
            <span className="text-[10px] text-slate-400 dark:text-slate-500 sm:ml-auto">
              Interactive controls arrive in Phase 3
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
