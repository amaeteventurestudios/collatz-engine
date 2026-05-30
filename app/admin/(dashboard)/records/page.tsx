import Link from "next/link";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { getEngineAdminState } from "@/lib/admin/metrics";
import { getTopLongestTrajectories, getTopHighestPeaks } from "@/lib/collatz/store";
import { formatLargeNumber, formatLargeNumberTitle } from "@/lib/collatz/format";

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

function fmtN(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("en-US");
}

export default async function RecordsPage() {
  const [engineResult, topSteps, topPeaks] = await Promise.all([
    getEngineAdminState(),
    getTopLongestTrajectories(10),
    getTopHighestPeaks(10),
  ]);

  const engine = engineResult.data;

  // Compute best peak ratio from buffer
  let bestRatio = 0;
  for (const row of topPeaks) {
    const r = row.n > 0 ? row.peak / row.n : 0;
    if (r > bestRatio) { bestRatio = r; }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">Records</h1>
            <PanelHelp
              title="Records"
              description="Mathematical records found by the engine — longest trajectories, highest peaks, and milestones."
              details="All-time records come from persistent engine state. The retained buffer records come from the current results window and may not include older historical records."
              source="All-time: collatz_engine_state. Buffer: collatz_results table top-N queries."
            />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">All-time engine records, recent buffer leaderboards, milestones</p>
        </div>
        <Link href="/admin" className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
          ← Overview
        </Link>
      </div>

      {/* Section 1: All-Time Records */}
      <section>
        <SectionHeading id="all-time">
          All-Time Records
          <PanelHelp
            title="All-Time Records"
            description="Authoritative all-time engine records stored in the engine state table. These persist even after detailed results are cleaned up."
            source="collatz_engine_state table — longest_steps, highest_peak fields."
            operatorNote="These are the canonical records. Do not confuse with buffer records below."
          />
        </SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Longest Trajectory",  value: engine?.longestSteps != null ? `${fmtN(engine.longestSteps)} steps` : "—",   color: "text-violet-400" },
            { label: "Highest Peak",        value: engine?.highestPeak != null ? formatLargeNumber(engine.highestPeak) : "—",     color: "text-amber-400",   title: engine?.highestPeak != null ? formatLargeNumberTitle(engine.highestPeak) : undefined },
            { label: "Total Checked",       value: fmtN(engine?.totalChecked),                                                    color: "text-blue-400" },
            { label: "Highest n Checked",   value: fmtN(engine?.lastProcessed),                                                   color: "text-teal-400" },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">{card.label}</p>
              <p className={`mt-2 text-xl font-bold tabular-nums ${card.color}`} title={card.title}>{card.value}</p>
              <p className="mt-1 text-[10px] text-slate-600">All-time engine record</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Buffer Leaderboard — Trajectories */}
      <section>
        <SectionHeading id="buffer-steps">
          Recent Buffer — Longest Trajectories
          <PanelHelp
            title="Recent Buffer Records"
            description="Top results from the currently retained collatz_results buffer. These reflect only the most recently stored rows, not the full all-time catalog."
            details="The buffer may not include the all-time longest trajectory if that result was cleaned up. Use All-Time Records above for canonical values."
            source="collatz_results table, ordered by steps DESC, limit 10."
          />
        </SectionHeading>
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50">
                  {["Rank", "n", "Steps", "Peak"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {topSteps.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[11px] text-slate-500">No results in buffer</td></tr>
                ) : (
                  topSteps.map((row, i) => (
                    <tr key={row.n} className={`hover:bg-slate-800/20 transition-colors ${i === 0 ? "bg-violet-950/10" : ""}`}>
                      <td className="px-4 py-3">
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-slate-700 bg-slate-800 px-1.5 text-[10px] font-bold text-slate-300">{i + 1}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-bold text-slate-100 tabular-nums">{fmtN(row.n)}</td>
                      <td className="px-4 py-3 font-semibold text-violet-400 tabular-nums">{fmtN(row.steps)}</td>
                      <td className="px-4 py-3 text-[11px] tabular-nums whitespace-nowrap text-slate-400" title={formatLargeNumberTitle(row.peak)}>
                        {formatLargeNumber(row.peak)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-800 px-4 py-2 text-[10px] text-slate-600">
            Recent retained buffer only — not all-time records.
          </p>
        </Card>
      </section>

      {/* Section 3: Buffer Leaderboard — Peaks */}
      <section>
        <SectionHeading id="buffer-peaks">
          Recent Buffer — Highest Peaks
          <PanelHelp
            title="Recent Buffer — Highest Peaks"
            description="Top results from the retained buffer by peak value reached. Not the all-time highest peak."
            source="collatz_results table, ordered by peak DESC, limit 10."
          />
        </SectionHeading>
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50">
                  {["Rank", "n", "Peak Value", "Steps"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {topPeaks.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[11px] text-slate-500">No results in buffer</td></tr>
                ) : (
                  topPeaks.map((row, i) => (
                    <tr key={row.n} className={`hover:bg-slate-800/20 transition-colors ${i === 0 ? "bg-amber-950/10" : ""}`}>
                      <td className="px-4 py-3">
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-slate-700 bg-slate-800 px-1.5 text-[10px] font-bold text-slate-300">{i + 1}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-bold text-slate-100 tabular-nums">{fmtN(row.n)}</td>
                      <td className="px-4 py-3 font-semibold text-amber-400 tabular-nums whitespace-nowrap" title={formatLargeNumberTitle(row.peak)}>
                        {formatLargeNumber(row.peak)}
                      </td>
                      <td className="px-4 py-3 text-[11px] tabular-nums text-slate-400">{fmtN(row.steps)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-800 px-4 py-2 text-[10px] text-slate-600">
            Recent retained buffer only — not all-time records.
          </p>
        </Card>
      </section>

      {/* Section 4: Milestones */}
      <section>
        <SectionHeading id="milestones">
          Milestones
          <PanelHelp
            title="Milestones"
            description="Significant crossing points in the computation — round-number milestones, record events, and notable discoveries."
            source="collatz_activity_logs and collatz_record_events tables (when available)."
          />
        </SectionHeading>
        <Card>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm font-semibold text-slate-500">Milestone timeline coming in Phase 2</p>
            <p className="mt-1.5 max-w-sm text-[11px] leading-relaxed text-slate-600">
              Once milestone event recording is fully active, a chronological timeline of record-breaking events and milestone crossings will appear here.
            </p>
          </div>
        </Card>
      </section>

      {/* Section 5: Near-Escape Highlights */}
      <section>
        <SectionHeading id="near-escape">
          Near-Escape Highlights
          <PanelHelp
            title="Near-Escape Highlights"
            description="Numbers with unusually high peak ratios or long trajectories. A visualization label, not a mathematical claim."
            operatorNote="Near-escape is a visualization label only. All verified numbers reach 1."
          />
        </SectionHeading>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-[11px] text-slate-500">
              The full Near-Escape Candidates panel with live data, featured top-3 cards, and ranked table is on the public dashboard.
            </p>
            <div className="flex gap-3">
              <Link
                href="/#near-escape"
                className="rounded-lg border border-teal-700 bg-teal-950/20 px-3 py-1.5 text-[11px] font-medium text-teal-400 transition-colors hover:bg-teal-950"
              >
                View Near-Escape Candidates →
              </Link>
            </div>
          </div>
          {topPeaks.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] text-slate-600">Buffer top candidates by peak ratio</p>
              <div className="space-y-1.5">
                {topPeaks.slice(0, 3).map((row) => {
                  const ratio = row.n > 0 ? row.peak / row.n : 0;
                  return (
                    <div key={row.n} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-[11px]">
                      <span className="font-mono tabular-nums text-slate-300">{fmtN(row.n)}</span>
                      <span className="font-bold text-orange-400">×{ratio.toFixed(0)}</span>
                      <span className="tabular-nums text-slate-500">{fmtN(row.steps)} steps</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </section>

    </div>
  );
}
