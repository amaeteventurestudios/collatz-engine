"use client";

import { useEffect, useMemo, useState } from "react";
import { getSeedResult } from "@/lib/collatz/examples";
import { computeCollatz } from "@/lib/collatz/engine";
import { getTopLongestTrajectories } from "@/lib/collatz/store";
import { formatBigInt, formatDensity } from "@/lib/collatz/format";
import type { CollatzResult } from "@/lib/collatz/types";

const ROWS_TO_SHOW = 10;

// Stable fallback — computed once at module load
const FALLBACK: CollatzResult = getSeedResult(27);

export function SequenceTrace() {
  const [result, setResult] = useState<CollatzResult>(FALLBACK);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const rows = await getTopLongestTrajectories(1);
      if (!isMounted || !rows || rows.length === 0) return;
      const computed = computeCollatz(rows[0].n);
      if (isMounted && computed.reached_one && computed.full_sequence.length > 1) {
        setResult(computed);
        setIsLive(true);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  const tableRows = useMemo(() => {
    return result.full_sequence
      .slice(0, ROWS_TO_SHOW)
      .map((val, i) => {
        if (i === result.full_sequence.length - 1) return null;
        const nextVal = result.full_sequence[i + 1];
        if (!nextVal) return null;
        const isOdd = val % 2n !== 0n;
        return {
          step: String(i + 1).padStart(3, "0"),
          value: formatBigInt(val),
          type: isOdd ? "Odd" : "Even",
          op: isOdd ? "3n + 1" : "n / 2",
          next: formatBigInt(nextVal),
        };
      })
      .filter(Boolean) as { step: string; value: string; type: string; op: string; next: string }[];
  }, [result]);

  const currentRuleRow = tableRows[tableRows.length - 1];
  const currentValue = result.full_sequence[ROWS_TO_SHOW - 1];
  const isCurrentOdd = currentValue !== undefined && currentValue % 2n !== 0n;
  const n = Number(result.start_number);
  const badgeLabel = isLive ? `Live — n=${n.toLocaleString("en-US")}` : "Example — n=27";

  return (
    <section className="px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <p className="section-heading">Sequence Trace</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold text-teal-600 dark:text-teal-400">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              Computed · {badgeLabel}
            </span>
          </div>

          {/* Stats row */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Start Number", value: n.toLocaleString("en-US") },
              { label: "Steps to 1", value: String(result.steps_to_1) },
              { label: "Peak Value", value: formatBigInt(result.peak_value) },
              { label: "Odd Step Density", value: formatDensity(result.odd_step_density) },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60"
              >
                <p className="stat-label">{s.label}</p>
                <p className="mt-1.5 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
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
                  Current Rule (Step {Number(currentRuleRow.step)})
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                  {currentRuleRow.value}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  is {isCurrentOdd ? "odd" : "even"} →
                </span>
                <span className="font-mono text-base font-bold text-teal-600 dark:text-teal-400">
                  {isCurrentOdd
                    ? `3 × ${currentRuleRow.value} + 1 = ${currentRuleRow.next}`
                    : `${currentRuleRow.value} ÷ 2 = ${currentRuleRow.next}`}
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
                          {row.value}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                              row.type === "Odd"
                                ? "bg-violet-500/15 text-violet-700 dark:text-violet-400"
                                : "bg-sky-500/15 text-sky-700 dark:text-sky-400"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                row.type === "Odd" ? "bg-violet-500" : "bg-sky-500"
                              }`}
                            />
                            {row.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                          {row.op}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                          {row.next}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
            {isLive
              ? `Showing first ${tableRows.length} of ${result.steps_to_1} steps for n=${n.toLocaleString("en-US")} — the current longest cataloged trajectory.`
              : `Showing first ${tableRows.length} of ${result.steps_to_1} steps for n=${n}. Updates to the longest trajectory as the catalog grows.`}
          </p>
        </div>
      </div>
    </section>
  );
}
