"use client";

import { useMemo } from "react";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { formatLargeNumber, formatLargeNumberTitle } from "@/lib/collatz/format";
import { EVENT_COLORS } from "@/lib/collatz/event-visuals";
import type { AnalyticsChartRow, AnalyticsRecordRow } from "@/hooks/useCollatzAnalyticsData";

// ─── Constants ────────────────────────────────────────────────────────────────

const SVG_W = 600;
const SVG_H = 200;
const Y_BOTTOM = 185;
const Y_RANGE = 158;
const PAD_L = 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function yLinear(steps: number, maxSteps: number): number {
  return Y_BOTTOM - (steps / Math.max(maxSteps, 1)) * Y_RANGE;
}

function xScale(n: number, minN: number, rangeN: number): number {
  if (rangeN <= 0) return PAD_L;
  return PAD_L + ((n - minN) / rangeN) * (SVG_W - PAD_L * 2);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  results: AnalyticsChartRow[];
  topBySteps: AnalyticsRecordRow[];
  loading?: boolean;
}

export function StoppingTimeGraph({ results, topBySteps, loading }: Props) {
  const isEmpty = results.length < 2;

  const { points, minN, maxN, maxSteps } = useMemo(() => {
    if (results.length < 2) {
      return { points: "", minN: 0, maxN: 0, maxSteps: 0 };
    }
    const minN = results[0].n;
    const maxN = results[results.length - 1].n;
    const rangeN = maxN - minN;
    const maxSteps = Math.max(...results.map((r) => r.steps), 1);

    const pts = results
      .map((r) => {
        const x = xScale(r.n, minN, rangeN);
        const y = yLinear(r.steps, maxSteps);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return { points: pts, minN, maxN, maxSteps };
  }, [results]);

  const topRecord = topBySteps[0] ?? null;

  const chips = [
    {
      label: "Longest Trajectory",
      value: topRecord ? topRecord.steps.toLocaleString("en-US") + " steps" : "Pending",
      title: "",
    },
    {
      label: "Produced by n =",
      value: topRecord ? topRecord.n.toLocaleString("en-US") : "Pending",
      title: "",
    },
    {
      label: "Peak for record n",
      value: topRecord ? formatLargeNumber(topRecord.peak) : "Pending",
      title: topRecord ? formatLargeNumberTitle(topRecord.peak) : "",
    },
    {
      label: "Numbers charted",
      value: results.length.toLocaleString("en-US"),
      title: "",
    },
  ];

  // Grid lines (linear, 4 ticks)
  const gridLines = useMemo(() => {
    if (maxSteps <= 0) return [];
    return [0.25, 0.5, 0.75].map((frac) => {
      const v = Math.round(maxSteps * frac);
      const y = yLinear(v, maxSteps);
      return { v, y, label: v.toLocaleString("en-US") };
    });
  }, [maxSteps]);

  // Top 5 record highlight positions
  const recordDots = useMemo(() => {
    if (results.length < 2 || topBySteps.length === 0) return [];
    const minN = results[0].n;
    const maxN = results[results.length - 1].n;
    const rangeN = maxN - minN;

    return topBySteps.slice(0, 5).map((r) => ({
      x: xScale(r.n, minN, rangeN),
      y: yLinear(r.steps, maxSteps),
      steps: r.steps,
      n: r.n,
      peak: r.peak,
    }));
  }, [results, topBySteps, maxSteps]);

  return (
    <section className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="section-heading">Stopping Time Graph</p>
                <PanelHelp
                  title="Stopping Time Graph"
                  description="Tracks how many steps each tested number takes to reach 1. Taller points represent numbers with longer trajectories through the Collatz process."
                  align="left"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">
                Tracks how many steps each number takes to reach 1.
              </p>
            </div>
            {loading && (
              <span className="self-start rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                Updating...
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
                Records will appear as the engine advances and results are persisted.
              </p>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
              <svg
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                width="100%"
                height="auto"
                className="block"
                aria-label={`Stopping time graph, ${results.length} numbers charted, longest trajectory ${topRecord?.steps.toLocaleString("en-US") ?? "pending"} steps`}
              >
                {/* Grid lines */}
                {gridLines.map(({ v, y, label }) => (
                  <g key={v}>
                    <line
                      x1="0"
                      y1={y}
                      x2={SVG_W}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity="0.07"
                      strokeWidth="1"
                    />
                    <text x="4" y={y + 4} fontSize="7.5" fill="currentColor" opacity="0.4">
                      {label}
                    </text>
                  </g>
                ))}
                <text x="4" y="11" fontSize="7" fill="currentColor" opacity="0.35">
                  Steps to 1
                </text>

                {/* Area fill */}
                <polyline
                  points={`${PAD_L},${Y_BOTTOM} ${points} ${SVG_W - PAD_L},${Y_BOTTOM}`}
                  fill="url(#stFill)"
                  stroke="none"
                />

                {/* Main line */}
                <polyline
                  points={points}
                  fill="none"
                  stroke="url(#stLine)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* Record highlight dots */}
                {recordDots.map((d, i) => (
                  <g key={i}>
                    <circle
                      cx={d.x}
                      cy={d.y}
                      r={i === 0 ? 4.5 : 3}
                      fill={i === 0 ? EVENT_COLORS.violet.svg : "#a78bfa"}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      opacity="0.9"
                    >
                      <title>
                        n={d.n.toLocaleString("en-US")} · {d.steps.toLocaleString("en-US")} steps · peak={formatLargeNumberTitle(d.peak)}
                      </title>
                    </circle>
                  </g>
                ))}

                {/* x-axis labels */}
                {[minN, Math.round((minN + maxN) / 2), maxN].map((n, i) => (
                  <text
                    key={i}
                    x={xScale(n, minN, maxN - minN)}
                    y={SVG_H - 2}
                    fontSize="8"
                    fill="currentColor"
                    opacity="0.35"
                    textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
                  >
                    {n.toLocaleString("en-US")}
                  </text>
                ))}

                <defs>
                  <linearGradient id="stLine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="60%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor={EVENT_COLORS.violet.svg} />
                  </linearGradient>
                  <linearGradient id="stFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.14" />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            {[
              { color: "bg-teal-400", label: "Steps to 1 per starting number" },
              { color: EVENT_COLORS.violet.dot, label: "Longest trajectory records" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-sm ${item.color}`} />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {item.label}
                </span>
              </div>
            ))}
            <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">
              n = {minN.toLocaleString("en-US")} to {maxN.toLocaleString("en-US")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
