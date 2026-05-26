"use client";

import { useEffect, useRef, useState } from "react";
import { getTopHighestPeaks } from "@/lib/collatz/store";
import type { CollatzResultRow } from "@/lib/collatz/store";
import { Modal } from "@/components/ui/Modal";
import { formatLargeNumber, formatLargeNumberTitle } from "@/lib/collatz/format";

const TOP_N = 8;
const FETCH_N = 40;
const POLL_MS = 10_000;

type LiveFlag = "high_peak_ratio" | "long_path";

const FLAG_LABELS: Record<LiveFlag, string> = {
  high_peak_ratio: "High peak ratio",
  long_path: "Long path",
};

const FLAG_COLORS: Record<LiveFlag, string> = {
  high_peak_ratio: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  long_path: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

interface Candidate {
  n: number;
  steps: number;
  peak: number;
  ratio: number;
  flags: LiveFlag[];
}

function toCandidate(row: CollatzResultRow): Candidate {
  const ratio = row.n > 0 ? row.peak / row.n : 0;
  const flags: LiveFlag[] = [];
  if (ratio > 50) flags.push("high_peak_ratio");
  if (row.steps > 150) flags.push("long_path");
  return { n: row.n, steps: row.steps, peak: row.peak, ratio, flags };
}

const tableColumns = [
  { label: "Number", hint: "Starting n" },
  { label: "Steps to 1", hint: "Trajectory length" },
  { label: "Peak Ratio", hint: "Peak ÷ n" },
  { label: "Flags", hint: "Why flagged" },
];

// ─── Candidate table (shared between inline and modal) ────────────────────────

function CandidateTable({ candidates }: { candidates: Candidate[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
        {tableColumns.map((col) => (
          <div key={col.label} className="px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {col.label}
            </p>
            <p className="mt-0.5 text-[9px] text-slate-400 dark:text-slate-600">
              {col.hint}
            </p>
          </div>
        ))}
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {candidates.map((c) => (
          <div
            key={c.n}
            className="grid grid-cols-4 items-start gap-2 px-3 py-3 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
          >
            <div>
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                <span title={formatLargeNumberTitle(c.n)}>
                  {formatLargeNumber(c.n)}
                </span>
              </span>
            </div>
            <div>
              <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                {c.steps.toLocaleString("en-US")}
              </span>
            </div>
            <div>
              <span className="font-mono text-sm font-bold text-orange-600 dark:text-orange-400">
                ×{c.ratio.toFixed(0)}
              </span>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                peak:{" "}
                <span title={formatLargeNumberTitle(c.peak)}>
                  {formatLargeNumber(c.peak)}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {c.flags.length > 0 ? (
                c.flags.map((flag) => (
                  <span
                    key={flag}
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${FLAG_COLORS[flag]}`}
                  >
                    {FLAG_LABELS[flag]}
                  </span>
                ))
              ) : (
                <span className="text-[9px] text-slate-400 dark:text-slate-500">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Modal content ────────────────────────────────────────────────────────────

function AllCandidatesModal({ candidates }: { candidates: Candidate[] }) {
  return (
    <div>
      <p className="mb-3 text-[11px] text-slate-400">
        {candidates.length} candidates · sorted by peak ratio (descending) ·
        flagged by peak ratio &gt; 50× or trajectory length &gt; 150 steps
      </p>
      <div className="overflow-y-auto rounded-xl border border-slate-700" style={{ maxHeight: 440 }}>
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-700 bg-slate-800">
              {[
                { label: "n", hint: "Starting number" },
                { label: "Steps", hint: "Trajectory length" },
                { label: "Peak", hint: "Highest value reached" },
                { label: "Ratio", hint: "Peak ÷ n" },
                { label: "Flags", hint: "" },
              ].map((h) => (
                <th
                  key={h.label}
                  className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-slate-400"
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {candidates.map((c) => (
              <tr key={c.n} className="hover:bg-slate-800/50">
                <td className="px-3 py-2 font-mono font-bold text-slate-100">
                  <span title={formatLargeNumberTitle(c.n)}>
                    {formatLargeNumber(c.n)}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-slate-300">
                  {c.steps.toLocaleString("en-US")}
                </td>
                <td className="px-3 py-2 font-mono text-blue-400">
                  <span title={formatLargeNumberTitle(c.peak)}>
                    {formatLargeNumber(c.peak)}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono font-bold text-orange-400">
                  ×{c.ratio.toFixed(0)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {c.flags.length > 0 ? (
                      c.flags.map((flag) => (
                        <span
                          key={flag}
                          className="rounded-full bg-slate-700 px-1.5 py-0.5 text-[9px] text-slate-300"
                        >
                          {FLAG_LABELS[flag]}
                        </span>
                      ))
                    ) : (
                      <span className="text-[9px] text-slate-600">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NearEscapeCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    async function poll() {
      try {
        const rows = await getTopHighestPeaks(FETCH_N);
        if (!mountedRef.current) return;
        const all = rows.map(toCandidate).sort((a, b) => b.ratio - a.ratio);
        setAllCandidates(all);
        setCandidates(all.slice(0, TOP_N));
      } catch {
        // Keep last known data on transient errors
      }
    }

    poll();
    const pollId = window.setInterval(poll, POLL_MS);

    return () => {
      mountedRef.current = false;
      window.clearInterval(pollId);
    };
  }, []);

  const hasCandidates = candidates.length > 0;
  const hasMore = allCandidates.length > TOP_N;

  return (
    <section id="near-escape" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <div>
              <p className="section-heading">Near-Escape Candidates</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {hasCandidates
                  ? "Numbers with unusually high peak ratios or long trajectories from the live catalog"
                  : "Numbers with unusually high peak ratios or long trajectories — awaiting dataset growth"}
              </p>
            </div>
            {hasMore && (
              <button
                onClick={() => setModalOpen(true)}
                className="shrink-0 text-[11px] font-medium text-teal-600 hover:underline dark:text-teal-400"
              >
                View all ({allCandidates.length})
              </button>
            )}
          </div>

          {/* Definition callout */}
          <div className="mb-5 mt-4 flex items-start gap-3 rounded-xl border border-orange-500/30 bg-orange-500/8 px-4 py-4 dark:border-orange-400/30 dark:bg-orange-400/8">
            <span className="mt-0.5 shrink-0 text-base text-orange-500 dark:text-orange-400">△</span>
            <div>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold text-orange-700 dark:text-orange-300">
                  What is a near-escape candidate?
                </p>
                <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                  Visualization label only
                </span>
              </div>
              <p className="text-xs leading-relaxed text-orange-600/80 dark:text-orange-300/70">
                Near-escape candidates are trajectories that climb unusually high, delay descent,
                or show unusually high odd-step density before collapsing back to 1. These numbers
                are flagged for analytical interest based on configurable thresholds.{" "}
                <span className="font-semibold">All verified numbers reach 1.</span>{" "}
                Near-escape is a visualization label, not a mathematical claim.
              </p>
            </div>
          </div>

          {/* Table */}
          {hasCandidates ? (
            <CandidateTable candidates={candidates} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 px-4 py-14 text-center dark:border-slate-800">
              <span className="text-3xl text-slate-300 dark:text-slate-700">◇</span>
              <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Awaiting dataset growth
              </p>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                Near-escape candidates will appear here as the engine catalogs more trajectories.
              </p>
            </div>
          )}

          <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
            {hasCandidates
              ? `Showing top ${candidates.length} by peak ratio · Live catalog · All numbers reach 1`
              : "Candidates flagged by peak ratio > 50× or trajectory length > 150 steps"}
          </p>
        </div>
      </div>

      {/* "View all" modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`All Near-Escape Candidates (${allCandidates.length})`}
        maxWidth="max-w-2xl"
      >
        <AllCandidatesModal candidates={allCandidates} />
      </Modal>
    </section>
  );
}
