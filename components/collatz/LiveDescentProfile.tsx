"use client";

import { useMemo } from "react";
import { PanelHelp } from "@/components/ui/PanelHelp";
import {
  formatLargeNumber,
  formatLargeNumberTitle,
  formatSteps,
} from "@/lib/collatz/format";
import type { CollatzResult } from "@/lib/collatz/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const SVG_W = 600;
const SVG_H = 200;
const Y_BOTTOM = 185;
const Y_RANGE = 158;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function yLinear(val: bigint | number, peak: number): number {
  const n = typeof val === "bigint" ? Number(val) : val;
  return Y_BOTTOM - (n / Math.max(peak, 1)) * Y_RANGE;
}

function seqToPoints(seq: bigint[], peakN: number): string {
  const len = seq.length;
  return seq
    .map((val, i) => {
      const x = (i / Math.max(len - 1, 1)) * SVG_W;
      const y = yLinear(val, peakN);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  result: CollatzResult;
  loading?: boolean;
}

export function LiveDescentProfile({ result, loading }: Props) {
  const seq = result.full_sequence;
  const start = result.start_number;
  const peak = result.peak_value;
  const firstDescentStep = result.first_descent_step;
  const peakN = Number(peak);
  const startN = Number(start);

  const isEmpty = seq.length < 2 || start === 0n;

  const points = useMemo(() => seqToPoints(seq, peakN), [seq, peakN]);

  const peakIdx = useMemo(
    () => seq.findIndex((v) => v === peak),
    [seq, peak],
  );

  const peakX = (Math.max(peakIdx, 0) / Math.max(seq.length - 1, 1)) * SVG_W;
  const peakY = yLinear(peak, peakN);
  const startY = yLinear(start, peakN);

  const descentX =
    firstDescentStep !== null && firstDescentStep >= 0 && firstDescentStep < seq.length
      ? (firstDescentStep / Math.max(seq.length - 1, 1)) * SVG_W
      : null;
  const descentY =
    firstDescentStep !== null && firstDescentStep >= 0 && seq[firstDescentStep] !== undefined
      ? yLinear(seq[firstDescentStep], peakN)
      : null;

  const peakRatio =
    startN > 0 ? (peakN / startN).toFixed(2) : "—";

  const chips = [
    { label: "Start", value: formatLargeNumber(start), title: formatLargeNumberTitle(start) },
    { label: "Peak", value: formatLargeNumber(peak), title: formatLargeNumberTitle(peak) },
    {
      label: "First descent",
      value: firstDescentStep !== null ? `Step ${firstDescentStep.toLocaleString("en-US")}` : "—",
      title: "",
    },
    { label: "Total steps", value: formatSteps(result.steps_to_1), title: "" },
    { label: "Peak / Start", value: `${peakRatio}×`, title: "" },
  ];

  return (
    <section className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="section-heading">Live Descent Profile</p>
                <PanelHelp
                  title="Live Descent Profile"
                  description="Tracks when the active trajectory first falls below its starting value. This helps show how long a number resists descent before it begins moving back toward convergence."
                  align="left"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">
                Tracks when the active trajectory first falls below its origin.
              </p>
            </div>
            {loading && (
              <span className="self-start rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                Updating…
              </span>
            )}
          </div>

          {/* Metric chips */}
          <div className="mb-4 flex flex-wrap gap-2">
            {chips.map((c) => (
              <div
                key={c.label}
                className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800/60"
                title={c.title || undefined}
              >
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {c.label}
                </p>
                <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                  {c.value}
                </p>
              </div>
            ))}
          </div>

          {/* Chart */}
          {isEmpty ? (
            <div className="placeholder-panel">
              <p className="text-center text-sm text-slate-400 dark:text-slate-500">
                Live descent data will appear once the next trajectory is analyzed.
              </p>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
              <svg
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                width="100%"
                height="auto"
                className="block"
                aria-label={`Live descent profile for n=${formatLargeNumberTitle(start)}, ${result.steps_to_1} steps`}
              >
                {/* Grid line at start value */}
                <line
                  x1="0"
                  y1={startY}
                  x2={SVG_W}
                  y2={startY}
                  stroke="#14b8a6"
                  strokeOpacity="0.35"
                  strokeWidth="1"
                  strokeDasharray="5 3"
                />
                <text x="4" y={startY - 3} fontSize="7.5" fill="#14b8a6" opacity="0.75">
                  Start: {formatLargeNumber(start)}
                  <title>{formatLargeNumberTitle(start)}</title>
                </text>

                {/* Area fill */}
                <polyline
                  points={`0,${Y_BOTTOM} ${points} ${SVG_W},${Y_BOTTOM}`}
                  fill="url(#descentFill)"
                  stroke="none"
                />

                {/* Trajectory line */}
                <polyline
                  points={points}
                  fill="none"
                  stroke="url(#descentLine)"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* Peak marker */}
                {peakIdx >= 0 && (
                  <>
                    <line
                      x1={peakX}
                      y1={peakY + 5}
                      x2={peakX}
                      y2={Y_BOTTOM}
                      stroke="#facc15"
                      strokeOpacity="0.15"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <circle
                      cx={peakX}
                      cy={peakY}
                      r="4"
                      fill="#facc15"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      opacity="0.9"
                    />
                    <rect
                      x={peakX + 6}
                      y={peakY - 3}
                      width="62"
                      height="14"
                      rx="3"
                      fill="#facc15"
                      fillOpacity="0.15"
                    />
                    <text x={peakX + 9} y={peakY + 7} fontSize="8.5" fill="#ca8a04" fontWeight="600">
                      Peak: {formatLargeNumber(peak)}
                      <title>{formatLargeNumberTitle(peak)}</title>
                    </text>
                  </>
                )}

                {/* First descent marker */}
                {descentX !== null && descentY !== null && (
                  <>
                    <circle
                      cx={descentX}
                      cy={descentY}
                      r="4"
                      fill="#fb923c"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      opacity="0.9"
                    />
                    <text
                      x={descentX + 6}
                      y={descentY - 4}
                      fontSize="7.5"
                      fill="#f97316"
                      fontWeight="600"
                    >
                      First descent
                    </text>
                  </>
                )}

                {/* Start dot */}
                <circle cx="0" cy={startY} r="3" fill="#14b8a6" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />

                {/* Convergence dot */}
                <circle cx={SVG_W} cy={Y_BOTTOM} r="3" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
                <text x={SVG_W - 2} y={Y_BOTTOM - 5} fontSize="7.5" fill="#22c55e" textAnchor="end">
                  Converged
                </text>

                {/* Step axis labels */}
                {[0, result.steps_to_1].map((s) => (
                  <text
                    key={s}
                    x={(s / Math.max(result.steps_to_1, 1)) * SVG_W}
                    y={SVG_H - 2}
                    fontSize="8"
                    fill="currentColor"
                    opacity="0.35"
                  >
                    {s}
                  </text>
                ))}
                <text
                  x={SVG_W / 2}
                  y={SVG_H - 2}
                  fontSize="8"
                  fill="currentColor"
                  opacity="0.3"
                  textAnchor="middle"
                >
                  Step
                </text>

                <defs>
                  <linearGradient id="descentLine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="50%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                  <linearGradient id="descentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            {[
              { color: "bg-teal-400", label: "Start value reference" },
              { color: "bg-yellow-400", label: "Peak value" },
              { color: "bg-orange-400", label: "First descent below start" },
              { color: "bg-green-400", label: "Convergence to 1" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-sm ${item.color}`} />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
