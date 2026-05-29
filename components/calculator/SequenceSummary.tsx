"use client";

import Link from "next/link";
import type { CalcResult } from "@/lib/collatz/calculator";
import { fmtBig, fmtNum, fmtPct } from "@/lib/collatz/calculator";

interface Props {
  result: CalcResult;
}

export function SequenceSummary({ result }: Props) {
  return (
    <div className="flex w-full flex-col gap-4 lg:w-64 xl:w-72 shrink-0">
      {/* Card 1: Sequence Summary */}
      <SummaryCard title="Sequence Summary">
        <SummaryRow label="Start Number" value={fmtBig(result.startNumber)} accent />
        <SummaryRow label="Total Steps" value={fmtNum(result.totalSteps)} />
        <SummaryRow label="Stopping Time (to reach 1)" value={fmtNum(result.stoppingTime)} />
        <SummaryRow label="Highest Peak" value={fmtBig(result.highestPeak)} />
        <SummaryRow label="Odd Steps" value={`${fmtNum(result.oddSteps)} (${fmtPct(result.oddPercent)})`} />
        <SummaryRow label="Even Steps" value={`${fmtNum(result.evenSteps)} (${fmtPct(result.evenPercent)})`} />
        <SummaryRow label="Average Value" value={result.averageValue.toLocaleString("en-US", { maximumFractionDigits: 2 })} />
      </SummaryCard>

      {/* Card 2: Sequence End */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
          <span className={`h-1.5 w-1.5 rounded-full ${result.reachedOne ? "bg-green-400" : "bg-amber-400"}`} />
          Sequence End
        </h3>
        {result.reachedOne ? (
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-green-400">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            <div>
              <p className="text-xs font-medium text-slate-300">The sequence reached 1.</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                It will now repeat: 4, 2, 1, 4, 2, 1…
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 8v4" /><path d="M12 16h.01" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </span>
            <div>
              <p className="text-xs font-medium text-amber-300">Max steps reached.</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                The sequence did not reach 1 within the configured step limit. Try increasing Max Steps.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Card 3: About the Conjecture */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
          About the Conjecture
        </h3>
        <p className="text-[11px] leading-relaxed text-slate-400">
          The Collatz Conjecture (also called the 3n&nbsp;+&nbsp;1 problem) states that for any positive
          integer n, repeated application of the rule:
        </p>
        <ul className="mt-2 space-y-1 text-[11px] text-slate-400">
          <li className="flex items-start gap-1.5">
            <span className="mt-0.5 text-sky-400">•</span>
            If n is even, divide by 2.
          </li>
          <li className="flex items-start gap-1.5">
            <span className="mt-0.5 text-pink-400">•</span>
            If n is odd, multiply by 3 and add 1.
          </li>
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          …will always eventually reach 1. Despite being simple to state, it remains{" "}
          <span className="font-semibold text-amber-400">unproven</span>.
        </p>
        <Link
          href="/methodology"
          className="mt-3 flex items-center gap-1 text-[11px] font-medium text-teal-400 hover:text-teal-300"
        >
          Learn more →
        </Link>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
        {title}
      </h3>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="shrink-0 text-[11px] text-slate-500">{label}</dt>
      <dd className={`truncate text-right text-[11px] font-semibold tabular-nums ${accent ? "text-teal-400" : "text-slate-200"}`}>
        {value}
      </dd>
    </div>
  );
}
