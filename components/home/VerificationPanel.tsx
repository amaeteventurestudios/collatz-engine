"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatLargeNumber, formatLargeNumberTitle } from "@/lib/collatz/format";

interface IntegritySummary {
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

type PanelStatus = "passed" | "warning" | "unavailable";

const POLL_MS = 30_000;

function statusFrom(summary: IntegritySummary | null, error: string | null): PanelStatus {
  if (error || !summary) return "unavailable";
  return summary.ok ? "passed" : "warning";
}

function statusCopy(status: PanelStatus) {
  if (status === "passed") {
    return {
      label: "Passed",
      dot: "bg-emerald-400",
      text: "text-emerald-400",
      border: "border-emerald-500/40",
      bg: "bg-emerald-500/10",
    };
  }
  if (status === "warning") {
    return {
      label: "Warning",
      dot: "bg-amber-400",
      text: "text-amber-400",
      border: "border-amber-500/40",
      bg: "bg-amber-500/10",
    };
  }
  return {
    label: "Unavailable",
    dot: "bg-slate-500",
    text: "text-slate-400",
    border: "border-slate-700",
    bg: "bg-slate-800/60",
  };
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function CheckPill({ label, ok }: { label: string; ok: boolean | null }) {
  const cls =
    ok === true
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : ok === false
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-slate-700 bg-slate-800/60 text-slate-400";
  return (
    <div className={`rounded border px-3 py-2 ${cls}`}>
      <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] opacity-80">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-bold">{ok === null ? "—" : ok ? "OK" : "Review"}</p>
    </div>
  );
}

export function VerificationPanel() {
  const [summary, setSummary] = useState<IntegritySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/collatz/integrity", { cache: "no-store" });
        const json = await res.json();
        if (!mounted) return;
        if (!res.ok || json.ok === false) {
          setError(json.error ?? "Verification summary is unavailable.");
          return;
        }
        setSummary(json as IntegritySummary);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Verification summary is unavailable.");
      }
    }

    load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  const status = statusFrom(summary, error);
  const cfg = statusCopy(status);
  const checks = summary?.checks;

  return (
    <section id="verification" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-5 py-5 shadow-sm sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Catalog Verification
                </p>
                <span className={`inline-flex items-center gap-2 rounded border px-2.5 py-1 ${cfg.bg} ${cfg.border}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                  <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${cfg.text}`}>
                    {cfg.label}
                  </span>
                </span>
              </div>
              <p className="max-w-3xl text-sm leading-relaxed text-slate-300">
                The engine processes integers sequentially in verified batches. Completed
                results are stored in the catalog and displayed here as a live computational
                record. This system does not claim to prove the Collatz Conjecture.
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                The public summary checks the latest verified range for duplicate entries,
                missing ranges, record consistency, and heartbeat freshness. Full catalog
                verification remains available through the command-line integrity check.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
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
              <p className="basis-full text-right text-[11px] leading-relaxed text-slate-500 lg:text-left">
                Limited export samples are capped for public access.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-px overflow-hidden rounded border border-slate-800 bg-slate-800 sm:grid-cols-3">
            <div className="bg-slate-950 px-4 py-3">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Highest Verified n
              </p>
              <p
                className="mt-1 font-mono text-lg font-bold text-slate-100"
                title={summary ? formatLargeNumberTitle(summary.highestVerifiedN) : undefined}
              >
                {summary ? formatLargeNumber(summary.highestVerifiedN) : "—"}
              </p>
            </div>
            <div className="bg-slate-950 px-4 py-3">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Numbers Cataloged
              </p>
              <p
                className="mt-1 font-mono text-lg font-bold text-slate-100"
                title={summary ? formatLargeNumberTitle(summary.numbersCataloged) : undefined}
              >
                {summary ? formatLargeNumber(summary.numbersCataloged) : "—"}
              </p>
            </div>
            <div className="bg-slate-950 px-4 py-3">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Last Verification Time
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-slate-100">
                {summary ? fmtDate(summary.lastVerificationTime) : "—"}
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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">
              Latest integrity summary covers the most recent{" "}
              {summary ? summary.scopeSize.toLocaleString("en-US") : "—"} catalog entries.
              {error ? ` ${error}` : ""}
            </p>
            <button
              onClick={() => setDetailsOpen((v) => !v)}
              className="rounded border border-slate-700 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 transition-colors hover:bg-slate-900"
            >
              {detailsOpen ? "Hide Details" : "View Details"}
            </button>
          </div>

          {detailsOpen && checks && (
            <div className="mt-4 grid gap-3 rounded border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400 md:grid-cols-2">
              <p>Duplicate sample: {checks.duplicates.sample.length > 0 ? checks.duplicates.sample.join(", ") : "none"}</p>
              <p>
                Missing range sample:{" "}
                {checks.missingRanges.sample.length > 0
                  ? checks.missingRanges.sample.map((r) => `${r.start}-${r.end}`).join(", ")
                  : "none"}
              </p>
              <p>Heartbeat age: {checks.heartbeat.ageSeconds == null ? "—" : `${checks.heartbeat.ageSeconds}s`}</p>
              <p>Status: {checks.statusReadable.status ?? "—"}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
