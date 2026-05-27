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

function yLog(peak: number, logMaxPeak: number): number {
  if (peak <= 1) return Y_BOTTOM;
  return (
    Y_BOTTOM -
    (Math.log10(Math.max(peak, 1)) / Math.max(logMaxPeak, 1)) * Y_RANGE
  );
}

function xScale(n: number, minN: number, rangeN: number): number {
  if (rangeN <= 0) return PAD_L;
  return PAD_L + ((n - minN) / rangeN) * (SVG_W - PAD_L * 2);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  results: AnalyticsChartRow[];
  topByPeak: AnalyticsRecordRow[];
  loading?: boolean;
}

export function PeakGrowthGraph({ results, topByPeak, loading }: Props) {
  const isEmpty = results.length < 2;

  const { points, minN, maxN, maxPeak, logMaxPeak } = useMemo(() => {
    if (results.length < 2) {
      return { points: "", minN: 0, maxN: 0, maxPeak: 0, logMaxPeak: 1 };
    }
    const minN = results[0].n;
    const maxN = results[results.length - 1].n;
    const rangeN = maxN - minN;
    const maxPeak = Math.max(...results.map((r) => r.peak), 1);
    const logMaxPeak = Math.log10(Math.max(maxPeak, 2));

    const pts = results
      .map((r) => {
        const x = xScale(r.n, minN, rangeN);
        const y = yLog(r.peak, logMaxPeak);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return { points: pts, minN, maxN, maxPeak, logMaxPeak };
  }, [results]);

  const topPeakRecord = topByPeak[0] ?? null;

  const chips = [
    {
      label: "Highest Peak",
      value: topPeakRecord ? formatLargeNumber(topPeakRecord.peak) : "Pending",
      title: topPeakRecord ? formatLargeNumberTitle(topPeakRecord.peak) : "",
    },
    {
      label: "Produced by n =",
      value: topPeakRecord ? topPeakRecord.n.toLocaleString("en-US") : "Pending",
      title: "",
    },
    {
      label: "Numbers charted",
      value: results.length.toLocaleString("en-US"),
      title: "",
    },
  ];

  // Top 5 record highlight positions
  const recordDots = useMemo(() => {
    if (results.length < 2 || topByPeak.length === 0) return [];
    const minN = results[0].n;
    const maxN = results[results.length - 1].n;
    const rangeN = maxN - minN;

    return topByPeak.slice(0, 5).map((r) => ({
      x: xScale(r.n, minN, rangeN),
      y: yLog(r.peak, logMaxPeak),
      peak: r.peak,
      n: r.n,
      steps: r.steps,
    }));
  }, [results, topByPeak, logMaxPeak]);

  // Axis grid lines (log scale ticks)
  const gridLines = useMemo(() => {
    if (logMaxPeak <= 0) return [];
    const ticks: { log: number; y: number; label: string }[] = [];
    for (let exp = 1; exp <= Math.ceil(logMaxPeak); exp++) {
      const val = Math.pow(10, exp);
      const y = yLog(val, logMaxPeak);
      if (y >= 10 && y <= Y_BOTTOM) {
        const label =
          exp >= 12
            ? `10^${exp}`
            : exp >= 9
              ? `${Math.pow(10, exp - 9).toFixed(0)}B`
              : exp >= 6
                ? `${Math.pow(10, exp - 6).toFixed(0)}M`
                : exp >= 3
                  ? `${Math.pow(10, exp - 3).toFixed(0)}K`
                  : String(val);
        ticks.push({ log: exp, y, label });
      }
    }
    return ticks;
  }, [logMaxPeak]);

  return (
    <section className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="section-heading">Peak Growth Graph</p>
                <PanelHelp
                  title="Peak Growth Graph"
                  description="Shows the highest value reached by each tested starting number. Some numbers climb far above their origin before eventually descending to 1."
                  align="left"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">
                Maps how high each tested integer climbs before returning to 1.
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
                aria-label={`Peak growth graph, ${results.length} numbers charted, highest peak ${formatLargeNumberTitle(maxPeak)}`}
              >
                {/* Grid lines */}
                {gridLines.map(({ log, y, label }) => (
                  <g key={log}>
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
                  Peak (log scale)
                </text>

                {/* Area fill */}
                <polyline
                  points={`${PAD_L},${Y_BOTTOM} ${points} ${SVG_W - PAD_L},${Y_BOTTOM}`}
                  fill="url(#pgFill)"
                  stroke="none"
                />

                {/* Main line */}
                <polyline
                  points={points}
                  fill="none"
                  stroke="url(#pgLine)"
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
                      fill={i === 0 ? EVENT_COLORS.amber.svg : "#fbbf24"}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      opacity="0.9"
                    >
                      <title>
                        n={d.n.toLocaleString("en-US")} · peak={formatLargeNumberTitle(d.peak)} · {d.steps.toLocaleString("en-US")} steps
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
                <text
                  x={SVG_W / 2}
                  y={SVG_H - 2}
                  fontSize="8"
                  fill="currentColor"
                  opacity="0.25"
                  textAnchor="middle"
                />

                <defs>
                  <linearGradient id="pgLine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="60%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <linearGradient id="pgFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity="0.14" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            {[
              { color: "bg-indigo-400", label: "Peak value per starting number (log scale)" },
              { color: EVENT_COLORS.amber.dot, label: "Highest peak records" },
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
