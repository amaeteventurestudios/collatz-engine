"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getLatestResults } from "@/lib/collatz/store";
import type { CollatzResultRow } from "@/lib/collatz/store";
import { Modal } from "@/components/ui/Modal";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { formatLargeNumber, formatLargeNumberTitle } from "@/lib/collatz/format";

// ─── Constants ────────────────────────────────────────────────────────────────

const PATTERN_VIEWS = [
  "Steps to 1",
  "Peak Value",
  "Steps × Peak",
  "Peak Ratio",
] as const;
type PatternView = (typeof PATTERN_VIEWS)[number];

const COLS = 20;
const ROWS = 8;
const MIN_FOR_HEATMAP = 40;
const POLL_MS = 10_000;
const SAMPLE_SIZE = 500;

// ─── Heatmap builders ─────────────────────────────────────────────────────────

function normalizeGrid(grid: number[][]): number[][] | null {
  const max = grid.reduce(
    (m, row) => Math.max(m, ...row),
    0,
  );
  if (max === 0) return null;
  return grid.map((row) => row.map((v) => v / max));
}

function makeGrid(): number[][] {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

/** Rows = step count bands (high→low), Cols = n ranges */
function buildStepsHeatmap(results: CollatzResultRow[]): number[][] | null {
  if (results.length < MIN_FOR_HEATMAP) return null;
  const maxN = results.reduce((m, r) => Math.max(m, r.n), 0);
  const maxSteps = results.reduce((m, r) => Math.max(m, r.steps), 0);
  if (maxN === 0 || maxSteps === 0) return null;
  const grid = makeGrid();
  for (const r of results) {
    const col = Math.min(Math.floor((r.n / maxN) * COLS), COLS - 1);
    const row = Math.min(Math.floor((r.steps / maxSteps) * ROWS), ROWS - 1);
    grid[ROWS - 1 - row][col]++;
  }
  return normalizeGrid(grid);
}

/** Rows = peak value bands (high→low), Cols = n ranges */
function buildPeakHeatmap(results: CollatzResultRow[]): number[][] | null {
  if (results.length < MIN_FOR_HEATMAP) return null;
  const maxN = results.reduce((m, r) => Math.max(m, r.n), 0);
  const maxPeak = results.reduce((m, r) => Math.max(m, r.peak), 0);
  if (maxN === 0 || maxPeak === 0) return null;
  const grid = makeGrid();
  for (const r of results) {
    const col = Math.min(Math.floor((r.n / maxN) * COLS), COLS - 1);
    const row = Math.min(Math.floor((r.peak / maxPeak) * ROWS), ROWS - 1);
    grid[ROWS - 1 - row][col]++;
  }
  return normalizeGrid(grid);
}

/** Rows = peak value bands (high to low), cols = step count bands. Correlation view. */
function buildCorrelationHeatmap(results: CollatzResultRow[]): number[][] | null {
  if (results.length < MIN_FOR_HEATMAP) return null;
  const maxSteps = results.reduce((m, r) => Math.max(m, r.steps), 0);
  const maxPeak = results.reduce((m, r) => Math.max(m, r.peak), 0);
  if (maxSteps === 0 || maxPeak === 0) return null;
  const grid = makeGrid();
  for (const r of results) {
    const col = Math.min(Math.floor((r.steps / maxSteps) * COLS), COLS - 1);
    const row = Math.min(Math.floor((r.peak / maxPeak) * ROWS), ROWS - 1);
    grid[ROWS - 1 - row][col]++;
  }
  return normalizeGrid(grid);
}

/** Rows = peak÷n ratio bands (high→low), Cols = n ranges */
function buildRatioHeatmap(results: CollatzResultRow[]): number[][] | null {
  if (results.length < MIN_FOR_HEATMAP) return null;
  const maxN = results.reduce((m, r) => Math.max(m, r.n), 0);
  const ratios = results.map((r) => (r.n > 0 ? r.peak / r.n : 0));
  const maxRatio = ratios.reduce((m, v) => Math.max(m, v), 0);
  if (maxN === 0 || maxRatio === 0) return null;
  const grid = makeGrid();
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const col = Math.min(Math.floor((r.n / maxN) * COLS), COLS - 1);
    const row = Math.min(Math.floor((ratios[i] / maxRatio) * ROWS), ROWS - 1);
    grid[ROWS - 1 - row][col]++;
  }
  return normalizeGrid(grid);
}

// ─── View metadata ────────────────────────────────────────────────────────────

const VIEW_META: Record<PatternView, { xLabel: string; yLabel: string; desc: string; helper: string }> = {
  "Steps to 1": {
    xLabel: "→ n ranges (ascending)",
    yLabel: "Step bands",
    desc: "Rows = step count bands (high → low) · Columns = n ranges · Color = relative frequency",
    helper: "Highlights where longer trajectories appear inside the latest verified window.",
  },
  "Peak Value": {
    xLabel: "→ n ranges (ascending)",
    yLabel: "Peak bands",
    desc: "Rows = peak value bands (high → low) · Columns = n ranges · Color = relative frequency",
    helper: "Highlights where trajectories climb to larger peak values.",
  },
  "Steps × Peak": {
    xLabel: "→ step count bands",
    yLabel: "Peak bands",
    desc: "Correlation of trajectory length vs peak value · Rows = peak value bands · Columns = step count bands",
    helper: "Combines trajectory length and peak size to surface unusually intense paths.",
  },
  "Peak Ratio": {
    xLabel: "→ n ranges (ascending)",
    yLabel: "Peak/n ratio",
    desc: "Rows = peak÷n ratio bands (high → low) · Columns = n ranges · Color = relative frequency",
    helper: "Shows how large the peak became relative to the starting integer.",
  },
};

function formatAge(date: Date | null, now: Date): string {
  if (!date) return "not yet refreshed";
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

function getRangeLabel(results: CollatzResultRow[]): string {
  if (results.length === 0) return "n = pending";
  const min = results.reduce((value, row) => Math.min(value, row.n), results[0].n);
  const max = results.reduce((value, row) => Math.max(value, row.n), results[0].n);
  return `n=${min.toLocaleString("en-US")} to ${max.toLocaleString("en-US")}`;
}

// ─── Color helper ─────────────────────────────────────────────────────────────

function intensityToClass(v: number): string {
  if (v >= 0.88) return "bg-red-500 dark:bg-red-400";
  if (v >= 0.75) return "bg-orange-400 dark:bg-orange-300";
  if (v >= 0.62) return "bg-yellow-400 dark:bg-yellow-300";
  if (v >= 0.48) return "bg-green-400 dark:bg-green-300";
  if (v >= 0.35) return "bg-teal-400 dark:bg-teal-300";
  return "bg-sky-500 dark:bg-sky-400";
}

// ─── Heatmap renderer ─────────────────────────────────────────────────────────

function Heatmap({
  grid,
  xLabel,
  yLabel,
}: {
  grid: number[][];
  xLabel: string;
  yLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="border-b border-slate-200 bg-slate-50/60 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-800/30">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          ↕ Rows = {yLabel} bands (high → low)
        </p>
      </div>
      <div className="flex">
        <div className="flex w-10 flex-col items-end justify-around py-2 pr-2 text-[9px] text-slate-400 dark:text-slate-600">
          <span>High</span>
          <span />
          <span />
          <span />
          <span>Low</span>
        </div>
        <div className="flex-1 py-2 pr-2">
          <div className="flex flex-col gap-0.5">
            {grid.map((row, ri) => (
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
      <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {xLabel}
          </span>
          <div className="flex items-center gap-2">
            {[
              { label: "Low density", cls: "bg-sky-500" },
              { label: "High density", cls: "bg-red-500" },
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
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function HeatmapSkeleton() {
  return (
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
  );
}

// ─── "View all" modal content ─────────────────────────────────────────────────

function AllResultsTable({
  results,
  activeView,
  rangeLabel,
  refreshedLabel,
}: {
  results: CollatzResultRow[];
  activeView: PatternView;
  rangeLabel: string;
  refreshedLabel: string;
}) {
  const sorted = useMemo(
    () => [...results].sort((a, b) => b.steps - a.steps),
    [results],
  );
  return (
    <div>
      <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Latest-window sample
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          {sorted.length} verified trajectories · {rangeLabel} · refreshed {refreshedLabel} ·
          active metric: {activeView}. This modal shows the sampled latest window, not the full
          catalog.
        </p>
      </div>
      <div className="overflow-y-auto rounded-xl border border-slate-700" style={{ maxHeight: 420 }}>
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-700 bg-slate-800">
              {["n", "Steps to 1", "Peak value", "Peak ratio"].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sorted.map((r) => {
              const ratio = r.n > 0 ? (r.peak / r.n).toFixed(1) : "Pending";
              return (
                <tr key={r.n} className="hover:bg-slate-800/50">
                  <td className="px-3 py-2 font-mono font-bold text-slate-100">
                    <span title={formatLargeNumberTitle(r.n)}>
                      {formatLargeNumber(r.n)}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-orange-400">
                    {r.steps.toLocaleString("en-US")}
                  </td>
                  <td className="px-3 py-2 font-mono text-blue-400">
                    <span title={formatLargeNumberTitle(r.peak)}>
                      {formatLargeNumber(r.peak)}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-400">
                    ×{ratio}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PatternViews() {
  const [activeView, setActiveView] = useState<PatternView>(PATTERN_VIEWS[0]);
  const [results, setResults] = useState<CollatzResultRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    async function poll() {
      try {
        const rows = await getLatestResults(SAMPLE_SIZE);
        if (!mountedRef.current) return;
        setResults(rows);
        setLoaded(true);
        setLastRefreshedAt(new Date());
      } catch {
        // Keep last known data on transient errors
      }
    }

    poll();
    const pollId = window.setInterval(poll, POLL_MS);
    const clockId = window.setInterval(() => setNow(new Date()), 1000);

    return () => {
      mountedRef.current = false;
      window.clearInterval(pollId);
      window.clearInterval(clockId);
    };
  }, []);

  // Build all four heatmaps from the same dataset
  const stepsGrid = useMemo(() => buildStepsHeatmap(results), [results]);
  const peakGrid = useMemo(() => buildPeakHeatmap(results), [results]);
  const corrGrid = useMemo(() => buildCorrelationHeatmap(results), [results]);
  const ratioGrid = useMemo(() => buildRatioHeatmap(results), [results]);

  const gridMap: Record<PatternView, number[][] | null> = {
    "Steps to 1": stepsGrid,
    "Peak Value": peakGrid,
    "Steps × Peak": corrGrid,
    "Peak Ratio": ratioGrid,
  };

  const activeGrid = gridMap[activeView];
  const meta = VIEW_META[activeView];
  const hasData = activeGrid !== null;
  const rangeLabel = getRangeLabel(results);
  const refreshedLabel = formatAge(lastRefreshedAt, now);

  return (
    <section className="px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <p className="section-heading">Heatmaps &amp; Pattern Views</p>
                <PanelHelp
                  title="Heatmaps & Pattern Views"
                  description="Shows patterns across a recent sample of verified numbers. The colors help reveal where longer paths, larger peaks, or unusual ratios appear."
                  align="left"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Latest {Math.min(results.length || SAMPLE_SIZE, SAMPLE_SIZE).toLocaleString("en-US")} verified trajectories · {rangeLabel} · refreshed {refreshedLabel} · refresh cadence: 10 seconds
              </p>
            </div>
            {results.length > 0 && (
              <button
                onClick={() => setModalOpen(true)}
                className="shrink-0 text-[11px] font-medium text-teal-600 hover:underline dark:text-teal-400"
              >
                View all ({results.length})
              </button>
            )}
          </div>

          <p className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
            {meta.helper}
          </p>

          {/* View tabs */}
          <div className="-mx-5 mb-5 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {PATTERN_VIEWS.map((view) => (
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

          {/* Content */}
          {!loaded ? (
            <HeatmapSkeleton />
          ) : loaded && !hasData ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 px-4 py-14 text-center dark:border-slate-800">
              <span className="text-3xl text-slate-300 dark:text-slate-700">◈</span>
              <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Awaiting dataset growth
              </p>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                Heatmaps activate once {MIN_FOR_HEATMAP}+ trajectories have been cataloged.
                {results.length > 0 && ` Currently ${results.length} cataloged.`}
              </p>
            </div>
          ) : (
            <Heatmap
              grid={activeGrid!}
              xLabel={meta.xLabel}
              yLabel={meta.yLabel}
            />
          )}

          <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
            {hasData
              ? `Latest ${results.length} verified trajectories · ${rangeLabel} · ${meta.desc}`
              : "Rows = bucketed trajectory groups · Columns = cataloged number ranges · Color = relative activity intensity"}
          </p>
        </div>
      </div>

      {/* "View all" modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`All Cataloged Trajectories (${results.length})`}
        maxWidth="max-w-2xl"
      >
        <AllResultsTable
          results={results}
          activeView={activeView}
          rangeLabel={rangeLabel}
          refreshedLabel={refreshedLabel}
        />
      </Modal>
    </section>
  );
}
