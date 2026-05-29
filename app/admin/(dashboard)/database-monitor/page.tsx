import Link from "next/link";
import { getEngineAdminState } from "@/lib/admin/metrics";
import { getStorageMonitor, formatBytes } from "@/lib/admin/storage";
import { PanelHelp } from "@/components/ui/PanelHelp";
import type { StorageStatus, TableSizeRow } from "@/lib/admin/types";

export const dynamic = "force-dynamic";

// ── Shared helpers ────────────────────────────────────────────────────────────

function SectionHeading({ id, children, help }: {
  id?: string;
  children: React.ReactNode;
  help?: React.ReactNode;
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
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900 p-5 ${className}`}>
      {children}
    </div>
  );
}

function storageStatusColor(s: StorageStatus) {
  if (s === "safe") return "text-green-400";
  if (s === "watch") return "text-teal-400";
  if (s === "warning") return "text-yellow-400";
  if (s === "critical") return "text-orange-400";
  return "text-red-400";
}

function storageLabel(s: StorageStatus) {
  if (s === "safe") return "Safe";
  if (s === "watch") return "Watch";
  if (s === "warning") return "Warning";
  if (s === "critical") return "Critical";
  return "Pause Required";
}

function StorageGauge({ percent, status }: { percent: number; status: StorageStatus }) {
  const r = 52; const cx = 64; const cy = 64;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(percent / 100, 1) * circ * 0.75;
  const strokeColor =
    status === "safe" ? "#22c55e" : status === "watch" ? "#14b8a6" :
    status === "warning" ? "#eab308" : status === "critical" ? "#f97316" : "#ef4444";
  return (
    <svg viewBox="0 0 128 128" className="h-32 w-32">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={10}
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeDashoffset={circ * 0.125}
        strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={strokeColor} strokeWidth={10}
        strokeDasharray={`${filled} ${circ - filled}`} strokeDashoffset={circ * 0.125}
        strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 0.5s ease" }} />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#f1f5f9" fontSize={18} fontWeight={700}>
        {percent.toFixed(1)}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize={7}>used</text>
    </svg>
  );
}

function TableRow({ row }: { row: TableSizeRow }) {
  const statusColor = !row.exists ? "text-slate-600" :
    row.status === "large" ? "text-orange-400" :
    row.status === "growing" ? "text-yellow-400" : "text-green-400";
  const barPct = row.percentOfTracked ?? 0;
  return (
    <tr className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
      <td className="py-2.5 pr-4 font-mono text-[11px] text-slate-300">{row.tableName}</td>
      <td className="py-2.5 pr-4 text-[11px] tabular-nums text-slate-400">
        {row.estimatedBytes != null ? formatBytes(row.estimatedBytes) : "—"}
        {!row.exists && <span className="ml-1 text-[10px] text-slate-600">(not created)</span>}
      </td>
      <td className="py-2.5 pr-4 text-[11px] tabular-nums text-slate-400">
        {row.estimatedRows != null ? row.estimatedRows.toLocaleString("en-US") : "—"}
      </td>
      <td className="py-2.5 pr-4">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-slate-800">
            <div className="h-1.5 rounded-full bg-teal-500 transition-all" style={{ width: `${Math.min(barPct, 100)}%` }} />
          </div>
          <span className="text-[11px] tabular-nums text-slate-500">{row.percentOfTracked != null ? `${row.percentOfTracked}%` : "—"}</span>
        </div>
      </td>
      <td className={`py-2.5 text-[11px] font-medium ${statusColor}`}>
        {!row.exists ? "Not created" : row.status === "large" ? "Large" : row.status === "growing" ? "Growing" : "OK"}
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DatabaseMonitorPage() {
  const [storageData, engineResult] = await Promise.all([
    getStorageMonitor(),
    getEngineAdminState(),
  ]);

  const usedGb = storageData.estimatedUsedBytes / (1024 ** 3);
  const limitGb = storageData.limitBytes / (1024 ** 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">Database Monitor</h1>
            <PanelHelp
              title="Database Monitor"
              description="Tracks database size, table growth, and storage risk. Designed to warn before usage becomes dangerous."
              details="The most important values are total database size, collatz_results rows, and collatz_activity_logs rows — these two tables drive storage growth."
              source="Supabase row-count estimates × bytes-per-row constants."
              operatorNote="If storage hits Warning or above, run cleanup from Storage & Archive."
            />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">Storage health, table sizes, and database risk</p>
        </div>
        <Link href="/admin" className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
          ← Overview
        </Link>
      </div>

      {/* Section 1: Database Overview */}
      <section>
        <SectionHeading id="db-overview">
          Database Overview
          <PanelHelp
            title="Database Overview"
            description="Top-level storage health. Shows total usage against the 2 GB Supabase free-tier limit."
            source="getStorageMonitor() — row-count × bytes-per-row estimates."
          />
        </SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="flex flex-col items-center justify-center gap-2">
            <StorageGauge percent={storageData.percentUsed} status={storageData.status} />
            <p className={`text-sm font-bold ${storageStatusColor(storageData.status)}`}>
              {storageLabel(storageData.status)}
            </p>
          </Card>
          <Card>
            <div className="space-y-3">
              {[
                { label: "Estimated Used", value: formatBytes(storageData.estimatedUsedBytes), color: storageStatusColor(storageData.status) },
                { label: "Limit (free tier)", value: formatBytes(storageData.limitBytes) },
                { label: "Headroom", value: formatBytes(storageData.limitBytes - storageData.estimatedUsedBytes) },
                { label: "Status", value: storageLabel(storageData.status), color: storageStatusColor(storageData.status) },
                { label: "DB Connected", value: engineResult.connected ? "Yes" : "No", color: engineResult.connected ? "text-green-400" : "text-red-400" },
                { label: "Last Updated", value: storageData.fetchedAt },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                  <span className="text-[11px] text-slate-500">{row.label}</span>
                  <span className={`text-[11px] font-semibold tabular-nums ${row.color ?? "text-slate-300"}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <p className="mb-3 text-xs font-semibold text-slate-400">Storage Thresholds</p>
            <div className="space-y-2">
              {[
                { label: "Safe",     range: `< 1.2 GB`, color: "bg-green-500"  },
                { label: "Watch",    range: `1.2–1.5 GB`, color: "bg-teal-500"   },
                { label: "Warning",  range: `1.5–1.8 GB`, color: "bg-yellow-500" },
                { label: "Critical", range: `1.8–1.9 GB`, color: "bg-orange-500" },
                { label: "Pause",    range: `> 1.9 GB`,   color: "bg-red-500"    },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-2 text-[11px]">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${t.color}`} />
                  <span className="w-16 text-slate-400">{t.label}</span>
                  <span className="text-slate-600">{t.range}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[10px] text-slate-600">Supabase free tier: 2 GB limit.</p>
          </Card>
        </div>

        {storageData.status !== "safe" && storageData.status !== "watch" && (
          <div className="mt-4 rounded-xl border border-yellow-900/50 bg-yellow-950/30 px-4 py-3">
            <p className="text-[11px] font-semibold text-yellow-400">
              Storage {storageLabel(storageData.status)} — action may be required
            </p>
            <p className="mt-1 text-[10px] text-yellow-400/70">
              Used: {usedGb.toFixed(2)} GB of {limitGb.toFixed(0)} GB. Run cleanup from{" "}
              <Link href="/admin/storage-archive" className="underline hover:text-yellow-300">
                Storage & Archive
              </Link>.
            </p>
          </div>
        )}
      </section>

      {/* Section 2: Storage Gauges by Table */}
      <section>
        <SectionHeading id="storage-gauges">
          Storage by Table
          <PanelHelp
            title="Storage by Table"
            description="Estimated storage usage per table. collatz_results and collatz_activity_logs typically drive most growth."
            source="Row counts from Supabase × conservative bytes-per-row estimates."
          />
        </SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {storageData.tableRows.map((row) => {
            const pct = row.percentOfTracked ?? 0;
            const barColor = !row.exists ? "bg-slate-700" :
              row.status === "large" ? "bg-orange-500" :
              row.status === "growing" ? "bg-yellow-500" : "bg-teal-500";
            return (
              <div key={row.tableName} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="truncate font-mono text-[10px] text-slate-400">{row.tableName}</p>
                <p className="mt-1.5 text-lg font-bold tabular-nums text-slate-100">
                  {row.estimatedBytes != null ? formatBytes(row.estimatedBytes) : "—"}
                </p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800">
                  <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px]">
                  <span className="text-slate-600">{row.estimatedRows != null ? `${row.estimatedRows.toLocaleString("en-US")} rows` : "—"}</span>
                  <span className="text-slate-600">{row.percentOfTracked != null ? `${row.percentOfTracked}%` : "—"}</span>
                </div>
                {!row.exists && <p className="mt-1 text-[10px] text-slate-600">Table not yet created</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 3: Table Size Estimates */}
      <section>
        <SectionHeading id="table-sizes">
          Table Size Estimates
          <PanelHelp
            title="Table Size Estimates"
            description="Detailed breakdown of each tracked table — size, row count, percentage of total tracked storage, and growth status."
            source="Row counts × per-table bytes-per-row constants."
          />
        </SectionHeading>
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50">
                  {["Table", "Est. Size", "Est. Rows", "% of Tracked", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {storageData.tableRows.map((row) => (
                  <TableRow key={row.tableName} row={row} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-800 px-4 py-2 text-[10px] text-slate-700">
            Fetched at {storageData.fetchedAt} · Estimates are approximate. Exact values available via pg_statio after Phase 2 RPC setup.
          </p>
        </Card>
      </section>

      {/* Section 4: Storage Trend */}
      <section>
        <SectionHeading id="storage-trend">
          Storage Trend
          <PanelHelp
            title="Storage Trend"
            description="Historical storage usage over time. Trend data begins once snapshot records exist."
            operatorNote="Snapshots are not yet being recorded automatically. This section will populate once periodic storage snapshots are enabled."
          />
        </SectionHeading>
        <Card>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800">
              <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-400">Trend history begins once snapshots are recorded</p>
            <p className="mt-1.5 max-w-sm text-[11px] leading-relaxed text-slate-600">
              Periodic storage snapshots are not yet enabled. When snapshot recording is active, a trend graph of database growth over time will appear here.
            </p>
          </div>
        </Card>
      </section>

      {/* Section 5: Database Risk Panel */}
      <section>
        <SectionHeading id="db-risk">
          Database Risk
          <PanelHelp
            title="Database Risk"
            description="Assesses the current storage risk level and recommends action."
            details="Critical or Pause status means the engine may auto-throttle or stop. Recovery mode uses smaller batches and longer delays to reduce write pressure."
          />
        </SectionHeading>
        <Card>
          <div className={`flex items-start gap-4 rounded-xl border p-4 ${
            storageData.status === "safe" || storageData.status === "watch"
              ? "border-green-900/40 bg-green-950/20"
              : storageData.status === "warning"
                ? "border-yellow-900/40 bg-yellow-950/20"
                : "border-red-900/40 bg-red-950/20"
          }`}>
            <span className={`mt-0.5 text-xl ${storageStatusColor(storageData.status)}`}>
              {storageData.status === "safe" || storageData.status === "watch" ? "✓" : "⚠"}
            </span>
            <div>
              <p className={`text-sm font-bold ${storageStatusColor(storageData.status)}`}>
                {storageLabel(storageData.status)}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                {storageData.status === "safe"
                  ? "Storage is well within safe bounds. No action required."
                  : storageData.status === "watch"
                    ? "Storage is approaching the watch threshold. Monitor growth rate."
                    : storageData.status === "warning"
                      ? "Storage is elevated. Consider running cleanup soon to reduce row counts."
                      : storageData.status === "critical"
                        ? "Storage is critically high. Run cleanup immediately. Engine may auto-pause."
                        : "Storage has exceeded safe limits. Run cleanup immediately. Engine should be paused."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/admin/storage-archive"
                  className="rounded-lg border border-teal-700 bg-teal-950/30 px-3 py-1.5 text-[11px] font-medium text-teal-400 transition-colors hover:bg-teal-950"
                >
                  Open Storage & Archive →
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Section 6: Supabase Metrics API Placeholder */}
      <section>
        <SectionHeading id="metrics-api">
          Supabase Metrics API
          <PanelHelp
            title="Supabase Metrics API"
            description="CPU, RAM, connections, and I/O metrics can be added via the Supabase Metrics API (Prometheus-compatible endpoint)."
            details="Integration requires SUPABASE_METRICS_USERNAME and SUPABASE_METRICS_PASSWORD credentials added server-side. These must never appear in client code."
            operatorNote="Do not add metrics credentials to NEXT_PUBLIC_ environment variables."
          />
        </SectionHeading>
        <Card>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800">
              <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-300">Metrics Integration — Coming Later</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                The Supabase Metrics API provides Prometheus-compatible CPU, RAM, disk I/O, connection counts, and WAL metrics. Integration requires server-side credentials and is planned for a future phase.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3 text-[10px]">
                {["CPU usage", "RAM / memory", "Disk I/O", "Active connections", "WAL metrics", "Query stats"].map((m) => (
                  <div key={m} className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                    {m}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-slate-600">
                See:{" "}
                <span className="font-mono text-slate-500">https://supabase.com/docs/guides/telemetry/metrics</span>
              </p>
            </div>
          </div>
        </Card>
      </section>

    </div>
  );
}
