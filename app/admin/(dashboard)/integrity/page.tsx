import Link from "next/link";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { getEngineAdminState, getWorkerLockState } from "@/lib/admin/metrics";
import { secondsSince } from "@/lib/admin/engine";
import { computeWatchdog } from "@/lib/admin/watchdog";
import { getStorageMonitor } from "@/lib/admin/storage";

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

function CheckPill({ label, ok, value }: { label: string; ok: boolean | null; value?: string }) {
  const color = ok === true ? "border-green-700 bg-green-950/20 text-green-400" :
                ok === false ? "border-red-700 bg-red-950/20 text-red-400" :
                "border-slate-700 bg-slate-900 text-slate-400";
  return (
    <div className={`rounded-xl border px-4 py-3 ${color}`}>
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] opacity-70">{label}</p>
      <p className="mt-1 font-mono text-sm font-bold">
        {value ?? (ok === null ? "Pending" : ok ? "OK" : "Review")}
      </p>
    </div>
  );
}

export default async function IntegrityPage() {
  const [engineResult, workerLockResult, storageData] = await Promise.all([
    getEngineAdminState(),
    getWorkerLockState(),
    getStorageMonitor(),
  ]);

  const engine = engineResult.data;
  void secondsSince(engine?.lastHeartbeat); // heartbeat age used via watchdog signal

  // Fetch live integrity summary from internal API
  let integritySummary: Record<string, unknown> | null = null;
  let integrityError: string | null = null;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/collatz/integrity`);
    if (res.ok) {
      integritySummary = (await res.json()) as Record<string, unknown>;
    } else {
      integrityError = "Live integrity check unavailable";
    }
  } catch {
    integrityError = "Live integrity check unavailable";
  }

  // Fetch latest full run
  let latestRun: Record<string, unknown> | null = null;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/collatz/integrity/latest`);
    if (res.ok) {
      const json = await res.json() as Record<string, unknown>;
      if (json.ok) latestRun = json.latest as Record<string, unknown>;
    }
  } catch {
    // no data
  }

  const watchdog = computeWatchdog({
    engine: engineResult.data,
    workerLock: workerLockResult.data,
    lockTableExists: workerLockResult.tableExists,
    storageStatus: storageData.status,
    runtimeConfigExists: false,
  });

  const checks = integritySummary?.checks as Record<string, { ok: boolean; ageSeconds?: number; status?: string }> | undefined;
  const liveOk = !integrityError && integritySummary?.ok === true;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">Integrity Checks</h1>
            <PanelHelp
              title="Integrity Checks"
              description="Verifies that the engine is processing numbers sequentially without gaps, duplicates, or pointer mismatches."
              details="Live checks look at current operating state. Full verification scans more deeply across the catalog. These are separate operations."
              source="Live: /api/collatz/integrity. Full runs: collatz_integrity_runs table."
              operatorNote="Forward gaps in sampled activity logs are informational. Unrepaired overlaps in the catalog are real anomalies."
            />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">Sequence pointer, live verification, full catalog scan results</p>
        </div>
        <Link href="/admin" className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
          ← Overview
        </Link>
      </div>

      {/* Section 1: Live Integrity */}
      <section>
        <SectionHeading id="live-integrity">
          Live Integrity
          <PanelHelp
            title="Live Integrity"
            description="Fast checks on current operating state — pointer alignment, heartbeat freshness, worker lock, and status readability."
            details="Live checks run quickly against recent data. They are not a full catalog scan."
          />
        </SectionHeading>
        {integrityError ? (
          <Card>
            <p className="text-[11px] text-slate-500">{integrityError}</p>
          </Card>
        ) : (
          <Card>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                liveOk ? "border-green-700 bg-green-950/20 text-green-400" : "border-yellow-700 bg-yellow-950/20 text-yellow-400"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${liveOk ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} />
                Live {liveOk ? "Passed" : "Warning"}
              </span>
              {integritySummary?.checkedAt != null && (
                <span className="text-[10px] text-slate-600">
                  Checked at {new Date(String(integritySummary.checkedAt)).toLocaleTimeString("en-US")}
                </span>
              )}
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <CheckPill label="Highest Verified n"
                ok={integritySummary != null}
                value={integritySummary?.highestVerifiedN != null
                  ? (integritySummary.highestVerifiedN as number).toLocaleString("en-US") : "Pending"} />
              <CheckPill label="Numbers Cataloged"
                ok={integritySummary != null}
                value={integritySummary?.numbersCataloged != null
                  ? (integritySummary.numbersCataloged as number).toLocaleString("en-US") : "Pending"} />
              <CheckPill label="Scope Size"
                ok={integritySummary != null}
                value={integritySummary?.scopeSize != null
                  ? `${(integritySummary.scopeSize as number).toLocaleString("en-US")} entries` : "Pending"} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <CheckPill label="Duplicate Check"       ok={checks?.duplicates?.ok ?? null} />
              <CheckPill label="Missing Ranges"        ok={checks?.missingRanges?.ok ?? null} />
              <CheckPill label="Record Consistency"    ok={checks?.stateMatchesCatalog?.ok ?? null} />
              <CheckPill label="Worker Heartbeat"      ok={checks?.heartbeat?.ok ?? null}
                value={checks?.heartbeat?.ageSeconds != null ? `${checks.heartbeat.ageSeconds}s ago` : undefined} />
              <CheckPill label="Status Readable"       ok={checks?.statusReadable?.ok ?? null}
                value={checks?.statusReadable?.status ?? undefined} />
            </div>
          </Card>
        )}
      </section>

      {/* Section 2: Sequence Pointer */}
      <section>
        <SectionHeading id="pointer">
          Sequence Pointer
          <PanelHelp
            title="Sequence Pointer"
            description="Checks whether current_number = last_checked_number + 1. This is the core live continuity guarantee."
            details="If aligned, the worker is processing the next number in sequence as expected. A mismatch indicates a potential skip or overlap."
          />
        </SectionHeading>
        <Card>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "current_number",      value: engine?.currentNumber?.toLocaleString("en-US") ?? "—" },
              { label: "last_checked_number", value: engine?.lastProcessed?.toLocaleString("en-US") ?? "—" },
              { label: "expected_current",    value: engine?.lastProcessed != null ? (engine.lastProcessed + 1).toLocaleString("en-US") : "—" },
              {
                label: "Pointer Status",
                value: engine?.currentNumber != null && engine?.lastProcessed != null
                  ? engine.currentNumber === engine.lastProcessed + 1 ? "Aligned ✓" : `Delta: ${engine.currentNumber - engine.lastProcessed}`
                  : "—",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-slate-950/50 px-4 py-3">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">{item.label}</p>
                <p className={`mt-1 font-mono text-sm font-bold ${
                  item.label === "Pointer Status" && item.value.includes("✓") ? "text-green-400" :
                  item.label === "Pointer Status" && item.value.includes("Delta") ? "text-red-400" : "text-slate-200"
                }`}>{item.value}</p>
              </div>
            ))}
          </div>
          <div className={`mt-4 rounded-xl border px-4 py-3 text-[11px] ${watchdog.signals.pointer.status === "safe"
            ? "border-green-700/40 bg-green-950/20 text-green-300"
            : "border-yellow-700/40 bg-yellow-950/20 text-yellow-300"}`}>
            <span className="font-semibold">Watchdog: </span>{watchdog.signals.pointer.message}
            {watchdog.signals.pointer.detail && (
              <span className="mt-0.5 block text-[10px] opacity-70">{watchdog.signals.pointer.detail}</span>
            )}
          </div>
        </Card>
      </section>

      {/* Section 3: Full Catalog Verification */}
      <section>
        <SectionHeading id="full-verification">
          Full Catalog Verification
          <PanelHelp
            title="Full Catalog Verification"
            description="A deep scan of the catalog for duplicates, missing ranges, and record consistency. More thorough than live checks but slower."
            source="collatz_integrity_runs table."
            operatorNote="Full verification scans are triggered manually or via the verifier script. They are not run on every page load."
          />
        </SectionHeading>
        {latestRun ? (
          <Card>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                latestRun.status === "passed" ? "border-green-700 bg-green-950/20 text-green-400" :
                latestRun.status === "warning" ? "border-yellow-700 bg-yellow-950/20 text-yellow-400" :
                "border-red-700 bg-red-950/20 text-red-400"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  latestRun.status === "passed" ? "bg-green-400" :
                  latestRun.status === "warning" ? "bg-yellow-400" : "bg-red-400"}`} />
                {String(latestRun.status).charAt(0).toUpperCase() + String(latestRun.status).slice(1)}
              </span>
              <span className="text-[10px] text-slate-500">
                {latestRun.checkedAt ? new Date(latestRun.checkedAt as string).toLocaleString("en-US") : "—"}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: "Highest Verified n",  value: latestRun.highestVerifiedN != null ? (latestRun.highestVerifiedN as number).toLocaleString("en-US") : "—" },
                { label: "Numbers Cataloged",   value: latestRun.numbersCataloged != null ? (latestRun.numbersCataloged as number).toLocaleString("en-US") : "—" },
                { label: "Duplicates / Gaps",   value: `${latestRun.duplicateCount ?? "—"} / ${latestRun.missingRangeCount ?? "—"}` },
                { label: "Checks",              value: `${latestRun.checksPassed ?? "—"} passed, ${latestRun.checksFailed ?? "—"} failed` },
                { label: "Duration",            value: latestRun.durationMs != null ? `${((latestRun.durationMs as number) / 1000).toFixed(2)}s` : "—" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-slate-950/50 px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">{item.label}</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-200">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <p className="text-[11px] text-slate-500">No full verification run recorded yet.</p>
            <p className="mt-1.5 text-[10px] text-slate-600">
              Run <span className="font-mono">npm run collatz:verify:persist</span> to perform and store a full catalog scan.
            </p>
          </Card>
        )}
      </section>

      {/* Section 4: Sampled Log Explanation */}
      <section>
        <SectionHeading id="sampled-logs">
          Sampled Activity Logs
          <PanelHelp
            title="Sampled Activity Logs"
            description="The activity log is sampled to save database storage. Some batch events are not recorded."
            details="Forward gaps in sampled logs are informational — they mean a batch ran without logging, not that computation was skipped. The sequence pointer is the authoritative continuity check."
          />
        </SectionHeading>
        <Card>
          <div className="space-y-3">
            <div className="rounded-xl border border-blue-900/30 bg-blue-950/15 px-4 py-3">
              <p className="text-[11px] font-semibold text-blue-300">Forward gaps in sampled logs are informational</p>
              <p className="mt-1 text-[11px] leading-relaxed text-blue-300/60">
                When batch log rows are missing, it means the logging interval skipped that batch — not that the computation was skipped.
                Use the sequence pointer and full catalog verification to confirm computation continuity.
              </p>
            </div>
            <div className="rounded-xl border border-orange-900/30 bg-orange-950/15 px-4 py-3">
              <p className="text-[11px] font-semibold text-orange-300">Unrepaired overlaps are real anomalies</p>
              <p className="mt-1 text-[11px] leading-relaxed text-orange-300/60">
                Duplicate worker incidents that left overlapping computation records are different from log gaps.
                These appear as duplicate rows in collatz_results and require investigation.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Section 5: Missing Ranges */}
      <section>
        <SectionHeading id="missing-ranges">
          Missing Ranges
          <PanelHelp
            title="Missing Ranges"
            description="Shows gaps in the collatz_results catalog — ranges of n that have no stored result."
            source="Computed during live or full integrity checks."
          />
        </SectionHeading>
        <Card>
          {((checks?.missingRanges as unknown as { count?: number } | undefined)?.count ?? 0) > 0 ? (
            <p className="text-[11px] text-yellow-400">
              {(checks?.missingRanges as unknown as { count: number }).count} missing range(s) detected in the latest live check scope.
              Run a full verification for complete analysis.
            </p>
          ) : (
            <p className="text-[11px] text-green-400">No missing ranges detected in the latest live check scope.</p>
          )}
          <p className="mt-2 text-[10px] text-slate-600">
            Live check covers the most recent {(integritySummary?.scopeSize as number | undefined)?.toLocaleString("en-US") ?? "—"} entries.
            Full catalog scan covers all entries.
          </p>
        </Card>
      </section>

      {/* Runbook Links */}
      <section>
        <SectionHeading id="runbook">Runbook & Commands</SectionHeading>
        <Card>
          <div className="space-y-2 text-[11px]">
            {[
              { label: "Quick integrity check",   cmd: "npm run collatz:verify" },
              { label: "Full check + persist",    cmd: "npm run collatz:verify:persist" },
              { label: "Health check",             cmd: "npm run collatz:health" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
                <span className="text-slate-500">{r.label}</span>
                <code className="font-mono text-teal-400">{r.cmd}</code>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-slate-600">
            Run these commands on the machine with Supabase credentials configured.
            See <Link href="/methodology" className="text-teal-400 hover:underline">methodology</Link> for detailed documentation.
          </p>
        </Card>
      </section>

    </div>
  );
}
