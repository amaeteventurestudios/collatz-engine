"use client";

/**
 * AdminLiveMetrics
 *
 * Client component that renders Engine Status (A), Worker Lock (A2),
 * Key Metrics (B), and Throughput Graph (C) sections of the admin page
 * with live 5-second polling via useAdminRealtimeMetrics.
 *
 * Receives initial server-rendered data as props, then hydrates and polls.
 * Static data (storage, r2) that updates less frequently is also refreshed
 * from the polling response so the entire live area stays current.
 */

import { useState } from "react";
import { useAdminRealtimeMetrics } from "@/hooks/useAdminRealtimeMetrics";
import type {
  AdminMetricsApiResponse,
  WorkerLockState,
  WatchdogSignalStatus,
  WatchdogSignal,
  WatchdogResult,
} from "@/lib/admin/types";
import {
  pauseEngineFormAction,
  resumeEngineFormAction,
  forceReleaseLockFormAction,
} from "@/app/admin/actions";

// ── Local pure helpers (no server-only imports) ──────────────────────────────

function fmtN(v: number | null | undefined, fallback = "—"): string {
  if (v == null) return fallback;
  return v.toLocaleString("en-US");
}

function secondsSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

function formatDuration(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

function heartbeatStatus(age: number | null): "live" | "delayed" | "stalled" | "unknown" {
  if (age == null) return "unknown";
  if (age <= 30) return "live";
  if (age <= 120) return "delayed";
  return "stalled";
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${bytes} B`;
}

// ── UI sub-components ────────────────────────────────────────────────────────

function SectionHeading({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-teal-500">
      <span className="h-px flex-1 bg-slate-800" />
      {children}
      <span className="h-px flex-1 bg-slate-800" />
    </h2>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900 p-5 ${className}`}>
      {children}
    </div>
  );
}

function DisabledButton({ label, phase }: { label: string; phase: string }) {
  return (
    <button
      disabled
      title={`Available in ${phase}`}
      className="cursor-not-allowed rounded-lg border border-slate-700 px-3 py-1.5 text-[11px] font-medium text-slate-600 opacity-60"
    >
      {label}
      <span className="ml-1.5 text-[9px] text-slate-700">{phase}</span>
    </button>
  );
}

function LockStatusPill({ status }: { status: WorkerLockState["status"] | null }) {
  if (!status)
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400">◌ None</span>;
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-green-400">
        <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
        Active
      </span>
    );
  if (status === "expired")
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-red-400">⚠ Expired</span>;
  if (status === "force_released")
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-orange-400">⚡ Force Released</span>;
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400">✓ Released</span>;
}

function ThroughputChart({ data }: { data: Array<{ ts: string; nps: number }> }) {
  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/50">
        <p className="text-xs text-slate-600">No throughput history yet</p>
      </div>
    );
  }
  const W = 600;
  const H = 120;
  const pad = { t: 8, r: 12, b: 24, l: 44 };
  const maxNps = Math.max(...data.map((d) => d.nps), 1);
  const pts = data.map((d, i) => {
    const x = pad.l + (i / Math.max(data.length - 1, 1)) * (W - pad.l - pad.r);
    const y = pad.t + ((maxNps - d.nps) / maxNps) * (H - pad.t - pad.b);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const areaClose = `${pts[pts.length - 1].split(",")[0]},${H - pad.b} ${pad.l},${H - pad.b}`;
  const area = `M ${pts.join(" L ")} L ${areaClose} Z`;
  const line = `M ${pts.join(" L ")}`;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 140 }}>
        <defs>
          <linearGradient id="tpGradLive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const y = pad.t + (1 - frac) * (H - pad.t - pad.b);
          return (
            <g key={frac}>
              <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="#1e293b" strokeWidth={1} />
              <text x={pad.l - 4} y={y + 3} textAnchor="end" fill="#475569" fontSize={7}>
                {Math.round(maxNps * frac)}
              </text>
            </g>
          );
        })}
        <path d={area} fill="url(#tpGradLive)" />
        <path d={line} fill="none" stroke="#14b8a6" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        <text x={W / 2} y={H - 4} textAnchor="middle" fill="#475569" fontSize={7}>
          {data.length} data points · numbers/second over time
        </text>
      </svg>
    </div>
  );
}

// ── Watchdog UI ──────────────────────────────────────────────────────────────

const SIGNAL_COLORS: Record<WatchdogSignalStatus, { bg: string; border: string; text: string; dot: string }> = {
  safe:     { bg: "bg-green-500/10",  border: "border-green-500/30",  text: "text-green-400",  dot: "bg-green-400" },
  warning:  { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", dot: "bg-yellow-400" },
  critical: { bg: "bg-red-500/10",    border: "border-red-500/30",    text: "text-red-400",    dot: "bg-red-400" },
  unknown:  { bg: "bg-slate-800/50",  border: "border-slate-700",     text: "text-slate-400",  dot: "bg-slate-600" },
};

const SIGNAL_LABELS: Record<WatchdogSignalStatus, string> = {
  safe: "Safe", warning: "Warning", critical: "Critical", unknown: "Unknown",
};

function OverallStatusBanner({ watchdog }: { watchdog: WatchdogResult }) {
  const c = SIGNAL_COLORS[watchdog.overall];
  // eslint-disable-next-line react-hooks/purity
  const evaluatedAgo = Math.floor((Date.now() - new Date(watchdog.evaluatedAt).getTime()) / 1000);
  return (
    <div className={`flex items-center justify-between rounded-2xl border ${c.border} ${c.bg} px-5 py-4`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-3 w-3 shrink-0 rounded-full ${c.dot} ${watchdog.overall === "safe" ? "animate-pulse" : ""}`} />
        <div>
          <p className={`text-sm font-bold ${c.text}`}>
            Operations Health — {SIGNAL_LABELS[watchdog.overall]}
          </p>
          <p className="text-[10px] text-slate-500">
            {watchdog.overall === "safe"
              ? "All systems nominal. No action required."
              : watchdog.overall === "warning"
              ? "One or more signals need attention."
              : watchdog.overall === "critical"
              ? "Critical issue detected. Immediate action required."
              : "Insufficient data to assess engine health."}
          </p>
        </div>
      </div>
      <span className="shrink-0 text-[9px] text-slate-700 tabular-nums">
        eval {evaluatedAgo}s ago
      </span>
    </div>
  );
}

function SignalCard({ signal }: { signal: WatchdogSignal }) {
  const c = SIGNAL_COLORS[signal.status];
  return (
    <div className={`rounded-xl border ${c.border} bg-slate-900 px-4 py-3`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">
          {signal.name}
        </p>
        <span className={`flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${c.bg} ${c.text}`}>
          <span className={`h-1 w-1 rounded-full ${c.dot}`} />
          {SIGNAL_LABELS[signal.status]}
        </span>
      </div>
      <p className={`mt-1.5 text-xs font-semibold ${c.text}`}>{signal.message}</p>
      {signal.detail && (
        <p className="mt-0.5 text-[10px] leading-relaxed text-slate-600">{signal.detail}</p>
      )}
    </div>
  );
}

// ── Activity Log UI ──────────────────────────────────────────────────────────

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  heartbeat:        { bg: "bg-teal-500/10",   text: "text-teal-400" },
  milestone:        { bg: "bg-purple-500/10", text: "text-purple-400" },
  range_summary:    { bg: "bg-blue-500/10",   text: "text-blue-400" },
  cleanup:          { bg: "bg-orange-500/10", text: "text-orange-400" },
  error:            { bg: "bg-red-500/10",    text: "text-red-400" },
  warning:          { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  pause:            { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  resume:           { bg: "bg-green-500/10",  text: "text-green-400" },
  worker_start:     { bg: "bg-green-500/10",  text: "text-green-400" },
  worker_stop:      { bg: "bg-slate-700",     text: "text-slate-400" },
  lock_acquired:    { bg: "bg-teal-500/10",   text: "text-teal-400" },
  lock_released:    { bg: "bg-slate-700",     text: "text-slate-400" },
  lock_force:       { bg: "bg-red-500/10",    text: "text-red-400" },
  integrity_check:  { bg: "bg-blue-500/10",   text: "text-blue-400" },
  config_change:    { bg: "bg-purple-500/10", text: "text-purple-400" },
};

function eventBadgeColors(type: string): { bg: string; text: string } {
  const exact = EVENT_TYPE_COLORS[type.toLowerCase()];
  if (exact) return exact;
  for (const [key, val] of Object.entries(EVENT_TYPE_COLORS)) {
    if (type.toLowerCase().includes(key)) return val;
  }
  return { bg: "bg-slate-800", text: "text-slate-500" };
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initial: AdminMetricsApiResponse;
}

// ── Main component ───────────────────────────────────────────────────────────

export function AdminLiveMetrics({ initial }: Props) {
  const { data, isStale, error } = useAdminRealtimeMetrics(initial);
  const live = data ?? initial;

  const engine = live.engine;
  const workerLock = live.workerLock;
  const lockTableExists = live.lockTableExists;
  const throughput = live.throughput;
  const storage = live.storage;
  const r2 = live.r2;
  const watchdog = live.watchdog;
  const activity = live.activity;

  const [activityFilter, setActivityFilter] = useState<string>("all");

  const hbAge = secondsSince(engine?.lastHeartbeat);
  const hbStatus = heartbeatStatus(hbAge);
  const runtimeSecs = engine?.startedAt ? secondsSince(engine.startedAt) : null;
  const isPaused = engine?.status === "paused";
  const isRunning = engine?.status === "running";

  /* eslint-disable react-hooks/purity */
  const lockSecondsLeft =
    workerLock?.status === "active"
      ? Math.max(0, Math.floor((new Date(workerLock.expiresAt).getTime() - Date.now()) / 1000))
      : null;
  /* eslint-enable react-hooks/purity */

  return (
    <div className="space-y-10">
      {/* ── Stale / error banner ─────────────────────────────────────── */}
      {(isStale || error) && (
        <div className="rounded-lg border border-yellow-900/50 bg-yellow-950/30 px-4 py-2 text-[11px] text-yellow-400">
          {error ?? "Realtime admin metrics delayed."}
        </div>
      )}

      {/* ── Section W: Operations Health (Watchdog) ──────────────────── */}
      <section>
        <SectionHeading id="operations-health">Operations Health</SectionHeading>
        <div className="space-y-3">
          <OverallStatusBanner watchdog={watchdog} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <SignalCard signal={watchdog.signals.lock} />
            <SignalCard signal={watchdog.signals.progress} />
            <SignalCard signal={watchdog.signals.pointer} />
            <SignalCard signal={watchdog.signals.storage} />
            <SignalCard signal={watchdog.signals.config} />
          </div>
        </div>
      </section>

      {/* ── Section A: Engine Status ──────────────────────────────────── */}
      <section>
        <SectionHeading id="engine-status">Engine Status</SectionHeading>
        <Card>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[
              { label: "Current Number", value: fmtN(engine?.currentNumber) },
              { label: "Total Checked", value: fmtN(engine?.totalChecked) },
              {
                label: "Throughput",
                value: engine?.throughputPerSecond != null
                  ? `${fmtN(engine.throughputPerSecond)} /s`
                  : "—",
              },
              { label: "Status", value: engine?.status ?? "Unknown" },
              { label: "Highest Peak", value: fmtN(engine?.highestPeak) },
              { label: "Longest Steps", value: fmtN(engine?.longestSteps) },
              {
                label: "Last Heartbeat",
                value: hbAge != null ? `${formatDuration(hbAge)} ago` : "—",
                valueClass:
                  hbStatus === "live"
                    ? "text-green-400"
                    : hbStatus === "delayed"
                    ? "text-yellow-400"
                    : "text-red-400",
              },
              { label: "Workers Active", value: String(engine?.workersActive ?? 0) },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-slate-950/50 px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">
                  {item.label}
                </p>
                <p className={`mt-1 text-lg font-bold tabular-nums ${item.valueClass ?? "text-slate-100"}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {engine?.lastError && (
            <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3">
              <p className="text-[10px] font-semibold text-red-400">Last engine error</p>
              <p className="mt-0.5 text-xs text-red-300/70">{engine.lastError}</p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
            <span className="self-center mr-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Controls:
            </span>
            <form action={pauseEngineFormAction}>
              <button
                type="submit"
                disabled={isPaused}
                className="rounded-lg border border-yellow-800 px-3 py-1.5 text-[11px] font-medium text-yellow-400 hover:bg-yellow-950 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
              >
                Pause Engine
              </button>
            </form>
            <form action={resumeEngineFormAction}>
              <button
                type="submit"
                disabled={isRunning}
                className="rounded-lg border border-teal-800 px-3 py-1.5 text-[11px] font-medium text-teal-400 hover:bg-teal-950 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
              >
                Resume Engine
              </button>
            </form>
            <span className="rounded-lg border border-slate-800 px-3 py-1.5 text-[11px] text-slate-700">
              Restart Worker — manual/local worker required
            </span>
            <DisabledButton label="Stop Engine" phase="Phase 3" />
          </div>
        </Card>
      </section>

      {/* ── Section A2: Worker Lock ───────────────────────────────────── */}
      <section>
        <SectionHeading id="worker-lock">Worker Lock</SectionHeading>
        <Card>
          {!lockTableExists ? (
            <div className="rounded-xl border border-yellow-900/50 bg-yellow-950/30 px-4 py-3">
              <p className="text-[11px] text-yellow-400">
                Worker lock table not found. Run{" "}
                <span className="font-mono">supabase/phase-2b-worker-lock.sql</span> in the
                Supabase SQL Editor.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <LockStatusPill status={workerLock?.status ?? null} />
                  {lockSecondsLeft != null && (
                    <span className="text-[10px] text-slate-500">
                      expires in{" "}
                      <span className={lockSecondsLeft < 10 ? "font-bold text-red-400" : "text-slate-400"}>
                        {lockSecondsLeft}s
                      </span>
                    </span>
                  )}
                </div>
                <form action={forceReleaseLockFormAction}>
                  <button
                    type="submit"
                    disabled={!workerLock || workerLock.status !== "active"}
                    className="rounded-lg border border-red-800 px-3 py-1.5 text-[11px] font-medium text-red-400 hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                  >
                    Force Release Lock
                  </button>
                </form>
              </div>

              {workerLock ? (
                <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 sm:grid-cols-3 text-[11px]">
                  {(
                    [
                      ["Instance ID", workerLock.workerInstanceId],
                      ["Hostname", workerLock.hostname ?? "—"],
                      ["PID", workerLock.pid != null ? String(workerLock.pid) : "—"],
                      ["Acquired at", new Date(workerLock.acquiredAt).toUTCString()],
                      ["Last heartbeat", new Date(workerLock.heartbeatAt).toUTCString()],
                      ["Expires at", new Date(workerLock.expiresAt).toUTCString()],
                      ["Status", workerLock.status],
                      [
                        "Released at",
                        workerLock.releasedAt
                          ? new Date(workerLock.releasedAt).toUTCString()
                          : "—",
                      ],
                    ] as [string, string][]
                  ).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between border-b border-slate-800/50 py-1"
                    >
                      <span className="text-slate-600">{k}</span>
                      <span className="break-all text-right font-mono text-slate-300">{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-600">
                  No lock history found — no worker has run since the migration.
                </p>
              )}

              {workerLock?.status === "active" && isPaused && (
                <div className="mt-4 rounded-xl border border-yellow-900/50 bg-yellow-950/30 px-4 py-3">
                  <p className="text-[11px] text-yellow-400">
                    Engine is paused but a worker lock is active. The worker is idle but holds the
                    lock. This is normal.
                  </p>
                </div>
              )}
              {workerLock?.status === "expired" && (
                <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3">
                  <p className="text-[11px] text-red-400">
                    Last lock expired without a clean release. A new worker can start freely.
                  </p>
                </div>
              )}

              <p className="mt-3 text-[10px] text-slate-700">
                Only one worker may run globally. TTL: 30s · Heartbeat: every 10s.
                Force release only if the worker is confirmed stopped.
              </p>
            </>
          )}
        </Card>
      </section>

      {/* ── Section B: Key Metrics ────────────────────────────────────── */}
      <section>
        <SectionHeading id="key-metrics">Key Metrics</SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Checked", value: fmtN(engine?.totalChecked) },
            { label: "Longest Sequence", value: fmtN(engine?.longestSteps) },
            { label: "Highest Peak", value: fmtN(engine?.highestPeak) },
            {
              label: "Throughput Avg",
              value:
                engine?.throughputPerSecond != null
                  ? `${fmtN(engine.throughputPerSecond)}/s`
                  : "—",
            },
            {
              label: "Runtime",
              value: runtimeSecs != null ? formatDuration(runtimeSecs) : "—",
            },
            {
              label: "Storage Used",
              value: formatBytes(storage?.estimatedUsedBytes ?? 0),
            },
            {
              label: "Storage %",
              value: `${storage?.percentUsed ?? 0}%`,
            },
            {
              label: "Archive Status",
              value: r2?.config.archiveEnabled ? "Enabled" : "Disabled",
            },
          ].map((item) => (
            <Card key={item.label} className="!p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">
                {item.label}
              </p>
              <p className="mt-1.5 text-xl font-bold tabular-nums text-slate-100">
                {item.value}
              </p>
              <div className="mt-2 h-6 rounded bg-slate-800/50" aria-hidden />
            </Card>
          ))}
        </div>
      </section>

      {/* ── Section C: Throughput Graph ───────────────────────────────── */}
      <section>
        <SectionHeading id="throughput">Throughput Graph</SectionHeading>
        <Card className="!p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-300">Numbers / second over time</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-600">{throughput.length} points</span>
              {!isStale && !error && (
                <span className="flex items-center gap-1 text-[9px] text-teal-600">
                  <span className="h-1 w-1 rounded-full bg-teal-500 animate-pulse" />
                  live
                </span>
              )}
            </div>
          </div>
          <ThroughputChart data={throughput} />
        </Card>
      </section>

      {/* ── Section D: Activity Log ───────────────────────────────────── */}
      <section>
        <SectionHeading id="activity-log">Activity Log</SectionHeading>
        <Card className="!p-0 overflow-hidden">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Filter:</span>
            {["all", "error", "warning", "milestone", "heartbeat", "cleanup", "range_summary"].map((f) => (
              <button
                key={f}
                onClick={() => setActivityFilter(f)}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                  activityFilter === f
                    ? "bg-teal-500/15 text-teal-400"
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                {f === "all" ? "All" : f.replace(/_/g, " ")}
              </button>
            ))}
            <span className="ml-auto text-[9px] text-slate-700">{activity.length} entries</span>
          </div>

          {activity.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-slate-600">No activity log entries yet</p>
            </div>
          ) : (
            <div className="max-h-80 divide-y divide-slate-800/60 overflow-y-auto">
              {activity
                .filter((e) => activityFilter === "all" || e.event_type.toLowerCase().includes(activityFilter))
                .map((entry, i) => {
                  const badge = eventBadgeColors(entry.event_type);
                  return (
                    <div key={entry.id ?? i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-800/20 transition-colors">
                      <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono font-medium ${badge.bg} ${badge.text}`}>
                        {entry.event_type}
                      </span>
                      <span className="flex-1 text-[11px] text-slate-400">{entry.message}</span>
                      <div className="shrink-0 text-right">
                        {entry.numbers_per_second != null && (
                          <p className="text-[9px] tabular-nums text-teal-600">
                            {entry.numbers_per_second.toLocaleString("en-US")}/s
                          </p>
                        )}
                        <p className="text-[9px] tabular-nums text-slate-700">
                          {new Date(entry.created_at).toUTCString().slice(5, 22)}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      </section>

      {/* Live polling note */}
      <p className="text-center text-[10px] text-slate-700">
        Live data · polling every 5 s
        {data?.fetchedAt && (
          <> · last updated {new Date(data.fetchedAt).toLocaleTimeString()}</>
        )}
      </p>
    </div>
  );
}
