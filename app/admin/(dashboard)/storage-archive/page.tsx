import Link from "next/link";
import { getR2Status } from "@/lib/admin/r2";
import { getDbRuntimeConfig } from "@/lib/admin/metrics";
import { getStorageMonitor, formatBytes } from "@/lib/admin/storage";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { runCleanupFormAction } from "../../actions";

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

export default async function StorageArchivePage() {
  const [r2Data, dbConfig, storageData] = await Promise.all([
    getR2Status(),
    getDbRuntimeConfig(),
    getStorageMonitor(),
  ]);

  const runtime = dbConfig.data ?? {
    mode: "recovery", batchSize: 25, batchDelayMs: 10000, logIntervalMs: 60000,
    storageMode: "free-tier", keepRecentResults: 1000, activityLogRetentionRows: 250,
    rangeSummaryInterval: 100000, milestoneInterval: 1000000,
    autoThrottleEnabled: true, pauseOnCriticalStorage: true,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">Storage & Archive</h1>
            <PanelHelp
              title="Storage & Archive"
              description="Controls storage retention, cleanup safety, archive readiness, and Cloudflare R2 status."
              details="Cleanup reduces database storage by keeping only a recent buffer of results and logs. Archive exports data to R2 before deletion."
              warning="Cleanup removes rows beyond the retention window. Confirm settings before running."
              operatorNote="Do not change retention settings without understanding the impact on catalog completeness."
            />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">Retention policy, cleanup controls, R2 archive status</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/database-monitor" className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
            Database Monitor
          </Link>
          <Link href="/admin" className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
            ← Overview
          </Link>
        </div>
      </div>

      {/* Section 1: Retention Policy */}
      <section>
        <SectionHeading id="retention">
          Retention Policy
          <PanelHelp
            title="Retention Policy"
            description="Controls how many recent results and activity log rows are kept in the database."
            details="The engine retains a rolling buffer of recent results for dashboard display. Older results beyond this buffer may be deleted during cleanup."
            source="collatz_engine_runtime_config table or environment variable defaults."
          />
        </SectionHeading>
        <Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Storage Mode",              value: runtime.storageMode },
              { label: "Keep Recent Results",        value: runtime.keepRecentResults.toLocaleString("en-US") + " rows" },
              { label: "Activity Log Retention",     value: runtime.activityLogRetentionRows.toLocaleString("en-US") + " rows" },
              { label: "Config Source",              value: dbConfig.exists ? "Database table" : "Environment defaults" },
              { label: "Auto-Throttle",              value: runtime.autoThrottleEnabled ? "Enabled" : "Disabled" },
              { label: "Pause on Critical Storage",  value: runtime.pauseOnCriticalStorage ? "Enabled" : "Disabled" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-slate-950/50 px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-300">{item.value}</p>
              </div>
            ))}
          </div>
          {!dbConfig.exists && (
            <p className="mt-4 rounded-xl border border-yellow-900/40 bg-yellow-950/20 px-4 py-3 text-[11px] text-yellow-400">
              Runtime config table not found. Run <span className="font-mono">supabase/phase-2a-storage-guardrails.sql</span> to enable live config switching.
            </p>
          )}
        </Card>
      </section>

      {/* Section 2: Cleanup Controls */}
      <section>
        <SectionHeading id="cleanup">
          Cleanup Controls
          <PanelHelp
            title="Cleanup Controls"
            description="Runs the storage cleanup procedure, which trims results and logs to their configured retention limits."
            warning="Cleanup permanently removes rows beyond the retention window. It cannot be undone. Make sure you understand the retention settings before running."
            operatorNote="Only run cleanup when storage pressure requires it. Do not run cleanup repeatedly or automatically without confirming results."
          />
        </SectionHeading>
        <Card>
          <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
            <p className="text-[11px] text-slate-400">
              Cleanup will trim <span className="font-mono text-slate-300">collatz_results</span> to the most recent{" "}
              <span className="font-semibold text-slate-200">{runtime.keepRecentResults.toLocaleString("en-US")}</span> rows
              and <span className="font-mono text-slate-300">collatz_activity_logs</span> to the most recent{" "}
              <span className="font-semibold text-slate-200">{runtime.activityLogRetentionRows.toLocaleString("en-US")}</span> rows.
            </p>
            <p className="mt-1.5 text-[10px] text-slate-600">
              Current storage: {formatBytes(storageData.estimatedUsedBytes)} of {formatBytes(storageData.limitBytes)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <form action={runCleanupFormAction}>
              <button
                type="submit"
                className="rounded-lg border border-orange-800 bg-orange-950/20 px-4 py-2 text-[11px] font-semibold text-orange-400 transition-colors hover:bg-orange-950"
              >
                Run Cleanup
              </button>
            </form>
            <button
              disabled
              className="cursor-not-allowed rounded-lg border border-slate-700 px-4 py-2 text-[11px] font-medium text-slate-600 opacity-50"
            >
              Preview Cleanup <span className="ml-1 text-[9px]">Phase 2</span>
            </button>
            <button
              disabled
              className="cursor-not-allowed rounded-lg border border-slate-700 px-4 py-2 text-[11px] font-medium text-slate-600 opacity-50"
            >
              Run Archive Export <span className="ml-1 text-[9px]">Phase 3</span>
            </button>
          </div>
        </Card>
      </section>

      {/* Section 3: Cloudflare R2 */}
      <section>
        <SectionHeading id="r2">
          Cloudflare R2
          <PanelHelp
            title="Cloudflare R2"
            description="Shows whether long-term archive storage is configured and ready. R2 stores exported result sets before they are deleted from Supabase."
            source="Environment variables: CLOUDFLARE_R2_BUCKET, CLOUDFLARE_R2_ENDPOINT, etc."
            operatorNote="R2 credentials are server-side only and should never appear in NEXT_PUBLIC_ variables."
          />
        </SectionHeading>
        <Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "R2 Configured",       value: r2Data.config.configured ? "Yes" : "No",                   ok: r2Data.config.configured },
              { label: "Bucket Name",          value: r2Data.config.bucketName ?? "Not set",                    ok: !!r2Data.config.bucketName },
              { label: "Endpoint",             value: r2Data.config.endpointConfigured ? "Set" : "Not set",      ok: r2Data.config.endpointConfigured },
              { label: "Public Base URL",      value: r2Data.config.publicBaseUrlConfigured ? "Set" : "Not set", ok: r2Data.config.publicBaseUrlConfigured },
              { label: "Archive Enabled",      value: r2Data.config.archiveEnabled ? "Yes" : "No",              ok: r2Data.config.archiveEnabled },
              { label: "Archive Format",       value: r2Data.config.archiveFormat ?? "json" },
              { label: "Delete After Upload",  value: r2Data.config.deleteAfterUpload ? "Yes" : "No" },
              { label: "Last Connection Check", value: r2Data.connectionCheckedAt ?? "Not checked" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-slate-950/50 px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">{item.label}</p>
                <p className={`mt-1 text-sm font-semibold ${
                  item.ok === true ? "text-green-400" : item.ok === false ? "text-red-400" : "text-slate-300"
                }`}>{item.value}</p>
              </div>
            ))}
          </div>
          {!r2Data.config.configured && (
            <p className="mt-4 text-[11px] text-slate-600">
              R2 is not configured. Archive exports require R2 credentials. Live bucket testing will be available in Phase 2.
            </p>
          )}
        </Card>
      </section>

      {/* Section 4: Archive Manifests */}
      <section>
        <SectionHeading id="manifests">
          Archive Manifests
          <PanelHelp
            title="Archive Manifests"
            description="Records of completed archive export operations. Manifests log what was archived, when, and where."
            operatorNote="Manifests are created when an archive export runs. They require the R2 archive system to be active."
          />
        </SectionHeading>
        <Card>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm font-semibold text-slate-500">No archive manifests yet</p>
            <p className="mt-1.5 max-w-sm text-[11px] leading-relaxed text-slate-600">
              Archive manifest records will appear here once archive exports have been run. R2 must be configured and archiving must be enabled.
            </p>
          </div>
        </Card>
      </section>

      {/* Section 5: Range Summaries */}
      <section>
        <SectionHeading id="summaries">
          Range Summaries
          <PanelHelp
            title="Range Summaries"
            description="Compressed records of completed computation ranges. Range summaries persist after individual result rows are cleaned up."
            details="When detailed results are removed during cleanup, range summaries preserve the fact that a range was computed without keeping every row."
          />
        </SectionHeading>
        <Card>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm font-semibold text-slate-500">No range summaries recorded yet</p>
            <p className="mt-1.5 max-w-sm text-[11px] leading-relaxed text-slate-600">
              Range summaries will appear here once the engine has completed and summarized ranges. They preserve computation history after detail-level cleanup.
            </p>
          </div>
        </Card>
      </section>

      {/* Section 6: Export Tools */}
      <section>
        <SectionHeading id="exports">
          Export Tools
          <PanelHelp
            title="Export Tools"
            description="Public export endpoints for sampling recent verified results."
            details="Export samples are capped for public access. They return recently retained results, not the full all-time catalog."
          />
        </SectionHeading>
        <Card>
          <div className="flex flex-wrap gap-3">
            <a
              href="/api/collatz/export?format=json&limit=1000"
              className="rounded-lg border border-teal-700 bg-teal-950/20 px-4 py-2 text-[11px] font-medium text-teal-400 transition-colors hover:bg-teal-950"
            >
              Export JSON Sample (1,000 rows)
            </a>
            <a
              href="/api/collatz/export?format=csv&limit=1000"
              className="rounded-lg border border-slate-700 px-4 py-2 text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-800"
            >
              Export CSV Sample (1,000 rows)
            </a>
          </div>
          <p className="mt-3 text-[10px] text-slate-600">
            Public samples are capped. Full export functionality (archive-quality bulk exports) requires R2 configuration.
          </p>
        </Card>
      </section>

    </div>
  );
}
