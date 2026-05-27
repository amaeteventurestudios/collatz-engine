"use client";

import {
  useCollatzSelectedTrajectory,
  type DisplayMode,
} from "@/hooks/useCollatzSelectedTrajectory";
import { TrajectoryVisualizer } from "@/components/home/TrajectoryVisualizer";
import { SequenceTrace } from "@/components/home/SequenceTrace";

// ─── Mode button definitions ──────────────────────────────────────────────────

const MODE_BUTTONS: { mode: DisplayMode; label: string; hint: string }[] = [
  {
    mode: "latest_verified",
    label: "Latest Verified",
    hint: "Most recently confirmed trajectory from the live catalog",
  },
  {
    mode: "current_batch",
    label: "Current Batch",
    hint: "Sample from the batch currently being processed",
  },
  {
    mode: "longest_record",
    label: "Longest Record",
    hint: "Trajectory with the most steps ever recorded",
  },
  {
    mode: "highest_peak",
    label: "Highest Peak",
    hint: "Trajectory that reached the highest peak value",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function TrajectorySection() {
  const { mode, setMode, result, label, helperCopy, loading, error } =
    useCollatzSelectedTrajectory();

  return (
    <>
      {/* ── Display mode selector ─────────────────────────────────────────── */}
      <div className="px-4 pb-2 pt-2">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-2 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Display Mode
              </span>
              {MODE_BUTTONS.map(({ mode: m, label: l, hint }) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  title={hint}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                    mode === m
                      ? "bg-teal-500/15 text-teal-700 ring-1 ring-teal-500/40 dark:text-teal-400"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {loading && (
                <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                  Loading...
                </span>
              )}
              {error && (
                <span className="font-mono text-[10px] text-red-500 dark:text-red-400">
                  {error}
                </span>
              )}
              <span className="hidden font-mono text-[10px] text-slate-400 dark:text-slate-500 sm:inline">
                {label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Trajectory Visualizer ─────────────────────────────────────────── */}
      <TrajectoryVisualizer
        result={result}
        displayLabel={label}
        helperCopy={helperCopy}
      />

      {/* ── Sequence Trace ────────────────────────────────────────────────── */}
      <SequenceTrace result={result} displayLabel={label} />
    </>
  );
}
