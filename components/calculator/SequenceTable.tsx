"use client";

import { useState, useMemo } from "react";
import type { CalcResult, CalcStep } from "@/lib/collatz/calculator";
import { fmtBig, fmtNum } from "@/lib/collatz/calculator";

const PAGE_SIZE_OPTIONS = [15, 25, 50] as const;

interface Props {
  result: CalcResult;
}

export function SequenceTable({ result }: Props) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(15);
  const [copied, setCopied] = useState(false);

  const steps = result.steps;
  const totalPages = Math.ceil(steps.length / rowsPerPage);
  const pageSteps = useMemo(
    () => steps.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
    [steps, page, rowsPerPage],
  );

  function handleCopy() {
    const header = "Step\tValue\tParity\tOperation\tNext Value\n";
    const rows = steps
      .map((s) => `${s.step}\t${s.value}\t${s.parity}\t${s.operation}\t${s.nextValue}`)
      .join("\n");
    navigator.clipboard.writeText(header + rows).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownloadCSV() {
    const header = "Step,Value,Parity,Operation,Next Value\n";
    const rows = steps
      .map(
        (s) =>
          `${s.step},"${s.value}","${s.parity}","${s.operation.replace(/"/g, '""')}","${s.nextValue}"`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collatz-${result.startNumber}-sequence.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function goToPage(p: number) {
    setPage(Math.max(0, Math.min(totalPages - 1, p)));
  }

  return (
    <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col items-center justify-between gap-3 border-b border-slate-800 px-5 py-4 text-center sm:flex-row sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <h2 className="text-sm font-semibold text-slate-200">Step-by-Step Sequence</h2>
          <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
            {fmtNum(steps.length)} steps
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
          >
            <CopyIcon />
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
          >
            <DownloadIcon />
            Download CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900">
              {["Step", "Value", "Parity", "Operation", "Next Value"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {pageSteps.map((s) => (
              <StepRow key={s.step} step={s} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-800 px-5 py-3 text-center sm:flex-row sm:text-left">
        <Pagination page={page} totalPages={totalPages} onPage={goToPage} />
        <div className="flex items-center justify-center gap-2">
          <span className="text-[10px] text-slate-500">Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
              setPage(0);
            }}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Step row ─────────────────────────────────────────────────────────────────

function StepRow({ step: s }: { step: CalcStep }) {
  const isConverged = s.operation === "Converged";
  return (
    <tr className="transition-colors hover:bg-slate-800/30">
      <td className="px-4 py-2.5 font-mono text-slate-500">{s.step}</td>
      <td className="px-4 py-2.5 font-mono font-semibold text-slate-100 tabular-nums">
        {fmtBig(s.value)}
      </td>
      <td className="px-4 py-2.5">
        {isConverged ? (
          <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-400">
            Done
          </span>
        ) : s.parity === "odd" ? (
          <span className="rounded-full bg-pink-500/15 px-2 py-0.5 text-[10px] font-semibold text-pink-400">
            Odd
          </span>
        ) : (
          <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-400">
            Even
          </span>
        )}
      </td>
      <td className="max-w-[220px] truncate px-4 py-2.5 font-mono text-slate-400">
        {s.operation}
      </td>
      <td className="px-4 py-2.5 font-mono tabular-nums text-slate-300">{fmtBig(s.nextValue)}</td>
    </tr>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = getPaginationPages(page, totalPages);

  return (
    <div className="flex items-center gap-1">
      <PagBtn onClick={() => onPage(page - 1)} disabled={page === 0} aria-label="Previous page">
        ‹
      </PagBtn>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-slate-600 text-[11px]">
            …
          </span>
        ) : (
          <PagBtn key={p} onClick={() => onPage(p as number)} active={p === page}>
            {(p as number) + 1}
          </PagBtn>
        ),
      )}
      <PagBtn onClick={() => onPage(page + 1)} disabled={page === totalPages - 1} aria-label="Next page">
        ›
      </PagBtn>
    </div>
  );
}

function PagBtn({
  children,
  onClick,
  disabled,
  active,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      className={`min-w-[26px] rounded px-1.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-30 disabled:cursor-default ${
        active
          ? "bg-teal-500/20 text-teal-400 ring-1 ring-teal-500/30"
          : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function getPaginationPages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages: (number | "...")[] = [];
  if (current <= 3) {
    pages.push(0, 1, 2, 3, 4, "...", total - 1);
  } else if (current >= total - 4) {
    pages.push(0, "...", total - 5, total - 4, total - 3, total - 2, total - 1);
  } else {
    pages.push(0, "...", current - 1, current, current + 1, "...", total - 1);
  }
  return pages;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
