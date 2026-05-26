"use client";

import { useEffect, useMemo, useState } from "react";
import { getSampleResults } from "@/lib/collatz/store";
import type { CollatzResultRow } from "@/lib/collatz/store";

const patternViews = [
  "Steps to 1 (log scale)",
  "Peak Value Distribution",
  "Odd Step Density",
  "First Descent Delay",
];

const COLS = 20;
const ROWS = 8;
const MIN_ROWS_FOR_HEATMAP = 40;

function buildHeatmap(results: CollatzResultRow[]): number[][] | null {
  if (results.length < MIN_ROWS_FOR_HEATMAP) return null;

  const maxN = results.reduce((m, r) => (r.n > m ? r.n : m), 0);
  const maxSteps = results.reduce((m, r) => (r.steps > m ? r.steps : m), 0);
  if (maxN === 0 || maxSteps === 0) return null;

  // grid[row][col] = count; row 0 = highest step band (top of chart)
  const grid: number[][] = Array.from({ length: ROWS }, () =>
    new Array(COLS).fill(0),
  );

  for (const r of results) {
    const col = Math.min(Math.floor((r.n / maxN) * COLS), COLS - 1);
    const stepRow = Math.min(Math.floor((r.steps / maxSteps) * ROWS), ROWS - 1);
    grid[ROWS - 1 - stepRow][col]++;
  }

  const maxCount = grid.reduce((m, row) => {
    const rowMax = row.reduce((a, b) => (b > a ? b : a), 0);
    return rowMax > m ? rowMax : m;
  }, 0);

  if (maxCount === 0) return null;
  return grid.map((row) => row.map((v) => v / maxCount));
}

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
  const [results, setResults] = useState<CollatzResultRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const rows = await getSampleResults(500);
      if (!isMounted) return;
      setResults(rows);
      setLoaded(true);
    }
    load();
    return () => { isMounted = false; };
  }, []);

  const heatmapRows = useMemo(() => buildHeatmap(results), [results]);
  const hasData = heatmapRows !== null;

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

          {loaded && !hasData ? (
            /* Not enough data yet */
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 px-4 py-14 text-center dark:border-slate-800">
              <span className="text-3xl text-slate-300 dark:text-slate-700">◈</span>
              <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Awaiting dataset growth
              </p>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                Heatmaps activate once{" "}
                {MIN_ROWS_FOR_HEATMAP}+ trajectories have been cataloged.
                {results.length > 0 && ` Currently ${results.length} cataloged.`}
              </p>
            </div>
          ) : hasData ? (
            /* Live heatmap */
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              {/* Y-axis label */}
              <div className="border-b border-slate-200 bg-slate-50/60 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-800/30">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  ↕ Rows = bucketed trajectory groups (by step count, high → low)
                </p>
              </div>
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
                    {heatmapRows!.map((row, ri) => (
                      <div key={ri} className="flex gap-0.5">
                        {row.map((val, ci) => (
                          <div
                            key={ci}
                            className={`h-5 flex-1 rounded-sm transition-opacity ${intensityToClass(val)}`}
                            style={{ opacity: 0.45 + val * 0.55 }}
                            title={`Intensity: ${(val * 100).toFixed(0)}%`}
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
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    → Columns = cataloged number ranges (n ascending)
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
          ) : (
            /* Loading skeleton */
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col gap-0.5 p-2">
                {Array.from({ length: ROWS }).map((_, ri) => (
                  <div key={ri} className="flex gap-0.5">
                    {Array.from({ length: COLS }).map((_, ci) => (
                      <div
                        key={ci}
                        className="h-5 flex-1 animate-pulse rounded-sm bg-slate-200 dark:bg-slate-700"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
            {hasData
              ? `Live heatmap from ${results.length} cataloged trajectories · Rows = step bands · Columns = n ranges · Color = relative density`
              : "Rows = bucketed trajectory groups · Columns = cataloged number ranges · Color = relative activity intensity"}
          </p>
        </div>
      </div>
    </section>
  );
}
