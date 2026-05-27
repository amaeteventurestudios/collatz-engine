"use client";

import { useMemo } from "react";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { formatLargeNumber, formatLargeNumberTitle } from "@/lib/collatz/format";
import type { AnalyticsRecordRow } from "@/hooks/useCollatzAnalyticsData";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

// ─── Record entry ─────────────────────────────────────────────────────────────

interface RecordEntryProps {
  rank: number;
  type: "trajectory" | "peak";
  n: number;
  value: number;
  context: string;
  timestamp: string | null;
  isTop: boolean;
}

function RecordEntry({ rank, type, n, value, context, timestamp, isTop }: RecordEntryProps) {
  const isPeak = type === "peak";

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
        isTop
          ? isPeak
            ? "border-yellow-500/30 bg-yellow-500/5 dark:border-yellow-500/20 dark:bg-yellow-500/5"
            : "border-green-500/30 bg-green-500/5 dark:border-green-500/20 dark:bg-green-500/5"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40"
      }`}
    >
      {/* Rank badge */}
      <div
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          isTop
            ? isPeak
              ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"
              : "bg-green-500/20 text-green-700 dark:text-green-400"
            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        }`}
      >
        {rank}
      </div>

      <div className="min-w-0 flex-1">
        {/* Type + value */}
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              isPeak
                ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300"
                : "bg-green-500/15 text-green-700 dark:text-green-400"
            }`}
          >
            {isPeak ? "Highest Peak" : "Longest Trajectory"}
          </span>
          <span
            className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100"
            title={isPeak ? formatLargeNumberTitle(value) : undefined}
          >
            {isPeak ? formatLargeNumber(value) : `${value.toLocaleString("en-US")} steps`}
          </span>
        </div>

        {/* Details */}
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          n = <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{n.toLocaleString("en-US")}</span>
          {" · "}
          {context}
        </p>

        {/* Timestamp */}
        {timestamp && (
          <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
            {formatTimestamp(timestamp)}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  topBySteps: AnalyticsRecordRow[];
  topByPeak: AnalyticsRecordRow[];
  loading?: boolean;
}

export function RecordBreakerTimeline({ topBySteps, topByPeak, loading }: Props) {
  const isEmpty = topBySteps.length === 0 && topByPeak.length === 0;

  const topSteps = topBySteps[0] ?? null;
  const topPeakRecord = topByPeak[0] ?? null;

  // Interleave trajectory and peak records, take top 10 of each, deduplicate by n+type
  const trajectoryEntries = useMemo(
    () => topBySteps.slice(0, 10),
    [topBySteps],
  );
  const peakEntries = useMemo(
    () => topByPeak.slice(0, 10),
    [topByPeak],
  );

  const chips = [
    {
      label: "Latest record",
      value:
        topSteps
          ? `n = ${topSteps.n.toLocaleString("en-US")}`
          : topPeakRecord
          ? `n = ${topPeakRecord.n.toLocaleString("en-US")}`
          : "—",
      title: "",
    },
    {
      label: "Longest trajectory",
      value: topSteps ? `${topSteps.steps.toLocaleString("en-US")} steps` : "—",
      title: "",
    },
    {
      label: "Highest peak",
      value: topPeakRecord ? formatLargeNumber(topPeakRecord.peak) : "—",
      title: topPeakRecord ? formatLargeNumberTitle(topPeakRecord.peak) : "",
    },
    {
      label: "Record types tracked",
      value: (trajectoryEntries.length + peakEntries.length).toString(),
      title: "",
    },
  ];

  return (
    <section className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="section-heading">Record Breaker Timeline</p>
                <PanelHelp
                  title="Record Breaker Timeline"
                  description="Chronicles moments when the engine records a new high mark, such as a longer trajectory or a higher peak. These are computational observations, not proof of the conjecture."
                  align="left"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">
                Chronicles the engine&apos;s most notable recorded events over time.
              </p>
            </div>
            {loading && (
              <span className="self-start rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                Updating…
              </span>
            )}
          </div>

          {/* Metric chips */}
          <div className="mb-5 flex flex-wrap gap-2">
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

          {/* Timeline */}
          {isEmpty ? (
            <div className="placeholder-panel">
              <p className="text-center text-sm text-slate-400 dark:text-slate-500">
                Records will appear as the engine advances and results are persisted.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Longest Trajectories */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-green-600 dark:text-green-400">
                  Longest Trajectories
                </p>
                <div className="space-y-2">
                  {trajectoryEntries.map((r, i) => (
                    <RecordEntry
                      key={`steps-${r.n}`}
                      rank={i + 1}
                      type="trajectory"
                      n={r.n}
                      value={r.steps}
                      context={`peak ${formatLargeNumber(r.peak)}`}
                      timestamp={r.created_at}
                      isTop={i === 0}
                    />
                  ))}
                  {trajectoryEntries.length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      No trajectory records yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Highest Peaks */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-yellow-600 dark:text-yellow-400">
                  Highest Peaks
                </p>
                <div className="space-y-2">
                  {peakEntries.map((r, i) => (
                    <RecordEntry
                      key={`peak-${r.n}`}
                      rank={i + 1}
                      type="peak"
                      n={r.n}
                      value={r.peak}
                      context={`${r.steps.toLocaleString("en-US")} steps`}
                      timestamp={r.created_at}
                      isTop={i === 0}
                    />
                  ))}
                  {peakEntries.length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      No peak records yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Integrity note */}
          <p className="mt-5 text-center text-[11px] text-slate-400 dark:text-slate-500">
            These are computational observations recorded by the engine. They do not constitute proof of the Collatz Conjecture.
          </p>
        </div>
      </div>
    </section>
  );
}
