"use client";

import { useState } from "react";
import { getSeedResult } from "@/lib/collatz/examples";
import { formatBigInt, formatSteps } from "@/lib/collatz/format";

const viewModes = ["Trajectory", "Tree View", "Sequence", "Odd-Only (3n+1)"];

const legendItems = [
  { color: "bg-violet-500", label: "Odd steps (3n+1)" },
  { color: "bg-sky-500", label: "Even steps (n/2)" },
  { color: "bg-yellow-400", label: "Peaks" },
  { color: "bg-orange-400", label: "First descent" },
];

const SVG_WIDTH = 600;
const SVG_HEIGHT = 200;
const Y_BOTTOM = 185;
const Y_RANGE = 160;

function sequenceToPoints(sequence: bigint[], peakValue: bigint): string {
  const n = sequence.length;
  const logPeak = Math.log10(Number(peakValue));
  return sequence
    .map((val, step) => {
      const x = (step / (n - 1)) * SVG_WIDTH;
      const logVal = val <= 1n ? 0 : Math.log10(Number(val));
      const y = Y_BOTTOM - (logVal / logPeak) * Y_RANGE;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function valueToY(val: number, logPeak: number): number {
  if (val <= 1) return Y_BOTTOM;
  return Y_BOTTOM - (Math.log10(val) / logPeak) * Y_RANGE;
}

// Pre-compute from engine (runs once at module load)
const demo = getSeedResult(27);
const POINTS = sequenceToPoints(demo.full_sequence, demo.peak_value);
const PEAK_STEP = demo.full_sequence.findIndex((v) => v === demo.peak_value);
const PEAK_X = ((PEAK_STEP / (demo.full_sequence.length - 1)) * SVG_WIDTH).toFixed(1);
const LOG_PEAK = Math.log10(Number(demo.peak_value));
const GRID_LINES = [10, 100, 1000].map((v) => ({
  v,
  y: valueToY(v, LOG_PEAK).toFixed(1),
  label: v >= 1000 ? `${v / 1000}K` : String(v),
}));

export function TrajectoryVisualizer() {
  const [activeView, setActiveView] = useState("Trajectory");

  const startX = "0";
  const startY = valueToY(Number(demo.start_number), LOG_PEAK).toFixed(1);

  return (
    <section id="visualizer" className="scroll-mt-20 px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="section-heading">Collatz Trajectory Visualizer</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                n={formatSteps(Number(demo.start_number))} · {formatSteps(demo.steps_to_1)} steps ·
                peak {formatBigInt(demo.peak_value)} · log scale — computed by the Collatz engine
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
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              width="100%"
              height="auto"
              className="block"
              aria-label={`Collatz trajectory for n=${Number(demo.start_number)}, log scale, ${demo.steps_to_1} steps`}
            >
              {/* Grid lines */}
              {GRID_LINES.map(({ y, v }) => (
                <line
                  key={v}
                  x1="0" y1={y} x2={SVG_WIDTH} y2={y}
                  stroke="currentColor" strokeOpacity="0.07" strokeWidth="1"
                />
              ))}

              {/* Y-axis labels */}
              {GRID_LINES.map(({ y, label }) => (
                <text
                  key={label}
                  x="4"
                  y={String(Number(y) + 4)}
                  fontSize="8"
                  fill="currentColor"
                  opacity="0.3"
                >
                  {label}
                </text>
              ))}

              {/* Area fill */}
              <polyline
                points={`0,${Y_BOTTOM} ${POINTS} ${SVG_WIDTH},${Y_BOTTOM}`}
                fill="url(#trailFill)"
                stroke="none"
              />

              {/* Main trajectory line */}
              <polyline
                points={POINTS}
                fill="none"
                stroke="url(#trailLine)"
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Peak marker */}
              <circle cx={PEAK_X} cy={Y_BOTTOM - Y_RANGE} r="4" fill="#facc15" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
              <line
                x1={PEAK_X} y1={Y_BOTTOM - Y_RANGE + 5} x2={PEAK_X} y2={Y_BOTTOM}
                stroke="#facc15" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="3 3"
              />

              {/* Peak label */}
              <rect x={Number(PEAK_X) + 6} y={Y_BOTTOM - Y_RANGE - 3} width="62" height="14" rx="3" fill="#facc15" fillOpacity="0.15" />
              <text x={Number(PEAK_X) + 9} y={Y_BOTTOM - Y_RANGE + 7} fontSize="8.5" fill="#ca8a04" fontWeight="600">
                Peak: {formatBigInt(demo.peak_value)}
              </text>

              {/* Start marker */}
              <circle cx={startX} cy={startY} r="3" fill="#14b8a6" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
              <text x="4" y={String(Number(startY) - 4)} fontSize="8" fill="#14b8a6" fontWeight="600">
                n={Number(demo.start_number)}
              </text>

              {/* End marker */}
              <circle cx={SVG_WIDTH} cy={Y_BOTTOM} r="3" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />

              {/* X-axis step labels */}
              {[0, 20, 40, 60, 80, 100, demo.steps_to_1].map((s) => {
                const x = ((s / demo.steps_to_1) * SVG_WIDTH).toFixed(0);
                return (
                  <text key={s} x={x} y={SVG_HEIGHT - 2} fontSize="8" fill="currentColor" opacity="0.3">
                    {s}
                  </text>
                );
              })}

              {/* X-axis label */}
              <text x={SVG_WIDTH / 2} y={SVG_HEIGHT - 2} fontSize="8" fill="currentColor" opacity="0.25" textAnchor="middle">
                Step
              </text>

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
              <span className="rounded-full bg-teal-500/15 px-2.5 py-1 text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                Engine — n=27
              </span>
            </div>
          </div>

          {/* Demo notice */}
          <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Demo visualization. Trajectory computed by the Collatz engine from real data (n=27,{" "}
            {demo.steps_to_1} steps, peak {formatBigInt(demo.peak_value)}). Real autonomous
            cataloging begins in Phase 4.
          </p>

          {/* Options row */}
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:flex-wrap sm:items-center">
            {["Odd steps", "Even steps", "Peaks", "First descent", "Log scale"].map((opt) => (
              <label key={opt} className={`flex cursor-not-allowed items-center gap-2 ${opt === "Log scale" ? "" : "opacity-40"}`}>
                <input
                  type="checkbox"
                  defaultChecked={opt === "Log scale"}
                  className="h-3.5 w-3.5 rounded"
                  readOnly
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">{opt}</span>
              </label>
            ))}
            <span className="text-[10px] text-slate-400 dark:text-slate-500 sm:ml-auto">
              Interactive controls arrive in Phase 4
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
