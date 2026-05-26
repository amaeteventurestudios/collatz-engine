"use client";

import { useMemo, useState } from "react";
import { formatDensity, formatLargeNumber, formatLargeNumberTitle } from "@/lib/collatz/format";
import type { CollatzResult } from "@/lib/collatz/types";

const INITIAL_ROWS = 10;

interface SequenceTraceProps {
  result: CollatzResult;
  displayLabel: string;
}

export function SequenceTrace({ result, displayLabel }: SequenceTraceProps) {
  const [showAll, setShowAll] = useState(false);

  const visibleCount = showAll ? result.full_sequence.length - 1 : INITIAL_ROWS;

  const tableRows = useMemo(() => {
    return result.full_sequence
      .slice(0, visibleCount)
      .map((val, i) => {
        if (i === result.full_sequence.length - 1) return null;
        const nextVal = result.full_sequence[i + 1];
        if (!nextVal) return null;
        const isOdd = val % 2n !== 0n;
        return {
          step: String(i + 1).padStart(3, "0"),
          value: formatLargeNumber(val),
          valueTitle: formatLargeNumberTitle(val),
          type: isOdd ? "Odd" : "Even",
          op: isOdd ? "3n + 1" : "n / 2",
          next: formatLargeNumber(nextVal),
          nextTitle: formatLargeNumberTitle(nextVal),
          isOdd,
        };
      })
      .filter(Boolean) as {
        step: string;
        value: string;
        valueTitle: string;
        type: string;
        op: string;
        next: string;
        nextTitle: string;
        isOdd: boolean;
      }[];
  }, [result, visibleCount]);

  const currentRuleRow = tableRows[tableRows.length - 1];
  const currentValue = result.full_sequence[visibleCount - 1];
  const isCurrentOdd = currentValue !== undefined && currentValue % 2n !== 0n;
  const n = Number(result.start_number);
  const totalSteps = result.steps_to_1;
  const hasMore = totalSteps > INITIAL_ROWS;

  return (
    <section className="px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <p className="section-heading">Sequence Trace</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold text-teal-600 dark:text-teal-400">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              Computed · {displayLabel}
            </span>
          </div>

          {/* Stats row */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              { label: "Start Number", value: n.toLocaleString("en-US"), title: undefined },
              { label: "Steps to 1", value: totalSteps.toLocaleString("en-US"), title: undefined },
              {
                label: "Peak Value",
                value: formatLargeNumber(result.peak_value),
                title: formatLargeNumberTitle(result.peak_value) || undefined,
              },
              { label: "Odd Step Density", value: formatDensity(result.odd_step_density), title: undefined },
            ] as { label: string; value: string; title?: string }[]).map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60"
              >
                <p className="stat-label">{s.label}</p>
                <p
                  className="mt-1.5 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50"
                  title={s.title}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Current rule callout */}
          {currentRuleRow && (
            <div className="mb-5 flex flex-col items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 dark:border-sky-500/20 dark:bg-sky-500/5 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                  Step {Number(currentRuleRow.step)}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                  <span title={currentRuleRow.valueTitle}>
                    {currentRuleRow.value}
                  </span>
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  is {isCurrentOdd ? "odd" : "even"} →
                </span>
                <span className="font-mono text-base font-bold text-teal-600 dark:text-teal-400">
                  <span title={`${currentRuleRow.valueTitle} → ${currentRuleRow.nextTitle}`}>
                    {isCurrentOdd
                      ? `3 × ${currentRuleRow.value} + 1 = ${currentRuleRow.next}`
                      : `${currentRuleRow.value} ÷ 2 = ${currentRuleRow.next}`}
                  </span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    isCurrentOdd
                      ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                      : "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                  }`}
                >
                  {isCurrentOdd ? "Odd rule: 3n + 1" : "Even rule: n / 2"}
                </span>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <div className="min-w-[500px] sm:min-w-0">
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                      {["Step", "Value", "Type", "Operation", "Result"].map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-4 py-3 font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {tableRows.map((row) => (
                      <tr
                        key={row.step}
                        className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3 font-mono text-slate-400 dark:text-slate-500">
                          {row.step}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                          <span title={row.valueTitle}>{row.value}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                              row.isOdd
                                ? "bg-violet-500/15 text-violet-700 dark:text-violet-400"
                                : "bg-sky-500/15 text-sky-700 dark:text-sky-400"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                row.isOdd ? "bg-violet-500" : "bg-sky-500"
                              }`}
                            />
                            {row.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                          {row.op}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                          <span title={row.nextTitle}>{row.next}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Show more / less */}
          {hasMore && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/40"
            >
              {showAll
                ? `↑ Show first ${INITIAL_ROWS} steps`
                : `↓ Show all ${totalSteps} steps`}
            </button>
          )}

          <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Showing {tableRows.length} of {totalSteps.toLocaleString("en-US")} steps ·{" "}
            {displayLabel} · All trajectories verified to reach 1
          </p>
        </div>
      </div>
    </section>
  );
}
