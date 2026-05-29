import Link from "next/link";
import { getEngineAdminState, getRecentActivityLogs, getThroughputHistory, getDbRuntimeConfig, getWorkerLockState } from "@/lib/admin/metrics";
import { getStorageMonitor, formatBytes } from "@/lib/admin/storage";
import { getR2Status } from "@/lib/admin/r2";
import { MODE_PRESETS, secondsSince, formatDuration, heartbeatStatus } from "@/lib/admin/engine";
import {
  logoutAction,
  applyRecoveryModeFormAction,
  applySafeModeFormAction,
  applyNormalModeFormAction,
  runCleanupFormAction,
} from "../actions";
import type { StorageStatus, TableSizeRow, AdminMetricsApiResponse } from "@/lib/admin/types";
import { AdminLiveMetrics } from "@/components/admin/AdminLiveMetrics";

export const dynamic = "force-dynamic";

// ── Helpers ──────────────────────────────────────────────────────────────────

function utcNow() {
  return new Date().toUTCString();
}

function statusPill(status: string | null) {
  const s = (status ?? "unknown").toLowerCase();
  if (s === "running")
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />Running</span>;
  if (s === "paused")
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-yellow-400">⏸ Paused</span>;
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400">◌ {status ?? "Unknown"}</span>;
}

function storageStatusColor(s: StorageStatus): string {
  if (s === "safe") return "text-green-400";
  if (s === "watch") return "text-teal-400";
  if (s === "warning") return "text-yellow-400";
  if (s === "critical") return "text-orange-400";
  return "text-red-400";
}

function storageBarColor(s: StorageStatus): string {
  if (s === "safe") return "bg-green-500";
  if (s === "watch") return "bg-teal-500";
  if (s === "warning") return "bg-yellow-500";
  if (s === "critical") return "bg-orange-500";
  return "bg-red-500";
}

function storageLabel(s: StorageStatus): string {
  if (s === "safe") return "Safe";
  if (s === "watch") return "Watch";
  if (s === "warning") return "Warning";
  if (s === "critical") return "Critical";
  return "Pause Required";
}

function n(v: number | null | undefined, fallback = "—"): string {
  if (v == null) return fallback;
  return v.toLocaleString("en-US");
}

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

// ThroughputChart moved to AdminLiveMetrics (client component)

// ── Storage gauge ─────────────────────────────────────────────────────────────

function StorageGauge({ percent, status }: { percent: number; status: StorageStatus }) {
  const r = 52;
  const cx = 64;
  const cy = 64;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(percent / 100, 1) * circ * 0.75; // 270° arc
  const strokeColor =
    status === "safe" ? "#22c55e" :
    status === "watch" ? "#14b8a6" :
    status === "warning" ? "#eab308" :
    status === "critical" ? "#f97316" : "#ef4444";

  return (
    <svg viewBox="0 0 128 128" className="h-28 w-28">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={10}
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
        strokeDashoffset={circ * 0.125}
        strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
      />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={strokeColor} strokeWidth={10}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ * 0.125}
        strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#f1f5f9" fontSize={18} fontWeight={700}>
        {percent.toFixed(1)}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize={7}>
        used
      </text>
    </svg>
  );
}

// ── Table size row ────────────────────────────────────────────────────────────

function TableSizeEntry({ row }: { row: TableSizeRow }) {
  const statusColor =
    !row.exists ? "text-slate-600" :
    row.status === "large" ? "text-orange-400" :
    row.status === "growing" ? "text-yellow-400" : "text-green-400";

  return (
    <tr className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
      <td className="py-2 pr-4 text-[11px] font-mono text-slate-300">{row.tableName}</td>
      <td className="py-2 pr-4 text-[11px] tabular-nums text-slate-400">
        {row.estimatedBytes != null ? formatBytes(row.estimatedBytes) : "—"}
        {!row.exists && <span className="ml-1 text-slate-600 text-[10px]">(not created)</span>}
      </td>
      <td className="py-2 pr-4 text-[11px] tabular-nums text-slate-400">
        {row.estimatedRows != null ? n(row.estimatedRows) : "—"}
      </td>
      <td className="py-2 pr-4 text-[11px] tabular-nums text-slate-400">
        {row.percentOfTracked != null ? `${row.percentOfTracked}%` : "—"}
      </td>
      <td className={`py-2 text-[11px] font-medium ${statusColor}`}>
        {!row.exists ? "Not created" : row.status === "large" ? "Large" : "OK"}
      </td>
    </tr>
  );
}

// ── Health indicator ──────────────────────────────────────────────────────────

function HealthDot({ ok, label }: { ok: boolean | null; label: string }) {
  const color = ok == null ? "bg-slate-600" : ok ? "bg-green-500" : "bg-red-500";
  const text = ok == null ? "Not checked" : ok ? "Operational" : "Error";
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2">
      <span className="text-[11px] text-slate-400">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        <span className={`text-[10px] font-medium ${ok == null ? "text-slate-600" : ok ? "text-green-400" : "text-red-400"}`}>{text}</span>
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const [engineResult, storageData, r2Data, throughputData, activityData, dbConfigResult, workerLockResult] =
    await Promise.all([
      getEngineAdminState(),
      getStorageMonitor(),
      getR2Status(),
      getThroughputHistory(40),
      getRecentActivityLogs(15),
      getDbRuntimeConfig(),
      getWorkerLockState(),
    ]);

  const engine = engineResult.data;
  const runtime = dbConfigResult.data ?? {
    mode: "recovery", batchSize: 25, batchDelayMs: 10000, logIntervalMs: 60000,
    storageMode: "free-tier", keepRecentResults: 1000, activityLogRetentionRows: 250,
    rangeSummaryInterval: 100000, milestoneInterval: 1000000,
    autoThrottleEnabled: true, pauseOnCriticalStorage: true,
  };
  const runtimeConfigExists = dbConfigResult.exists;
  const hbAge = secondsSince(engine?.lastHeartbeat);
  const hbStatus = heartbeatStatus(hbAge);
  const isRunning = engine?.status === "running";

  // Initial data passed to the live client component (hydrates then polls)
  const initialLiveData: AdminMetricsApiResponse = {
    engine: engineResult.data,
    engineConnected: engineResult.connected,
    engineError: engineResult.error,
    storage: storageData,
    r2: r2Data,
    throughput: throughputData.data,
    activity: activityData.data,
    workerLock: workerLockResult.data,
    lockTableExists: workerLockResult.tableExists,
    fetchedAt: new Date().toISOString(),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-10">

      {/* ── Page header ───────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Admin Overview</h1>
          <p className="mt-0.5 text-sm text-slate-500">Mission control for The Collatz Engine</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] text-slate-600">{utcNow()}</span>
          <form action={logoutAction}>
            <button type="submit" className="rounded-lg border border-slate-700 px-3 py-1.5 text-[11px] text-slate-500 hover:border-red-800 hover:text-red-400 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* ── Sections A, A2, B, C — live client component ── */}
      <AdminLiveMetrics initial={initialLiveData} />

      {/* ── Section D: Database Storage Monitor ──────── */}
      <section>
        <SectionHeading id="storage-monitor">Database Storage Monitor</SectionHeading>
        <Card>
          <div className="flex flex-wrap items-center gap-8">
            <StorageGauge percent={storageData.percentUsed} status={storageData.status} />

            <div className="flex-1 min-w-48 space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-[10px]">
                  <span className="text-slate-500">Estimated usage</span>
                  <span className={`font-bold ${storageStatusColor(storageData.status)}`}>
                    {storageLabel(storageData.status)}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-800">
                  <div
                    className={`h-3 rounded-full transition-all ${storageBarColor(storageData.status)}`}
                    style={{ width: `${Math.min(storageData.percentUsed, 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-slate-600">
                  <span>{formatBytes(storageData.estimatedUsedBytes)}</span>
                  <span>{formatBytes(storageData.limitBytes)} limit</span>
                </div>
              </div>

              {/* Threshold legend */}
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                {[
                  { label: "Safe", range: "< 1.2 GB", color: "bg-green-500" },
                  { label: "Watch", range: "1.2–1.5 GB", color: "bg-teal-500" },
                  { label: "Warning", range: "1.5–1.8 GB", color: "bg-yellow-500" },
                  { label: "Critical", range: "1.8–1.9 GB", color: "bg-orange-500" },
                  { label: "Pause", range: "> 1.9 GB", color: "bg-red-500" },
                ].map((t) => (
                  <div key={t.label} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${t.color}`} />
                    <span className="text-slate-500">{t.label}</span>
                    <span className="text-slate-700">{t.range}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {storageData.status !== "safe" && storageData.status !== "watch" && (
            <div className="mt-4 rounded-xl border border-yellow-900/50 bg-yellow-950/30 px-4 py-3">
              <p className="text-[11px] font-semibold text-yellow-400">
                Storage {storageLabel(storageData.status)} — consider running archive/cleanup
              </p>
              <p className="mt-0.5 text-[10px] text-yellow-400/60">
                Archive and cleanup actions are available in Phase 2.
              </p>
            </div>
          )}

          <p className="mt-3 text-[10px] text-slate-700">
            Supabase free tier: 2 GB limit. Estimates based on row counts × avg row size.
            Exact pg_statio metrics available after Phase 2 RPC setup.
          </p>
        </Card>
      </section>

      {/* ── Section E: Table Size Estimates ──────────── */}
      <section>
        <SectionHeading id="table-sizes">Table Size Estimates</SectionHeading>
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50">
                  {["Table", "Est. Size", "Rows", "% of Tracked", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="px-4">
                {storageData.tableRows.map((row) => (
                  <TableSizeEntry key={row.tableName} row={row} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-800 px-4 py-2 text-[10px] text-slate-700">
            Fetched at {storageData.fetchedAt}
          </p>
        </Card>
      </section>

      {/* ── Section F: Supabase Health ────────────────── */}
      <section>
        <SectionHeading id="supabase-health">Supabase Health</SectionHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <p className="mb-3 text-xs font-semibold text-slate-300">Connection</p>
            <div className="space-y-2">
              <HealthDot ok={engineResult.connected} label="Database Connected" />
              <HealthDot ok={engineResult.connected} label="Engine State Readable" />
              <HealthDot ok={null} label="CPU / Memory" />
              <HealthDot ok={null} label="Disk IO" />
            </div>
            {engineResult.error && (
              <p className="mt-3 text-[10px] text-red-400">Error: {engineResult.error}</p>
            )}
            {engineResult.lastSuccessfulRead && (
              <p className="mt-2 text-[10px] text-slate-600">
                Last read: {engineResult.lastSuccessfulRead}
              </p>
            )}
          </Card>
          <Card>
            <p className="mb-3 text-xs font-semibold text-slate-300">Metrics</p>
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
              <p className="text-[11px] text-slate-500">
                {process.env.SUPABASE_METRICS_ENABLED === "true"
                  ? "Supabase metrics configured — CPU/memory/disk available."
                  : "Supabase metrics not configured (SUPABASE_METRICS_ENABLED=false). Table-size estimates are used instead."}
              </p>
              <p className="mt-2 text-[10px] text-slate-700">
                Set SUPABASE_METRICS_ENABLED, SUPABASE_METRICS_USERNAME, SUPABASE_METRICS_PASSWORD to enable.
              </p>
            </div>
            <div className="mt-3">
              <p className="mb-2 text-[10px] text-slate-600">Storage state</p>
              <span className={`text-sm font-bold ${storageStatusColor(storageData.status)}`}>
                {storageLabel(storageData.status)}
              </span>
            </div>
          </Card>
        </div>
      </section>

      {/* ── Section G: Cloudflare R2 ──────────────────── */}
      <section>
        <SectionHeading id="r2">Cloudflare R2</SectionHeading>
        <Card>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { label: "R2 Configured", value: r2Data.config.configured ? "Yes" : "No", ok: r2Data.config.configured },
              { label: "Bucket Name", value: r2Data.config.bucketName ?? "Not set" },
              { label: "Endpoint", value: r2Data.config.endpointConfigured ? "Set" : "Not set", ok: r2Data.config.endpointConfigured },
              { label: "Public Base URL", value: r2Data.config.publicBaseUrlConfigured ? "Set" : "Not set" },
              { label: "Archive Enabled", value: r2Data.config.archiveEnabled ? "Yes" : "No" },
              { label: "Archive Format", value: r2Data.config.archiveFormat ?? "json" },
              { label: "Delete After Upload", value: r2Data.config.deleteAfterUpload ? "Yes" : "No" },
              { label: "Last Connection Check", value: r2Data.connectionCheckedAt ?? "Not checked" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-slate-950/50 px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">{item.label}</p>
                <p className={`mt-1 text-sm font-semibold ${
                  item.ok === true ? "text-green-400" :
                  item.ok === false ? "text-red-400" : "text-slate-300"
                }`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2 border-t border-slate-800 pt-4">
            <DisabledButton label="Test R2 Connection" phase="Phase 2" />
            <span className="text-[10px] text-slate-700 self-center ml-2">
              Live bucket check available in Phase 2
            </span>
          </div>
        </Card>
      </section>

      {/* ── Section H: Runtime Config ─────────────────── */}
      <section>
        <SectionHeading id="runtime-config">Engine Control / Runtime Config</SectionHeading>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Preset cards */}
          {(Object.entries(MODE_PRESETS) as [string, typeof MODE_PRESETS.safe][]).map(([name, preset]) => {
            const isCurrent = runtime.batchSize === preset.batchSize && runtime.batchDelayMs === preset.batchDelayMs;
            return (
              <Card key={name} className={isCurrent ? "!border-teal-600/50 !bg-teal-950/20" : ""}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold capitalize text-slate-100">{name}</p>
                  {isCurrent && (
                    <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold text-teal-400">Active</span>
                  )}
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600">batch_size</span>
                    <span className="text-slate-300 tabular-nums">{preset.batchSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">batch_delay_ms</span>
                    <span className="text-slate-300 tabular-nums">{preset.batchDelayMs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">log_interval_ms</span>
                    <span className="text-slate-300 tabular-nums">{preset.logIntervalMs}</span>
                  </div>
                </div>
                {runtimeConfigExists ? (
                  <form action={name === "recovery" ? applyRecoveryModeFormAction : name === "safe" ? applySafeModeFormAction : applyNormalModeFormAction}>
                    <button
                      type="submit"
                      disabled={isCurrent}
                      className="mt-2 w-full rounded-lg border border-teal-800 px-3 py-1.5 text-[11px] font-medium text-teal-400 hover:bg-teal-950 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                    >
                      {isCurrent ? `${name} active` : `Apply ${name}`}
                    </button>
                  </form>
                ) : (
                  <DisabledButton label={`Apply ${name} (run migration first)`} phase="needs SQL" />
                )}
              </Card>
            );
          })}
        </div>

        {!runtimeConfigExists && (
          <div className="mt-3 rounded-xl border border-yellow-900/50 bg-yellow-950/30 px-4 py-3">
            <p className="text-[11px] text-yellow-400">
              Runtime config table not found. Run <span className="font-mono">supabase/phase-2a-storage-guardrails.sql</span> in the Supabase SQL Editor to enable live mode switching.
            </p>
          </div>
        )}

        {/* Current config table */}
        <Card className="mt-4">
          <p className="mb-3 text-xs font-semibold text-slate-300">Current Runtime Config (from env)</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 sm:grid-cols-3 text-[11px]">
            {[
              ["mode", runtime.mode],
              ["batch_size", String(runtime.batchSize)],
              ["batch_delay_ms", String(runtime.batchDelayMs)],
              ["log_interval_ms", String(runtime.logIntervalMs)],
              ["storage_mode", runtime.storageMode],
              ["keep_recent_results", String(runtime.keepRecentResults)],
              ["activity_log_retention_rows", String(runtime.activityLogRetentionRows)],
              ["range_summary_interval", String(runtime.rangeSummaryInterval)],
              ["milestone_interval", String(runtime.milestoneInterval)],
              ["auto_throttle_enabled", String(runtime.autoThrottleEnabled)],
              ["pause_on_critical_storage", String(runtime.pauseOnCriticalStorage)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-slate-800/50 py-1">
                <span className="font-mono text-slate-600">{k}</span>
                <span className="text-slate-300">{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* ── Section I: Archive / Retention ───────────── */}
      <section>
        <SectionHeading id="archive">Archive / Retention</SectionHeading>
        <Card>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-5">
            {[
              { label: "Archive Enabled", value: r2Data.config.archiveEnabled ? "Yes" : "No" },
              { label: "Archive Format", value: r2Data.config.archiveFormat ?? "json" },
              { label: "Delete After Upload", value: r2Data.config.deleteAfterUpload ? "Yes" : "No" },
              { label: "Keep Recent Results", value: String(runtime.keepRecentResults) },
              { label: "Activity Log Retention", value: `${runtime.activityLogRetentionRows} rows` },
              { label: "Last Archive Manifest", value: r2Data.lastManifest ?? "None" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">{item.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-300">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
            <form action={runCleanupFormAction}>
              <button
                type="submit"
                className="rounded-lg border border-orange-800 px-3 py-1.5 text-[11px] font-medium text-orange-400 hover:bg-orange-950 transition-colors"
              >
                Run Cleanup
              </button>
            </form>
            <DisabledButton label="Run Archive Export" phase="Phase 3" />
            <DisabledButton label="Run Maintenance" phase="Phase 3" />
            <span className="text-[10px] text-slate-600 self-center ml-1">
              Cleanup trims results to {runtime.keepRecentResults.toLocaleString()} rows · logs to {runtime.activityLogRetentionRows.toLocaleString()} rows
            </span>
          </div>
        </Card>
      </section>

      {/* ── Section J: Health / Errors ────────────────── */}
      <section>
        <SectionHeading id="health-errors">Health / Errors</SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-4">
          {[
            { label: "DB Timeouts 24h", value: "—" },
            { label: "Failed Writes 24h", value: "—" },
            { label: "Archive Failures 24h", value: "—" },
            {
              label: "Heartbeat Age",
              value: hbAge != null ? `${hbAge}s` : "—",
              color: hbStatus === "live" ? "text-green-400" : hbStatus === "delayed" ? "text-yellow-400" : "text-slate-400",
            },
            {
              label: "Storage State",
              value: storageLabel(storageData.status),
              color: storageStatusColor(storageData.status),
            },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">{card.label}</p>
              <p className={`mt-1 text-xl font-bold tabular-nums ${card.color ?? "text-slate-300"}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {activityData.data.length > 0 ? (
          <Card className="!p-0 overflow-hidden">
            <div className="border-b border-slate-800 px-4 py-3">
              <p className="text-xs font-semibold text-slate-400">Recent Activity Log</p>
            </div>
            <div className="divide-y divide-slate-800/60 max-h-64 overflow-y-auto">
              {activityData.data.map((entry, i) => (
                <div key={entry.id ?? i} className="flex items-start gap-3 px-4 py-2">
                  <span className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono bg-slate-800 text-slate-400">
                    {entry.event_type}
                  </span>
                  <span className="flex-1 text-[11px] text-slate-400">{entry.message}</span>
                  <span className="shrink-0 text-[9px] tabular-nums text-slate-700">
                    {new Date(entry.created_at).toUTCString().slice(5, 22)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-center">
            <p className="text-xs text-slate-600">No activity log entries yet</p>
          </div>
        )}
      </section>

      {/* ── Section K: Data Integrity ─────────────────── */}
      <section>
        <SectionHeading id="integrity">Data Integrity</SectionHeading>
        <Card>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-5">
            {[
              { label: "Last Integrity Check", value: "—" },
              { label: "Missing Ranges", value: "—" },
              { label: "Duplicate Records", value: "—" },
              { label: "Out-of-Order Records", value: "—" },
              { label: "Failed Writes", value: "—" },
              { label: "Integrity Score", value: "—" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">{item.label}</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-400">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
            <p className="text-[11px] text-slate-500">
              Full integrity checks available at{" "}
              <Link href="/admin/integrity/checks" className="text-teal-500 hover:underline">
                /admin/integrity/checks
              </Link>
              . Real-time integrity scan will be available in Phase 2.
            </p>
          </div>
        </Card>
      </section>

      {/* ── Section L: System Health Footer ──────────── */}
      <section>
        <SectionHeading id="system-health">System Health</SectionHeading>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <HealthDot ok={engineResult.connected} label="Supabase Database" />
          <HealthDot ok={null} label="Supabase Storage" />
          <HealthDot ok={true} label="Vercel Deployment" />
          <HealthDot ok={true} label="API Routes" />
          <HealthDot
            ok={engine?.status === "running" ? true : engine?.status != null ? false : null}
            label="Engine Worker"
          />
          <HealthDot ok={r2Data.config.configured ? null : false} label="Cloudflare R2" />
          <HealthDot ok={null} label="Cron Schedules" />
          <HealthDot ok={null} label="Archive Pipeline" />
        </div>
        <p className="mt-4 text-center text-[10px] text-slate-700">
          Phase 1 Admin Control Center — monitoring foundation. Engine controls, archive automation, and integrity scans arrive in Phase 2/3.
        </p>
      </section>

    </div>
  );
}
