"use client";

import Link from "next/link";
import { useCollatzLiveState } from "@/hooks/useCollatzLiveState";
import type { HealthStatus } from "@/hooks/useCollatzLiveState";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { formatLargeNumber, formatLargeNumberTitle } from "@/lib/collatz/format";
import { EVENT_COLORS } from "@/lib/collatz/event-visuals";

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
    dot: `${EVENT_COLORS.cyan.dot} animate-ping`,
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
    dot: `${EVENT_COLORS.slate.dot} animate-ping`,
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
    <p className={`mt-1 font-mono font-bold tabular-nums ${className}`}>
      {children}
    </p>
  );
}

function SkeletonBar({ w = "w-24" }: { w?: string }) {
  return (
    <div className={`h-4 animate-pulse rounded bg-slate-800 ${w}`} />
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
          className={`relative inline-flex h-2 w-2 rounded-full ${cfg.dot.replace("animate-ping", "").trim()}`}
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
    <section className="border-y border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
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
    <section className="border-y border-slate-800 bg-slate-950">
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
  } = useCollatzLiveState();

  if (loading) return <LoadingSkeleton />;
  if (!state) return <NoDataState error={error} />;

  const currentN = Number(state.last_checked_number ?? 0) + 1;

  return (
    <section className="border-y border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-0 sm:px-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 py-4">
          <div>
            <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
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
          {/* Current n */}
          <div className="py-6 sm:pr-8">
            <Label>Currently Analyzing</Label>
            <p className="mt-2 font-mono text-4xl font-bold tabular-nums tracking-tight text-slate-50 sm:text-5xl">
              n = {fmtN(currentN)}
            </p>
            <p className="mt-1.5 font-mono text-[11px] text-slate-600">
              next integer queued for trajectory computation
            </p>
          </div>

          {/* Catalog size */}
          <div className="border-t border-slate-800/70 py-6 sm:border-l sm:border-t-0 sm:pl-8">
            <Label>Catalog Size</Label>
            <p className="mt-2 font-mono text-4xl font-bold tabular-nums tracking-tight text-slate-50 sm:text-5xl">
              {fmtN(state.total_numbers_checked)}
            </p>
            <p className="mt-1.5 font-mono text-[11px] text-slate-600">
              trajectories verified · all confirmed to reach 1
            </p>
          </div>
        </div>

        {/* ── Sequential Batch Processing ──────────────────────────────────── */}
        <div className="border-b border-slate-800/70 py-5">
          <div className="mb-3 flex items-center gap-2">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Sequential Batch Processing
            </p>
            <PanelHelp
              title="Sequential Batch Processing"
              description="The engine checks every integer in order, but saves completed results in batches for efficiency. This is why the dashboard updates in jumps instead of one number at a time."
              align="left"
            />
            <span className="font-mono text-[9px] text-slate-700">
              · integers processed in order from n=1 upward
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Last verified batch */}
            <div className="rounded border border-slate-800 bg-slate-900/60 px-4 py-3">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                Last Verified Batch
              </p>
              {lastVerifiedEnd > 0 ? (
                <>
                  <p className="mt-1.5 font-mono text-sm font-bold text-slate-200 tabular-nums">
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
            <div className={`rounded border px-4 py-3 ${EVENT_COLORS.cyan.border} ${EVENT_COLORS.cyan.bg}`}>
              <p className={`font-mono text-[9px] font-semibold uppercase tracking-[0.15em] ${EVENT_COLORS.cyan.text}`}>
                Currently Processing
              </p>
              <p className={`mt-1.5 font-mono text-sm font-bold tabular-nums ${EVENT_COLORS.cyan.text}`}>
                n = {fmtN(nextBatchStart)} → {fmtN(nextBatchEnd)}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-cyan-800">
                {fmtN(batchSize)} numbers per batch
              </p>
            </div>

            {/* Next queued */}
            <div className="rounded border border-slate-800 bg-slate-900/40 px-4 py-3">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                Next Queued
              </p>
              <p className="mt-1.5 font-mono text-sm font-bold text-slate-400 tabular-nums">
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
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
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
            <div>
              <Label>Longest Trajectory on Record</Label>
              <div className="mt-2 flex items-baseline gap-3">
                <span className={`font-mono text-2xl font-bold tabular-nums ${EVENT_COLORS.violet.text}`}>
                  {fmtN(state.longest_steps)}
                </span>
                <span className="font-mono text-[11px] text-slate-500">steps to reach 1</span>
              </div>
            </div>

            <div className="border-t border-slate-800/70 pt-5 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
              <Label>Highest Peak Value on Record</Label>
              <div className="mt-2 flex items-baseline gap-3">
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
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2.5">
              <Label>Last Run</Label>
              <span className="font-mono text-[11px] text-slate-400">
                {fmtDateTime(state.last_run_at)}
              </span>
            </div>
            {state.worker_heartbeat_at && (
              <div className="flex items-center gap-2.5">
                <Label>Last Heartbeat</Label>
                <span className="font-mono text-[11px] text-slate-500">
                  {fmtDateTime(state.worker_heartbeat_at)}
                </span>
              </div>
            )}
          </div>

          {/* Error banner */}
          {state.last_error && (
            <div className="mt-3 flex items-start gap-2.5 rounded border border-red-900/60 bg-red-950/40 px-3 py-2.5">
              <span className="mt-px shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest text-red-500">
                Error
              </span>
              <p className="font-mono text-[11px] leading-relaxed text-red-400">
                {state.last_error}
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <p className="mt-3 font-mono text-[9px] leading-relaxed text-slate-700">
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
