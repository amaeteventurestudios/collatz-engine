import Link from "next/link";
import { getEngineAdminState, getDbRuntimeConfig, getWorkerLockState } from "@/lib/admin/metrics";
import { MODE_PRESETS, secondsSince, formatDuration, heartbeatStatus } from "@/lib/admin/engine";
import { PanelHelp } from "@/components/ui/PanelHelp";
import {
  pauseEngineFormAction,
  resumeEngineFormAction,
  applyRecoveryModeFormAction,
  applySafeModeFormAction,
  applyNormalModeFormAction,
} from "../../actions";

export const dynamic = "force-dynamic";

function SectionHeading({ id, children, help }: {
  id?: string; children: React.ReactNode; help?: React.ReactNode;
}) {
  return (
    <h2 id={id} className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-teal-500">
      <span className="h-px flex-1 bg-slate-800" />
      <span className="flex shrink-0 items-center gap-1.5">{children}{help}</span>
      <span className="h-px flex-1 bg-slate-800" />
    </h2>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-800 bg-slate-900 p-5 ${className}`}>{children}</div>;
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? "unknown").toLowerCase();
  if (s === "running") return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-green-400">
      <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /> Running
    </span>
  );
  if (s === "paused") return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-yellow-400">
      ⏸ Paused
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400">
      ◌ {status ?? "Unknown"}
    </span>
  );
}

export default async function EngineControlPage() {
  const [engineResult, dbConfig, workerLockResult] = await Promise.all([
    getEngineAdminState(),
    getDbRuntimeConfig(),
    getWorkerLockState(),
  ]);

  const engine = engineResult.data;
  const runtime = dbConfig.data ?? {
    mode: "recovery", batchSize: 25, batchDelayMs: 10000, logIntervalMs: 60000,
    storageMode: "free-tier", keepRecentResults: 1000, activityLogRetentionRows: 250,
    rangeSummaryInterval: 100000, milestoneInterval: 1000000,
    autoThrottleEnabled: true, pauseOnCriticalStorage: true,
  };
  const runtimeConfigExists = dbConfig.exists;
  const hbAge = secondsSince(engine?.lastHeartbeat);
  const hbStatus = heartbeatStatus(hbAge);
  const isPaused = engine?.status === "paused";
  const isRunning = engine?.status === "running";
  const runtimeSecs = engine?.startedAt ? secondsSince(engine.startedAt) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">Engine Control</h1>
            <PanelHelp
              title="Engine Control"
              description="Safely monitor and control the Collatz computation engine."
              details="This page shows live engine state, worker lock, runtime configuration, and mode controls. Dangerous actions require confirmation."
              operatorNote="Do not pause or change modes without a reason. The engine running on Hetzner should remain undisturbed unless there is an operational issue."
            />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">Engine status, runtime config, worker modes, guardrails</p>
        </div>
        <Link href="/admin" className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
          ← Overview
        </Link>
      </div>

      {/* Section 1: Engine Status */}
      <section>
        <SectionHeading id="engine-status">
          Engine Status
          <PanelHelp
            title="Engine Status"
            description="Shows what number the engine is currently computing, processing speed, uptime, and heartbeat freshness."
            source="collatz_engine_state table, polled on page load."
            operatorNote="This is a snapshot from page load. Use the Overview for live-polling status."
          />
        </SectionHeading>
        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <StatusBadge status={engine?.status ?? null} />
            {hbAge != null && (
              <span className={`text-[11px] ${hbStatus === "live" ? "text-green-400" : hbStatus === "delayed" ? "text-yellow-400" : "text-red-400"}`}>
                Heartbeat {hbAge}s ago
              </span>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "current_number",       value: engine?.currentNumber?.toLocaleString("en-US") ?? "—" },
              { label: "last_checked_number",  value: engine?.lastProcessed?.toLocaleString("en-US") ?? "—" },
              { label: "total_checked",        value: engine?.totalChecked?.toLocaleString("en-US") ?? "—" },
              { label: "Throughput",           value: engine?.throughputPerSecond != null ? `${engine.throughputPerSecond.toLocaleString("en-US")} /s` : "—" },
              { label: "Uptime",               value: runtimeSecs != null ? formatDuration(runtimeSecs) : "—" },
              { label: "Last Heartbeat",       value: hbAge != null ? `${hbAge}s ago` : "—",
                color: hbStatus === "live" ? "text-green-400" : hbStatus === "delayed" ? "text-yellow-400" : "text-red-400" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-slate-950/50 px-4 py-3">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">{item.label}</p>
                <p className={`mt-1 text-sm font-semibold tabular-nums ${item.color ?? "text-slate-200"}`}>{item.value}</p>
              </div>
            ))}
          </div>
          {engine?.lastError && (
            <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3">
              <p className="text-[10px] font-semibold text-red-400">Last engine error</p>
              <p className="mt-0.5 text-xs text-red-300/70">{engine.lastError}</p>
            </div>
          )}
        </Card>
      </section>

      {/* Section 2: Engine Actions */}
      <section>
        <SectionHeading id="engine-actions">
          Engine Actions
          <PanelHelp
            title="Engine Actions"
            description="Pause or resume the engine. These actions write to the engine state table and are picked up by the worker on its next iteration."
            warning="Pause stops new batch processing. It does not delete data or stop the server process. The worker on Hetzner must still be running to respond to resume."
            operatorNote="Use pause only when investigating an operational issue. Do not pause without a specific reason."
          />
        </SectionHeading>
        <Card>
          <div className="mb-4 rounded-xl border border-orange-900/30 bg-orange-950/10 px-4 py-3">
            <p className="text-[11px] text-orange-300/80">
              Engine actions write to the database. The Hetzner worker picks up changes on its next iteration.
              Do not use these controls routinely — only when investigating an operational issue.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <form action={pauseEngineFormAction}>
              <button
                type="submit"
                disabled={isPaused}
                className="rounded-lg border border-yellow-800 px-4 py-2 text-[11px] font-semibold text-yellow-400 transition-colors hover:bg-yellow-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Pause Engine
              </button>
            </form>
            <form action={resumeEngineFormAction}>
              <button
                type="submit"
                disabled={isRunning}
                className="rounded-lg border border-teal-800 px-4 py-2 text-[11px] font-semibold text-teal-400 transition-colors hover:bg-teal-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Resume Engine
              </button>
            </form>
            <span className="self-center rounded-lg border border-slate-800 px-4 py-2 text-[11px] text-slate-600">
              Restart Worker — manual on Hetzner server
            </span>
          </div>
        </Card>
      </section>

      {/* Section 3: Runtime Config */}
      <section>
        <SectionHeading id="runtime-config">
          Runtime Config
          <PanelHelp
            title="Runtime Config"
            description="Shows the active batch size, delay, storage mode, and retention settings that control how the engine operates."
            source={runtimeConfigExists ? "collatz_engine_runtime_config table (live database config)." : "Environment variable defaults (no database config table found)."}
          />
        </SectionHeading>
        <Card>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3 text-[11px]">
            {[
              ["mode",                       runtime.mode],
              ["batch_size",                 String(runtime.batchSize)],
              ["batch_delay_ms",             String(runtime.batchDelayMs)],
              ["log_interval_ms",            String(runtime.logIntervalMs)],
              ["storage_mode",               runtime.storageMode],
              ["keep_recent_results",        String(runtime.keepRecentResults)],
              ["activity_log_retention_rows", String(runtime.activityLogRetentionRows)],
              ["range_summary_interval",     String(runtime.rangeSummaryInterval)],
              ["milestone_interval",         String(runtime.milestoneInterval)],
              ["auto_throttle_enabled",      String(runtime.autoThrottleEnabled)],
              ["pause_on_critical_storage",  String(runtime.pauseOnCriticalStorage)],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-slate-800/50 py-1.5">
                <span className="font-mono text-slate-600">{k}</span>
                <span className="font-semibold text-slate-300">{v}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-slate-600">
            Source: {runtimeConfigExists ? "database config table (live)" : "environment variable defaults"}.
            {runtime.updatedAt ? ` Last updated: ${runtime.updatedAt}` : ""}
          </p>
        </Card>
      </section>

      {/* Section 4: Worker Modes */}
      <section>
        <SectionHeading id="worker-modes">
          Worker Modes
          <PanelHelp
            title="Worker Modes"
            description="Presets that control batch size and processing speed. Recovery is slowest and safest. Normal is fastest."
            warning="Mode changes adjust how aggressively the worker processes batches. Use Recovery mode when storage pressure is high or when investigating issues."
            operatorNote="Only change modes intentionally. Normal mode generates more write pressure on Supabase."
          />
        </SectionHeading>
        <div className="grid gap-4 lg:grid-cols-3">
          {(Object.entries(MODE_PRESETS) as [string, { batchSize: number; batchDelayMs: number; logIntervalMs: number }][]).map(([name, preset]) => {
            const isCurrent = runtime.batchSize === preset.batchSize && runtime.batchDelayMs === preset.batchDelayMs;
            const modeDesc: Record<string, string> = {
              recovery: "Smallest batches, longest delay. Use when investigating issues or under storage pressure.",
              safe: "Balanced batch size and delay. Good for steady operation under normal conditions.",
              normal: "Largest batches, shortest delay. Fastest throughput but highest write pressure.",
            };
            return (
              <Card key={name} className={isCurrent ? "!border-teal-600/50 !bg-teal-950/20" : ""}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold capitalize text-slate-100">{name}</p>
                  {isCurrent && (
                    <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold text-teal-400">Active</span>
                  )}
                </div>
                <p className="mb-3 text-[11px] leading-relaxed text-slate-500">{modeDesc[name]}</p>
                <div className="space-y-1.5 text-[11px]">
                  {[
                    ["batch_size", String(preset.batchSize)],
                    ["batch_delay_ms", String(preset.batchDelayMs)],
                    ["log_interval_ms", String(preset.logIntervalMs)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-slate-600">{k}</span>
                      <span className="tabular-nums text-slate-300">{v}</span>
                    </div>
                  ))}
                </div>
                {runtimeConfigExists ? (
                  <form action={name === "recovery" ? applyRecoveryModeFormAction : name === "safe" ? applySafeModeFormAction : applyNormalModeFormAction}>
                    <button
                      type="submit"
                      disabled={isCurrent}
                      className="mt-4 w-full rounded-lg border border-teal-800 px-3 py-1.5 text-[11px] font-medium text-teal-400 transition-colors hover:bg-teal-950 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isCurrent ? `${name} active` : `Apply ${name}`}
                    </button>
                  </form>
                ) : (
                  <button disabled className="mt-4 w-full cursor-not-allowed rounded-lg border border-slate-700 px-3 py-1.5 text-[11px] text-slate-600 opacity-50">
                    Needs config table
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section 5: Guardrails */}
      <section>
        <SectionHeading id="guardrails">
          Guardrails
          <PanelHelp
            title="Guardrails"
            description="Active safety mechanisms that prevent duplicate computation, data corruption, and runaway storage growth."
            source="Worker lock: collatz_worker_lock table. Sequential pointer: engine state. Storage cap: computed from row counts."
          />
        </SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: "Worker Lock",
              status: workerLockResult.tableExists ? (workerLockResult.data?.status === "active" ? "active" : "present") : "missing",
              ok: workerLockResult.tableExists,
              desc: "Database-backed lock prevents two workers from running simultaneously.",
            },
            {
              label: "Sequential Verifier",
              status: "available",
              ok: true,
              desc: "npm run collatz:verify checks pointer and sequential continuity.",
            },
            {
              label: "Storage Cap",
              status: runtime.pauseOnCriticalStorage ? "enabled" : "disabled",
              ok: runtime.pauseOnCriticalStorage,
              desc: "Auto-pauses the engine when storage reaches the critical threshold.",
            },
            {
              label: "Auto-Throttle",
              status: runtime.autoThrottleEnabled ? "enabled" : "disabled",
              ok: runtime.autoThrottleEnabled,
              desc: "Reduces batch size automatically when storage pressure rises.",
            },
            {
              label: "Sampled Log Handling",
              status: "active",
              ok: true,
              desc: "Activity logs are sampled to prevent log table overflow.",
            },
            {
              label: "No Duplicate Workers",
              status: workerLockResult.tableExists ? "enforced via lock" : "lock table missing",
              ok: workerLockResult.tableExists,
              desc: "Worker lock ensures only one active worker at a time.",
            },
          ].map((g) => (
            <div key={g.label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-300">{g.label}</p>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                  g.ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                }`}>
                  {g.status}
                </span>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-600">{g.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
