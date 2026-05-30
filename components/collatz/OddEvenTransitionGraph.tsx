"use client";

import { useMemo } from "react";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { formatSteps } from "@/lib/collatz/format";
import type { CollatzResult } from "@/lib/collatz/types";
import type { DisplayMode } from "@/components/home/CollatzVisualizationProvider";

// ─── Constants ────────────────────────────────────────────────────────────────
//
// Layout (top → bottom):
//   [PARITY_LABEL_H]  dedicated row for "Parity sequence…" label
//   [STRIP_H]         parity-strip colored rects
//   [STRIP_GAP]       breathing room
//   [CHART_LABEL_H]   dedicated row for "Cumulative count" label
//   [CHART_H]         cumulative chart data area
//   [AXIS_H]          step-axis tick labels
//
const SVG_W = 600;
const PARITY_LABEL_H = 11;   // label row above the parity strip
const STRIP_H = 20;           // height of colored parity rects
const STRIP_GAP = 8;          // gap between strip bottom and chart label row
const CHART_LABEL_H = 11;     // label row above the cumulative chart
const CHART_H = 140;
const AXIS_H = 18;

const STRIP_Y = PARITY_LABEL_H;                                         // 11  — top of parity rects
const CHART_TOP = PARITY_LABEL_H + STRIP_H + STRIP_GAP + CHART_LABEL_H; // 50  — top of chart data area
const Y_CHART_BOTTOM = CHART_TOP + CHART_H;                             // 190
const SVG_H = Y_CHART_BOTTOM + AXIS_H;                                  // 208
const MAX_STRIP = SVG_W;
const MAX_CHART_POINTS = 250;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function yCumulative(count: number, maxCount: number): number {
  return Y_CHART_BOTTOM - (count / Math.max(maxCount, 1)) * CHART_H;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  result: CollatzResult;
  mode: DisplayMode;
  displayLabel: string;
  isEstimated?: boolean;
  loading?: boolean;
}

export function OddEvenTransitionGraph({
  result,
  mode,
  displayLabel,
  isEstimated = false,
  loading,
}: Props) {
  const seq = result.full_sequence;
  const isEmpty = seq.length < 2 || result.start_number === 0n;

  // Compute parity strip rects and cumulative chart points
  const { stripRects, oddLine, evenLine, maxCount, longestOddRun, longestEvenRun } =
    useMemo(() => {
      if (seq.length < 2) {
        return { stripRects: [], oddLine: "", evenLine: "", maxCount: 0, longestOddRun: 0, longestEvenRun: 0 };
      }

      // ── Parity strip ──────────────────────────────────────────────────────
      const stripCount = Math.min(seq.length, MAX_STRIP);
      const stripStride = seq.length / stripCount;
      const rectW = SVG_W / stripCount;

      const rects: { x: number; w: number; isOdd: boolean }[] = [];
      for (let i = 0; i < stripCount; i++) {
        const idx = Math.floor(i * stripStride);
        rects.push({ x: i * rectW, w: rectW + 0.5, isOdd: seq[idx] % 2n !== 0n });
      }

      // ── Cumulative chart + run tracking ──────────────────────────────────
      const chartCount = Math.min(seq.length, MAX_CHART_POINTS);
      const chartStride = seq.length / chartCount;

      // Build exact running sums at sampled steps
      let runOdd = 0;
      let runEven = 0;
      let longestOdd = 0;
      let longestEven = 0;
      let curOddRun = 0;
      let curEvenRun = 0;

      // Running sums at each step (iterate full sequence — typically 100-1000 steps)
      const runningOdd: number[] = new Array(seq.length);
      const runningEven: number[] = new Array(seq.length);
      for (let i = 0; i < seq.length; i++) {
        const isOdd = seq[i] % 2n !== 0n;
        if (isOdd) {
          runOdd++;
          curOddRun++;
          curEvenRun = 0;
          if (curOddRun > longestOdd) longestOdd = curOddRun;
        } else {
          runEven++;
          curEvenRun++;
          curOddRun = 0;
          if (curEvenRun > longestEven) longestEven = curEvenRun;
        }
        runningOdd[i] = runOdd;
        runningEven[i] = runEven;
      }

      const maxCount = Math.max(runOdd, runEven, 1);

      // Sample for chart lines
      const oddPts: string[] = [];
      const evenPts: string[] = [];
      for (let i = 0; i < chartCount; i++) {
        const idx = Math.min(Math.floor(i * chartStride), seq.length - 1);
        const x = (i / Math.max(chartCount - 1, 1)) * SVG_W;
        oddPts.push(`${x.toFixed(1)},${yCumulative(runningOdd[idx], maxCount).toFixed(1)}`);
        evenPts.push(`${x.toFixed(1)},${yCumulative(runningEven[idx], maxCount).toFixed(1)}`);
      }

      return {
        stripRects: rects,
        oddLine: oddPts.join(" "),
        evenLine: evenPts.join(" "),
        maxCount,
        longestOddRun: longestOdd,
        longestEvenRun: longestEven,
      };
    }, [seq]);

  const ratio =
    result.even_steps > 0
      ? (result.odd_steps / result.even_steps).toFixed(2)
      : "Pending";

  const chips = [
    { label: "Odd transitions", value: result.odd_steps.toLocaleString("en-US"), cls: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
    { label: "Even transitions", value: result.even_steps.toLocaleString("en-US"), cls: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
    { label: "Odd / Even ratio", value: `${ratio}`, cls: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300" },
    { label: "Longest odd run", value: longestOddRun > 0 ? longestOddRun.toString() : "Pending", cls: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
    { label: "Longest even run", value: longestEvenRun > 0 ? longestEvenRun.toString() : "Pending", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  ];
  const title = mode === "estimated_live"
    ? "Estimated Live Odd/Even Transition Graph"
    : mode === "latest_verified"
      ? "Latest Verified Odd/Even Transition Graph"
      : "Record Odd/Even Transition Graph";
  const subtitle = mode === "estimated_live"
    ? "Generated locally from the estimated engine position."
    : "Generated locally from the selected backend-verified starting number.";

  // Chart axis ticks
  const chartGridLines = useMemo(() => {
    if (maxCount <= 0) return [];
    return [0.25, 0.5, 0.75].map((frac) => {
      const v = Math.round(maxCount * frac);
      return { v, y: yCumulative(v, maxCount) };
    });
  }, [maxCount]);

  return (
    <section className="live-stable scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-5 flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <p className="section-heading">{title}</p>
                {isEstimated && (
                  <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 font-mono text-[10px] font-semibold text-cyan-600 dark:text-cyan-400">
                    {displayLabel}
                  </span>
                )}
                <PanelHelp
                  title="Odd/Even Transition Graph"
                  description="Shows the rhythm between odd and even steps. Odd values expand through 3n + 1, while even values contract through division by 2."
                  align="left"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">
                {subtitle}
              </p>
            </div>
            <span className={`rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500 sm:self-start ${loading ? "" : "invisible"}`}>
              Updating...
            </span>
          </div>

          {/* Metric chips */}
          <div className="mb-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            {chips.map((c) => (
              <div key={c.label} className={`rounded-xl px-3 py-2 text-center sm:text-left ${c.cls}`}>
                <p className="text-[9px] font-semibold uppercase tracking-wider opacity-70">
                  {c.label}
                </p>
                <p className="mt-0.5 font-mono text-sm font-bold">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          {isEmpty ? (
            <div className="placeholder-panel">
              <p className="text-center text-sm text-slate-400 dark:text-slate-500">
                Transition data will appear once the next trajectory is analyzed.
              </p>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
              <svg
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                width="100%"
                height="auto"
                className="block"
                aria-label={`Odd/even transition graph for n=${result.start_number.toString()}, ${formatSteps(result.steps_to_1)} steps, ${result.odd_steps} odd, ${result.even_steps} even`}
              >
                {/* ── Parity strip ─────────────────────────────────────────── */}
                {/* Label sits in its own row (y 0→PARITY_LABEL_H) above the rects */}
                <text x="4" y={PARITY_LABEL_H - 3} fontSize="7" fill="currentColor" opacity="0.65">
                  Parity sequence (odd = violet, even = cyan)
                </text>
                {/* Rects start at STRIP_Y, safely below the label row */}
                {stripRects.map((r, i) => (
                  <rect
                    key={i}
                    x={r.x}
                    y={STRIP_Y}
                    width={r.w}
                    height={STRIP_H}
                    fill={r.isOdd ? "#a855f7" : "#0ea5e9"}
                    opacity="0.75"
                  />
                ))}

                {/* Divider — sits in the gap between strip and chart-label row */}
                <line
                  x1="0"
                  y1={STRIP_Y + STRIP_H + 3}
                  x2={SVG_W}
                  y2={STRIP_Y + STRIP_H + 3}
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeWidth="1"
                />

                {/* ── Cumulative chart ──────────────────────────────────────── */}
                {/* Label sits in its own row (CHART_TOP - CHART_LABEL_H → CHART_TOP) above the chart data */}
                <text x="4" y={CHART_TOP - 3} fontSize="7" fill="currentColor" opacity="0.65">
                  Cumulative count
                </text>

                {/* Grid lines */}
                {chartGridLines.map(({ v, y }) => (
                  <line
                    key={v}
                    x1="0"
                    y1={y}
                    x2={SVG_W}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity="0.07"
                    strokeWidth="1"
                  />
                ))}

                {/* Even area */}
                <polyline
                  points={`0,${Y_CHART_BOTTOM} ${evenLine} ${SVG_W},${Y_CHART_BOTTOM}`}
                  fill="#0ea5e9"
                  fillOpacity="0.08"
                  stroke="none"
                />

                {/* Odd area */}
                <polyline
                  points={`0,${Y_CHART_BOTTOM} ${oddLine} ${SVG_W},${Y_CHART_BOTTOM}`}
                  fill="#a855f7"
                  fillOpacity="0.08"
                  stroke="none"
                />

                {/* Even line */}
                <polyline
                  points={evenLine}
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity="0.85"
                />

                {/* Odd line */}
                <polyline
                  points={oddLine}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity="0.85"
                />

                {/* Step axis */}
                <text
                  x="4"
                  y={SVG_H - 3}
                  fontSize="8"
                  fill="currentColor"
                  opacity="0.65"
                >
                  0
                </text>
                <text
                  x={SVG_W - 4}
                  y={SVG_H - 3}
                  fontSize="8"
                  fill="currentColor"
                  opacity="0.65"
                  textAnchor="end"
                >
                  {result.steps_to_1.toLocaleString("en-US")}
                </text>
                <text
                  x={SVG_W / 2}
                  y={SVG_H - 3}
                  fontSize="8"
                  fill="currentColor"
                  opacity="0.55"
                  textAnchor="middle"
                >
                  Step
                </text>
              </svg>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-slate-200 pt-4 text-center dark:border-slate-800 sm:justify-start sm:text-left">
            {[
              { color: "bg-violet-500", label: "Odd steps (3n + 1)" },
              { color: "bg-sky-500", label: "Even steps (n / 2)" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-center gap-2 sm:justify-start">
                <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-sm ${item.color}`} />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {item.label}
                </span>
              </div>
            ))}
            <span className="w-full text-[10px] text-slate-400 dark:text-slate-500 sm:ml-auto sm:w-auto">
              Top strip: parity sequence · Bottom: cumulative count
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
