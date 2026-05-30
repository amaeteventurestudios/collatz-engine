"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCollatzLiveState } from "@/hooks/useCollatzLiveState";
import type { HealthStatus } from "@/hooks/useCollatzLiveState";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { formatLargeNumber, formatLargeNumberTitle } from "@/lib/collatz/format";
import { EVENT_COLORS } from "@/lib/collatz/event-visuals";
import { getEstimatedEnginePosition } from "@/lib/collatz/live-estimate";

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtN(n: number | null | undefined): string {
  if (n == null) return "Pending";
  return Number(n).toLocaleString("en-US");
}

function fmtRuntime(seconds: number): string {
  if (seconds <= 0) return "Pending";
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3_600);
  const m = Math.floor((seconds % 3_600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtAge(seconds: number): string {
  if (!isFinite(seconds)) return "Pending";
  if (seconds < 5) return "< 5s ago";
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function fmtMs(ms: number | null | undefined): string {
  if (ms == null || ms === 0) return "Pending";
  if (ms < 1_000) return `${ms}ms`;
  return `${(ms / 1_000).toFixed(2)}s`;
}

function fmtRate(rps: number | null | undefined): string {
  if (rps == null || Number(rps) === 0) return "Pending";
  return `${Number(rps).toFixed(1)}/sec`;
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "Pending";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─── Health badge config ──────────────────────────────────────────────────────

const HEALTH_CONFIG: Record<
  HealthStatus,
  { label: string; dot: string; text: string; border: string; bg: string }
> = {
  live: {
    label: "LIVE",
    dot: `${EVENT_COLORS.cyan.dot} motion-safe:animate-ping`,
    text: EVENT_COLORS.cyan.text,
    border: EVENT_COLORS.cyan.border,
    bg: EVENT_COLORS.cyan.subtleBg,
  },
  delayed: {
    label: "DELAYED",
    dot: EVENT_COLORS.slate.dot,
    text: EVENT_COLORS.slate.text,
    border: EVENT_COLORS.slate.border,
    bg: EVENT_COLORS.slate.subtleBg,
  },
  stalled: {
    label: "STALLED",
    dot: EVENT_COLORS.slate.dot,
    text: EVENT_COLORS.slate.text,
    border: EVENT_COLORS.slate.border,
    bg: EVENT_COLORS.slate.subtleBg,
  },
  stopped: {
    label: "STOPPED",
    dot: EVENT_COLORS.slate.dot,
    text: EVENT_COLORS.slate.text,
    border: EVENT_COLORS.slate.border,
    bg: EVENT_COLORS.slate.subtleBg,
  },
  error: {
    label: "ERROR",
    dot: `${EVENT_COLORS.slate.dot} motion-safe:animate-ping`,
    text: EVENT_COLORS.slate.text,
    border: EVENT_COLORS.slate.border,
    bg: EVENT_COLORS.slate.subtleBg,
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
      {children}
    </p>
  );
}

function Value({
  children,
  className = "text-slate-100",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`live-value mt-1 font-mono font-bold ${className}`}>
      {children}
    </p>
  );
}

function SkeletonBar({ w = "w-24" }: { w?: string }) {
  return (
    <div className={`h-4 motion-safe:animate-pulse rounded bg-slate-800 ${w}`} />
  );
}

// ─── Health badge ─────────────────────────────────────────────────────────────

function HealthBadge({ status }: { status: HealthStatus }) {
  const cfg = HEALTH_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 ${cfg.bg} ${cfg.border}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${cfg.dot}`}
        />
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${cfg.dot.replace("motion-safe:animate-ping", "").trim()}`}
        />
      </span>
      <span className={`font-mono text-[10px] font-bold tracking-[0.2em] ${cfg.text}`}>
        {cfg.label}
      </span>
    </span>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <section className="live-stable min-h-[34rem] border-y border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <SkeletonBar w="w-48" />
          <SkeletonBar w="w-24" />
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SkeletonBar w="w-20" />
              <SkeletonBar w="w-32" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── No-data state ────────────────────────────────────────────────────────────

function NoDataState({ error }: { error: string | null }) {
  return (
    <section className="live-stable min-h-[34rem] border-y border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">
            Engine State
          </span>
          <p className="font-mono text-sm font-semibold text-slate-400">
            {error ? "Live catalog connection error" : "No engine state found"}
          </p>
          {error && (
            <p className="max-w-md font-mono text-[11px] text-red-500">{error}</p>
          )}
          {!error && (
            <p className="max-w-md text-xs leading-relaxed text-slate-600">
              The live catalog has not reported an initial state yet. Once the
              engine records its first verified batch, this panel will update.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LiveEngineStatus() {
  const {
    state,
    loading,
    error,
    runtimeSeconds,
    heartbeatAgeSeconds,
    healthStatus,
    lastVerifiedStart,
    lastVerifiedEnd,
    nextBatchStart,
    nextBatchEnd,
    batchSize,
    payloadGeneratedAt,
    pollIntervalMs,
  } = useCollatzLiveState();

  // ── Estimated position counter ─────────────────────────────────────────────
  // A second-resolution clock drives the estimate between backend syncs.
  // setState is only called inside the interval callback (not the effect body),
  // so no cascading-render lint issues arise.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);
    return () => window.clearInterval(id);
  }, []);

  const estimatedN = useMemo<number | null>(() => {
    const estimate = getEstimatedEnginePosition({
      state,
      payloadGeneratedAt,
      nowMs: now,
      fallback: "queued",
    });
    return estimate.isEstimated ? estimate.n : null;
  }, [state, payloadGeneratedAt, now]);

  if (loading) return <LoadingSkeleton />;
  if (!state) return <NoDataState error={error} />;

  const currentN = Number(state.last_checked_number ?? 0) + 1;
  const displayN = estimatedN !== null && estimatedN > currentN ? estimatedN : currentN;
  const isEstimated = displayN > currentN;
  const pollSec = Math.round(pollIntervalMs / 1000);

  return (
    <section className="live-stable border-y border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-0 sm:px-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center justify-between gap-3 border-b border-slate-800/70 py-4 text-center md:flex-row md:text-left">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                Autonomous Collatz Explorer
              </p>
              <PanelHelp
                title="Autonomous Collatz Explorer"
                description="Shows the next number being analyzed and the size of the verified catalog. The engine advances sequentially from 1 upward."
                align="left"
              />
              <PanelHelp
                title="Live Engine Status"
                description="Shows whether the autonomous engine is running, how many numbers have been cataloged, how fast it is processing, and whether the worker is still reporting fresh activity."
                align="left"
              />
            </div>
            <p className="mt-0.5 font-mono text-[10px] text-slate-600">
              Sequentially cataloging Collatz trajectories from 1 upward
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
            <HealthBadge status={healthStatus} />
            <Link
              href="/status"
              className="rounded border border-slate-700 px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 transition-colors hover:bg-slate-900 hover:text-slate-200"
            >
              Status
            </Link>
          </div>
        </div>

        {/* ── Primary metrics ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-px border-b border-slate-800/70 sm:grid-cols-2">
          {/* Current n — estimated between backend syncs */}
          <div className="py-6 text-center sm:pr-8 md:text-left">
            <Label>Current Engine Position</Label>
            <p
              className={`live-value mt-2 font-mono text-4xl font-bold tracking-tight sm:text-5xl ${
                isEstimated ? EVENT_COLORS.cyan.text : "text-slate-50"
              }`}
            >
              {isEstimated ? "~" : "n = "}
              {fmtN(displayN)}
            </p>
            {isEstimated ? (
              <>
                <p className="mt-1.5 font-mono text-[11px] text-slate-500">
                  Estimated from sustained live rate. Verified position updates on sync.
                </p>
                <p className="mt-1 font-mono text-[10px] text-slate-600">
                  Last verified: n = {fmtN(currentN)} · Synced with backend every {pollSec}s
                </p>
              </>
            ) : (
              <p className="mt-1.5 font-mono text-[11px] text-slate-600">
                next integer queued for trajectory computation
              </p>
            )}
          </div>

          {/* Catalog size */}
          <div className="border-t border-slate-800/70 py-6 text-center sm:border-l sm:border-t-0 sm:pl-8 md:text-left">
            <Label>Catalog Size</Label>
            <p className="live-value mt-2 font-mono text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl">
              {fmtN(state.total_numbers_checked)}
            </p>
            <p className="mt-1.5 font-mono text-[11px] text-slate-600">
              trajectories verified · all confirmed to reach 1
            </p>
          </div>
        </div>

        {/* ── Sequential Batch Processing ──────────────────────────────────── */}
        <div className="border-b border-slate-800/70 py-5">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-center md:justify-start md:text-left">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Sequential Batch Processing
            </p>
            <PanelHelp
              title="Sequential Batch Processing"
              description="The engine checks every integer in order, but saves completed results in batches for efficiency. This is why the dashboard updates in jumps instead of one number at a time."
              align="left"
            />
            <span className="w-full font-mono text-[9px] text-slate-700 sm:w-auto">
              · integers processed in order from n=1 upward
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Last verified batch */}
            <div className="min-h-[5.75rem] rounded border border-slate-800 bg-slate-900/60 px-4 py-3 text-center md:text-left">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                Last Verified Batch
              </p>
              {lastVerifiedEnd > 0 ? (
                <>
                  <p className="live-value mt-1.5 font-mono text-sm font-bold text-slate-200">
                    n = {fmtN(lastVerifiedStart)} → {fmtN(lastVerifiedEnd)}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-600">
                    {fmtN(batchSize)} numbers · all reached 1
                  </p>
                </>
              ) : (
                <p className="mt-1.5 font-mono text-sm text-slate-600">
                  Not yet started
                </p>
              )}
            </div>

            {/* Currently processing */}
            <div className={`min-h-[5.75rem] rounded border px-4 py-3 text-center md:text-left ${EVENT_COLORS.cyan.border} ${EVENT_COLORS.cyan.bg}`}>
              <p className={`font-mono text-[9px] font-semibold uppercase tracking-[0.15em] ${EVENT_COLORS.cyan.text}`}>
                Currently Processing
              </p>
              <p className={`live-value mt-1.5 font-mono text-sm font-bold ${EVENT_COLORS.cyan.text}`}>
                n = {fmtN(nextBatchStart)} → {fmtN(nextBatchEnd)}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-cyan-800">
                {fmtN(batchSize)} numbers per batch
              </p>
            </div>

            {/* Next queued */}
            <div className="min-h-[5.75rem] rounded border border-slate-800 bg-slate-900/40 px-4 py-3 text-center md:text-left">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                Next Queued
              </p>
              <p className="live-value mt-1.5 font-mono text-sm font-bold text-slate-400">
                n = {fmtN(nextBatchEnd + 1)} → {fmtN(nextBatchEnd + batchSize)}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-slate-700">
                queued after current batch
              </p>
            </div>
          </div>
        </div>

        {/* ── Operational metrics ──────────────────────────────────────────── */}
        <div className="border-b border-slate-800/70 py-5">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 text-center sm:grid-cols-3 md:text-left lg:grid-cols-5">
            <div>
              <Label>Runtime</Label>
              <Value className="text-teal-400 text-sm">
                {fmtRuntime(runtimeSeconds)}
              </Value>
              <p className="mt-0.5 font-mono text-[9px] text-slate-700">
                from engine start
              </p>
            </div>

            <div>
              <Label>Throughput</Label>
              <Value className="text-slate-100 text-sm">
                {fmtRate(state.numbers_per_second)}
              </Value>
              <p className="mt-0.5 font-mono text-[9px] text-slate-700">
                numbers / sec
              </p>
            </div>

            <div>
              <Label>Last Batch</Label>
              <Value className="text-slate-100 text-sm">
                {state.last_batch_size ? fmtN(state.last_batch_size) : "Pending"}
              </Value>
              <p className="mt-0.5 font-mono text-[9px] text-slate-700">
                numbers in batch
              </p>
            </div>

            <div>
              <Label>Batch Duration</Label>
              <Value className="text-slate-100 text-sm">
                {fmtMs(state.last_batch_duration_ms)}
              </Value>
              <p className="mt-0.5 font-mono text-[9px] text-slate-700">
                wall-clock time
              </p>
            </div>

            <div>
              <Label>Heartbeat</Label>
              <Value
                className={`text-sm ${
                  isFinite(heartbeatAgeSeconds) && heartbeatAgeSeconds <= 30
                    ? EVENT_COLORS.emerald.text
                    : EVENT_COLORS.slate.text
                }`}
              >
                {fmtAge(heartbeatAgeSeconds)}
              </Value>
              <p className="mt-0.5 font-mono text-[9px] text-slate-700">
                last worker ping
              </p>
            </div>
          </div>
        </div>

        {/* ── Records ─────────────────────────────────────────────────────── */}
        <div className="border-b border-slate-800/70 py-5">
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            <div className="text-center md:text-left">
              <Label>Longest Trajectory on Record</Label>
              <div className="mt-2 flex flex-col items-center gap-1 sm:flex-row sm:items-baseline sm:justify-center md:justify-start md:gap-3">
                <span className={`live-value font-mono text-2xl font-bold ${EVENT_COLORS.violet.text}`}>
                  {fmtN(state.longest_steps)}
                </span>
                <span className="font-mono text-[11px] text-slate-500">steps to reach 1</span>
              </div>
            </div>

            <div className="border-t border-slate-800/70 pt-5 text-center sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0 md:text-left">
              <Label>Highest Peak Value on Record</Label>
              <div className="mt-2 flex flex-col items-center gap-1 sm:flex-row sm:items-baseline sm:justify-center md:justify-start md:gap-3">
                <span
                  className={`font-mono text-2xl font-bold tabular-nums ${EVENT_COLORS.amber.text}`}
                  title={state.highest_peak != null ? formatLargeNumberTitle(state.highest_peak) : undefined}
                >
                  {state.highest_peak != null ? formatLargeNumber(state.highest_peak) : "Pending"}
                </span>
                <span className="font-mono text-[11px] text-slate-500">largest value encountered</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Last run + error ─────────────────────────────────────────────── */}
        <div className="py-4">
          <div className="flex min-h-[2rem] flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center md:justify-start md:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Label>Last Run</Label>
              <span className="whitespace-nowrap font-mono text-[11px] text-slate-400">
                {fmtDateTime(state.last_run_at)}
              </span>
            </div>
            <div className={`flex flex-wrap items-center justify-center gap-2.5 ${state.worker_heartbeat_at ? "" : "invisible"}`}>
              <Label>Last Heartbeat</Label>
              <span className="whitespace-nowrap font-mono text-[11px] text-slate-500">
                {fmtDateTime(state.worker_heartbeat_at)}
              </span>
            </div>
          </div>

          {/* Error banner */}
          <div
            className={`mt-3 flex h-[5rem] flex-col items-center gap-2.5 overflow-hidden rounded border border-red-900/60 bg-red-950/40 px-3 py-2.5 text-center md:h-[3.5rem] md:flex-row md:items-start md:text-left ${
              state.last_error ? "" : "invisible"
            }`}
          >
            <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest text-red-500 md:mt-px">
              Error
            </span>
            <p className="font-mono text-[11px] leading-relaxed text-red-400">
              {state.last_error ?? "No engine error"}
            </p>
          </div>

          {/* Disclaimer */}
          <p className="mt-3 text-center font-mono text-[9px] leading-relaxed text-slate-700 md:text-left">
            The engine processes integers sequentially in verified batches.
            Completed results are stored in the catalog and displayed here as a
            live computational record. This system does not claim to prove the
            Collatz Conjecture.
          </p>
        </div>

      </div>
    </section>
  );
}
