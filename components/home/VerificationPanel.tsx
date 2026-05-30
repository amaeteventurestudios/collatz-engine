"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { formatLargeNumber, formatLargeNumberTitle } from "@/lib/collatz/format";
import { EVENT_COLORS } from "@/lib/collatz/event-visuals";
import { COLLATZ_POLL_MS } from "@/lib/collatz/cache-policy";
import { useSafePolling } from "@/hooks/useSafePolling";

interface LiveIntegritySummary {
  ok: boolean;
  checkedAt: string;
  scope: "latest_range";
  scopeSize: number;
  highestVerifiedN: number;
  numbersCataloged: number;
  lastVerificationTime: string;
  checks: {
    duplicates: { ok: boolean; count: number; sample: number[] };
    missingRanges: {
      ok: boolean;
      count: number;
      sample: Array<{ start: number; end: number }>;
    };
    stateMatchesCatalog: {
      ok: boolean;
      details: {
        totalNumbersCheckedMatchesMaxN: boolean;
        highestPeakMatches: boolean;
        longestStepsMatches: boolean;
      };
    };
    heartbeat: { ok: boolean; ageSeconds: number | null };
    statusReadable: { ok: boolean; status: string | null };
  };
}

interface LatestIntegrityRun {
  status: "passed" | "failed" | "warning";
  checkedAt: string;
  highestVerifiedN: number | null;
  numbersCataloged: number | null;
  checksPassed: number | null;
  checksFailed: number | null;
  durationMs: number | null;
  duplicateCount: number | null;
  missingRangeCount: number | null;
  stateMatchesCatalog: boolean | null;
  recordsMatchCatalog: boolean | null;
  heartbeatRecent: boolean | null;
}

type PanelStatus = "passed" | "warning" | "unavailable";

const POLL_MS = COLLATZ_POLL_MS.PUBLIC_INTEGRITY;

function statusFrom(summary: LiveIntegritySummary | null, error: string | null): PanelStatus {
  if (error || !summary) return "unavailable";
  return summary.ok ? "passed" : "warning";
}

function fullStatusFrom(run: LatestIntegrityRun | null, error: string | null): PanelStatus {
  if (error || !run) return "unavailable";
  return run.status === "passed" ? "passed" : "warning";
}

function statusCopy(status: PanelStatus) {
  if (status === "passed") {
    return {
      label: "Passed",
      dot: EVENT_COLORS.emerald.dot,
      text: EVENT_COLORS.emerald.text,
      border: EVENT_COLORS.emerald.border,
      bg: EVENT_COLORS.emerald.subtleBg,
    };
  }
  if (status === "warning") {
    return {
      label: "Warning",
      dot: EVENT_COLORS.slate.dot,
      text: EVENT_COLORS.slate.text,
      border: EVENT_COLORS.slate.border,
      bg: EVENT_COLORS.slate.subtleBg,
    };
  }
  return {
    label: "Unavailable",
    dot: EVENT_COLORS.slate.dot,
    text: EVENT_COLORS.slate.text,
    border: EVENT_COLORS.slate.border,
    bg: EVENT_COLORS.slate.subtleBg,
  };
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "Pending";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmtDuration(ms: number | null | undefined): string {
  if (ms == null) return "Pending";
  if (ms < 1_000) return `${ms}ms`;
  return `${(ms / 1_000).toFixed(2)}s`;
}

function CheckPill({ label, ok }: { label: string; ok: boolean | null }) {
  const cls =
    ok === true
      ? EVENT_COLORS.emerald.chip
      : ok === false
        ? EVENT_COLORS.slate.chip
        : EVENT_COLORS.slate.chip;
  return (
    <div className={`rounded border px-3 py-2 text-center ${cls}`}>
      <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] opacity-80">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-bold">{ok === null ? "Pending" : ok ? "OK" : "Review"}</p>
    </div>
  );
}

export function VerificationPanel() {
  const [liveSummary, setLiveSummary] = useState<LiveIntegritySummary | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [latestRun, setLatestRun] = useState<LatestIntegrityRun | null>(null);
  const [latestMessage, setLatestMessage] = useState<string | null>(null);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const load = useCallback(async (signal: AbortSignal) => {
    try {
      const [liveRes, latestRes] = await Promise.all([
        fetch("/api/collatz/integrity", { signal }),
        fetch("/api/collatz/integrity/latest", { signal }),
      ]);
      const [liveJson, latestJson] = await Promise.all([
        liveRes.json(),
        latestRes.json(),
      ]);

      if (!liveRes.ok) {
        setLiveError(liveJson.error ?? "Live verification summary is unavailable.");
      } else {
        // ok: false means some checks failed (warning) — data is still available
        setLiveSummary(liveJson as LiveIntegritySummary);
        setLiveError(null);
      }

      if (!latestRes.ok) {
        setLatestRun(null);
        setLatestMessage(null);
        setLatestError(latestJson.error ?? "Full verification status is unavailable.");
      } else if (latestJson.ok === false) {
        setLatestRun(null);
        setLatestMessage(latestJson.message ?? "No full verification run recorded yet.");
        setLatestError(null);
      } else {
        setLatestRun(latestJson.latest as LatestIntegrityRun);
        setLatestMessage(null);
        setLatestError(null);
      }
    } catch (err) {
      if (signal.aborted) return;
      const message = err instanceof Error ? err.message : "Verification summary is unavailable.";
      setLiveError(message);
      setLatestError(message);
    }
  }, []);

  useSafePolling({
    intervalMs: POLL_MS,
    minIntervalMs: 60_000,
    staleAfterMs: POLL_MS * 2,
    poll: load,
  });

  const liveStatus = statusFrom(liveSummary, liveError);
  const liveCfg = statusCopy(liveStatus);
  const fullStatus = fullStatusFrom(latestRun, latestError);
  const fullCfg = statusCopy(fullStatus);
  const checks = liveSummary?.checks;

  return (
    <section id="verification" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-5 py-5 shadow-sm sm:px-6">
          <div className="flex flex-col items-center gap-4 text-center lg:flex-row lg:items-start lg:justify-between lg:text-left">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    System Integrity
                  </p>
                  <PanelHelp
                    title="System Integrity"
                    description="Shows whether the engine, database, persistence layer, and verification checks are behaving correctly."
                    align="left"
                  />
                </div>
                <span className={`inline-flex items-center gap-2 rounded border px-2.5 py-1 ${liveCfg.bg} ${liveCfg.border}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${liveCfg.dot}`} />
                  <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${liveCfg.text}`}>
                    Live {liveCfg.label}
                  </span>
                </span>
                <span className={`inline-flex items-center gap-2 rounded border px-2.5 py-1 ${fullCfg.bg} ${fullCfg.border}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${fullCfg.dot}`} />
                  <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${fullCfg.text}`}>
                    Full {fullCfg.label}
                  </span>
                </span>
              </div>
              <p className="max-w-3xl text-sm leading-relaxed text-slate-300">
                The engine processes integers sequentially in verified batches. Completed
                results are stored in the catalog and displayed here as a live computational
                record. This system does not claim to prove the Collatz Conjecture.
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Live checks monitor recent catalog health. Full verification scans review the
                catalog for duplicate entries, missing ranges, and record consistency.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 lg:max-w-sm lg:justify-end">
              <Link
                href="/docs/api"
                className="rounded border border-teal-500/40 bg-teal-500/10 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-300 transition-colors hover:bg-teal-500/15"
              >
                View API docs
              </Link>
              <Link
                href="/methodology"
                className="rounded border border-slate-700 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 transition-colors hover:bg-slate-900"
              >
                Read methodology
              </Link>
              <Link
                href="/status"
                className="rounded border border-slate-700 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 transition-colors hover:bg-slate-900"
              >
                System status
              </Link>
              <a
                href="/api/collatz/export?format=json&limit=1000"
                className="rounded border border-slate-700 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 transition-colors hover:bg-slate-900"
              >
                Export JSON sample
              </a>
              <a
                href="/api/collatz/export?format=csv&limit=1000"
                className="rounded border border-slate-700 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 transition-colors hover:bg-slate-900"
              >
                Export CSV sample
              </a>
              <p className="basis-full text-center text-[11px] leading-relaxed text-slate-500 lg:text-right">
                Limited export samples are capped for public access.
              </p>
              <div className="basis-full flex justify-center lg:justify-end">
                <PanelHelp
                  title="Export Samples"
                  description="Shows examples of the engine's recorded data in exportable formats for analysis, verification, and reuse."
                  align="right"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-800 pt-5">
            <div className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
              <div className="max-w-2xl">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Live Bounded Check
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Fast, current, and limited to the latest catalog window for public dashboard health.
                </p>
              </div>
              <span className={`inline-flex items-center gap-2 rounded border px-2.5 py-1 ${liveCfg.bg} ${liveCfg.border}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${liveCfg.dot}`} />
                <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${liveCfg.text}`}>
                  {liveCfg.label}
                </span>
              </span>
            </div>

            <div className="mt-4 grid gap-px overflow-hidden rounded border border-slate-800 bg-slate-800 text-center sm:grid-cols-3">
              <div className="bg-slate-950 px-4 py-3">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Highest Verified n
                </p>
                <p
                  className="mt-1 font-mono text-lg font-bold text-slate-100"
                  title={liveSummary ? formatLargeNumberTitle(liveSummary.highestVerifiedN) : undefined}
                >
                  {liveSummary ? formatLargeNumber(liveSummary.highestVerifiedN) : "Pending"}
                </p>
              </div>
              <div className="bg-slate-950 px-4 py-3">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Numbers Cataloged
                </p>
                <p
                  className="mt-1 font-mono text-lg font-bold text-slate-100"
                  title={liveSummary ? formatLargeNumberTitle(liveSummary.numbersCataloged) : undefined}
                >
                  {liveSummary ? formatLargeNumber(liveSummary.numbersCataloged) : "Pending"}
                </p>
              </div>
              <div className="bg-slate-950 px-4 py-3">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Last Live Check
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-slate-100">
                  {liveSummary ? fmtDate(liveSummary.checkedAt) : "Pending"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <CheckPill label="Duplicate Check" ok={checks ? checks.duplicates.ok : null} />
              <CheckPill label="Missing Range Check" ok={checks ? checks.missingRanges.ok : null} />
              <CheckPill label="Record Consistency" ok={checks ? checks.stateMatchesCatalog.ok : null} />
              <CheckPill label="Worker Heartbeat" ok={checks ? checks.heartbeat.ok : null} />
              <CheckPill label="Status Readable" ok={checks ? checks.statusReadable.ok : null} />
            </div>
          </div>

          <div className="mt-6 border-t border-slate-800 pt-5">
            <div className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
              <div className="max-w-2xl">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Full Catalog Verification
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Last persisted full scan across the catalog, including duplicate entries,
                  missing ranges, and record consistency.
                </p>
              </div>
              <span className={`inline-flex items-center gap-2 rounded border px-2.5 py-1 ${fullCfg.bg} ${fullCfg.border}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${fullCfg.dot}`} />
                <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${fullCfg.text}`}>
                  {fullCfg.label}
                </span>
              </span>
            </div>

            {latestRun ? (
              <div className="mt-4 grid gap-px overflow-hidden rounded border border-slate-800 bg-slate-800 text-center sm:grid-cols-2 lg:grid-cols-5">
                <div className="bg-slate-950 px-4 py-3">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Last Checked
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-100">
                    {fmtDate(latestRun.checkedAt)}
                  </p>
                </div>
                <div className="bg-slate-950 px-4 py-3">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Highest Verified n
                  </p>
                  <p
                    className="mt-1 font-mono text-sm font-bold text-slate-100"
                    title={
                      latestRun.highestVerifiedN != null
                        ? formatLargeNumberTitle(latestRun.highestVerifiedN)
                        : undefined
                    }
                  >
                    {latestRun.highestVerifiedN != null
                      ? formatLargeNumber(latestRun.highestVerifiedN)
                      : "Pending"}
                  </p>
                </div>
                <div className="bg-slate-950 px-4 py-3">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Duplicates / Gaps
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-100">
                    {latestRun.duplicateCount ?? "Pending"} / {latestRun.missingRangeCount ?? "Pending"}
                  </p>
                </div>
                <div className="bg-slate-950 px-4 py-3">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Checks
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-100">
                    {latestRun.checksPassed ?? "Pending"} passed, {latestRun.checksFailed ?? "Pending"} failed
                  </p>
                </div>
                <div className="bg-slate-950 px-4 py-3">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Duration
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-100">
                    {fmtDuration(latestRun.durationMs)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded border border-slate-800 bg-slate-900/40 px-4 py-3 text-center text-sm text-slate-400">
                {latestMessage ?? latestError ?? "No full verification run recorded yet."}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
            <p className="text-[11px] text-slate-500">
              Live summary covers the most recent{" "}
              {liveSummary ? liveSummary.scopeSize.toLocaleString("en-US") : "Pending"} catalog entries.
              {liveError ? ` ${liveError}` : ""}
            </p>
            <button
              onClick={() => setDetailsOpen((v) => !v)}
              className="rounded border border-slate-700 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 transition-colors hover:bg-slate-900"
            >
              {detailsOpen ? "Hide Details" : "View Details"}
            </button>
          </div>

          {detailsOpen && checks && (
            <div className="mt-4 grid gap-3 rounded border border-slate-800 bg-slate-900/40 p-4 text-center text-xs text-slate-400 md:grid-cols-2 md:text-left">
              <p>Duplicate sample: {checks.duplicates.sample.length > 0 ? checks.duplicates.sample.join(", ") : "none"}</p>
              <p>
                Missing range sample:{" "}
                {checks.missingRanges.sample.length > 0
                  ? checks.missingRanges.sample.map((r) => `${r.start}-${r.end}`).join(", ")
                  : "none"}
              </p>
              <p>Heartbeat age: {checks.heartbeat.ageSeconds == null ? "Pending" : `${checks.heartbeat.ageSeconds}s`}</p>
              <p>Status: {checks.statusReadable.status ?? "Pending"}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
