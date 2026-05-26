"use client";

import { useEffect, useMemo, useState } from "react";
import { getSeedResult } from "@/lib/collatz/examples";
import { computeCollatz } from "@/lib/collatz/engine";
import { getTopLongestTrajectories } from "@/lib/collatz/store";
import { formatBigInt, formatSteps } from "@/lib/collatz/format";
import type { CollatzResult } from "@/lib/collatz/types";

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

// Stable fallback — computed once at module load, never re-computed
const FALLBACK: CollatzResult = getSeedResult(27);

function sequenceToPoints(sequence: bigint[], peakValue: bigint): string {
  const n = sequence.length;
  const logPeak = Math.max(Math.log10(Number(peakValue)), 1);
  return sequence
    .map((val, step) => {
      const x = (step / Math.max(n - 1, 1)) * SVG_WIDTH;
      const logVal = val <= 1n ? 0 : Math.log10(Number(val));
      const y = Y_BOTTOM - (logVal / logPeak) * Y_RANGE;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function valueToY(val: number, logPeak: number): number {
  if (val <= 1) return Y_BOTTOM;
  const lp = Math.max(logPeak, 1);
  return Y_BOTTOM - (Math.log10(val) / lp) * Y_RANGE;
}

export function TrajectoryVisualizer() {
  const [result, setResult] = useState<CollatzResult>(FALLBACK);
  const [isLive, setIsLive] = useState(false);
  const [activeView, setActiveView] = useState("Trajectory");

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const rows = await getTopLongestTrajectories(1);
      if (!isMounted || !rows || rows.length === 0) return;
      const computed = computeCollatz(rows[0].n);
      if (isMounted && computed.reached_one && computed.full_sequence.length > 1) {
        setResult(computed);
        setIsLive(true);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  // Compute SVG values from current result
  const points = useMemo(
    () => sequenceToPoints(result.full_sequence, result.peak_value),
    [result],
  );

  const peakStep = result.full_sequence.findIndex((v) => v === result.peak_value);
  const peakX = (
    (Math.max(peakStep, 0) / Math.max(result.full_sequence.length - 1, 1)) *
    SVG_WIDTH
  ).toFixed(1);
  const logPeak = Math.max(Math.log10(Number(result.peak_value)), 1);
  const gridLines = [10, 100, 1000].map((v) => ({
    v,
    y: valueToY(v, logPeak).toFixed(1),
    label: v >= 1000 ? `${v / 1000}K` : String(v),
  }));
  const startY = valueToY(Number(result.start_number), logPeak).toFixed(1);
  const nLabel = Number(result.start_number);
  const badge = isLive ? `Live catalog — n=${nLabel.toLocaleString("en-US")}` : "Worked example — n=27";

  return (
    <section id="visualizer" className="scroll-mt-20 px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="section-heading">Collatz Trajectory Visualizer</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                n={formatSteps(nLabel)} · {formatSteps(result.steps_to_1)} steps ·
                peak {formatBigInt(result.peak_value)} · log scale — computed by the Collatz engine
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
              aria-label={`Collatz trajectory for n=${nLabel}, log scale, ${result.steps_to_1} steps`}
            >
              {/* Grid lines */}
              {gridLines.map(({ y, v }) => (
                <line
                  key={v}
                  x1="0" y1={y} x2={SVG_WIDTH} y2={y}
                  stroke="currentColor" strokeOpacity="0.07" strokeWidth="1"
                />
              ))}

              {/* Y-axis labels */}
              {gridLines.map(({ y, label }) => (
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

              {/* Y-axis title */}
              <text
                x="4"
                y="12"
                fontSize="7"
                fill="currentColor"
                opacity="0.25"
              >
                Value (log)
              </text>

              {/* Area fill */}
              <polyline
                points={`0,${Y_BOTTOM} ${points} ${SVG_WIDTH},${Y_BOTTOM}`}
                fill="url(#trailFill)"
                stroke="none"
              />

              {/* Main trajectory line */}
              <polyline
                points={points}
                fill="none"
                stroke="url(#trailLine)"
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Peak marker */}
              <circle cx={peakX} cy={Y_BOTTOM - Y_RANGE} r="4" fill="#facc15" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
              <line
                x1={peakX} y1={Y_BOTTOM - Y_RANGE + 5} x2={peakX} y2={Y_BOTTOM}
                stroke="#facc15" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="3 3"
              />

              {/* Peak label */}
              <rect x={Number(peakX) + 6} y={Y_BOTTOM - Y_RANGE - 3} width="62" height="14" rx="3" fill="#facc15" fillOpacity="0.15" />
              <text x={Number(peakX) + 9} y={Y_BOTTOM - Y_RANGE + 7} fontSize="8.5" fill="#ca8a04" fontWeight="600">
                Peak: {formatBigInt(result.peak_value)}
              </text>

              {/* Start marker */}
              <circle cx="0" cy={startY} r="3" fill="#14b8a6" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
              <text x="4" y={String(Number(startY) - 4)} fontSize="8" fill="#14b8a6" fontWeight="600">
                n={nLabel}
              </text>

              {/* End marker */}
              <circle cx={SVG_WIDTH} cy={Y_BOTTOM} r="3" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />

              {/* X-axis step labels */}
              {[0, 20, 40, 60, 80, 100, result.steps_to_1]
                .filter((s, i, arr) => s <= result.steps_to_1 && arr.indexOf(s) === i)
                .map((s) => {
                  const x = ((s / result.steps_to_1) * SVG_WIDTH).toFixed(0);
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

            {/* Badge */}
            <div className="absolute right-3 top-2">
              <span className="rounded-full bg-teal-500/15 px-2.5 py-1 text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                {badge}
              </span>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
            {isLive
              ? `Computed from live catalog — n=${nLabel.toLocaleString("en-US")}, ${result.steps_to_1} steps, peak ${formatBigInt(result.peak_value)}.`
              : `Worked example — n=27, ${FALLBACK.steps_to_1} steps, peak ${formatBigInt(FALLBACK.peak_value)}. Updates automatically as the catalog grows.`}
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
          </div>
        </div>
      </div>
    </section>
  );
}
