"use client";

import { useMemo } from "react";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { useCollatzLiveState } from "@/hooks/useCollatzLiveState";
import {
  formatDurationApprox,
  formatLargeNumber,
  formatLargeNumberTitle,
  formatMilestone,
  formatMilestoneFull,
  formatMilestonePower,
} from "@/lib/collatz/format";

const catalogMilestones = [
  1_000_000,
  10_000_000,
  100_000_000,
  1_000_000_000,
  10_000_000_000,
  100_000_000_000,
  1_000_000_000_000,
  10_000_000_000_000,
  100_000_000_000_000,
  1_000_000_000_000_000,
  10_000_000_000_000_000,
  100_000_000_000_000_000,
  1_000_000_000_000_000_000,
];

function fmtRate(value: number | null | undefined): string {
  if (!value || value <= 0) return "Pending";
  return `${value.toFixed(1)}/sec`;
}

function milestoneTitle(value: number): string {
  const power = formatMilestonePower(value);
  return power ? `${formatMilestoneFull(value)} (${power})` : formatMilestoneFull(value);
}

export function MilestoneFeed() {
  const { state, loading, error } = useCollatzLiveState(5_000);

  const verified = state?.total_numbers_checked ?? state?.last_checked_number ?? 0;
  const throughput = state?.numbers_per_second ?? 0;

  const milestoneState = useMemo(() => {
    const reached = catalogMilestones.filter((milestone) => verified >= milestone);
    const previous = reached[reached.length - 1] ?? null;
    const target = catalogMilestones.find((milestone) => verified < milestone) ?? null;
    const targetIndex = target ? catalogMilestones.indexOf(target) : catalogMilestones.length;
    const upcoming = catalogMilestones.slice(targetIndex + 1, targetIndex + 4);
    const start = previous ?? 0;
    const end = target ?? catalogMilestones[catalogMilestones.length - 1];
    const span = Math.max(1, end - start);
    const completed = target ? Math.max(0, verified - start) : span;
    const progress = Math.min(1, completed / span);
    const remaining = target ? Math.max(0, target - verified) : 0;
    const secondsRemaining = throughput > 0 ? remaining / throughput : null;

    return {
      previous,
      target,
      upcoming,
      progress,
      remaining,
      secondsRemaining,
    };
  }, [verified, throughput]);

  const percent = milestoneState.target
    ? Math.min(100, Math.max(0, milestoneState.progress * 100))
    : 100;
  const percentLabel = `${percent.toFixed(percent >= 10 ? 1 : 2)}%`;

  return (
    <section id="milestones" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Milestone Feed
                </p>
                <PanelHelp
                  title="Milestone Feed"
                  description="Shows progress toward major catalog milestones such as 1 million, 1 billion, and 1 trillion verified numbers. Milestones track computation progress, not proof."
                  align="left"
                />
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                Tracking verified catalog growth as the autonomous engine advances sequentially
                from 1 upward.
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Milestones are computation progress markers, not mathematical proof markers.
              </p>
            </div>
            <div className="rounded border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-center sm:text-right">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-teal-300">
                Verified Catalog Size
              </p>
              <p
                className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-50"
                title={formatLargeNumberTitle(verified)}
              >
                {loading ? "Pending" : formatLargeNumber(verified)}
              </p>
            </div>
          </div>

          {error && !state ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Milestone status is temporarily unavailable.
            </div>
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-md border border-slate-800 bg-slate-900/50 p-4 text-center sm:text-left">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Previous Milestone Reached
                  </p>
                  <p
                    className="mt-2 font-mono text-2xl font-bold text-slate-100"
                    title={
                      milestoneState.previous
                        ? milestoneTitle(milestoneState.previous)
                        : undefined
                    }
                  >
                    {milestoneState.previous
                      ? `${formatMilestone(milestoneState.previous)} cataloged`
                      : "First milestone pending"}
                  </p>
                </div>

                <div className="rounded-md border border-cyan-500/30 bg-cyan-500/10 p-4 text-center sm:text-left">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                    Current Target
                  </p>
                  <p
                    className="mt-2 font-mono text-2xl font-bold text-slate-50"
                    title={
                      milestoneState.target ? milestoneTitle(milestoneState.target) : undefined
                    }
                  >
                    {milestoneState.target
                      ? `${formatMilestone(milestoneState.target)} cataloged`
                      : "All listed milestones reached"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {milestoneState.target
                      ? `${formatLargeNumber(milestoneState.remaining)} numbers remaining`
                      : "The public ladder can be extended as the catalog grows."}
                  </p>
                </div>

                <div className="rounded-md border border-slate-800 bg-slate-900/50 p-4 text-center sm:text-left">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    ETA
                  </p>
                  <p className="mt-2 font-mono text-2xl font-bold text-slate-100">
                    {milestoneState.secondsRemaining != null && milestoneState.target
                      ? formatDurationApprox(milestoneState.secondsRemaining)
                      : "Pending"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {milestoneState.secondsRemaining != null && milestoneState.target
                      ? `estimated at current throughput · ${fmtRate(throughput)}`
                      : "estimated once throughput is available"}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Progress Toward Current Target
                  </p>
                  <p className="font-mono text-sm font-bold text-cyan-300">{percentLabel}</p>
                </div>
                <div
                  className="h-3 overflow-hidden rounded-full border border-slate-800 bg-slate-900"
                  role="progressbar"
                  aria-label="Progress toward current catalog milestone"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Number(percent.toFixed(2))}
                  aria-valuetext={`${percentLabel} toward ${
                    milestoneState.target
                      ? formatMilestone(milestoneState.target)
                      : "the listed milestone ladder"
                  }`}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-400 via-cyan-300 to-sky-400 transition-[width] duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-left">
                  Next Upcoming Milestones
                </p>
                <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  {milestoneState.upcoming.map((milestone) => (
                    <span
                      key={milestone}
                      title={milestoneTitle(milestone)}
                      className="rounded border border-slate-700 bg-slate-900/70 px-3 py-2 font-mono text-[11px] font-semibold text-slate-300"
                    >
                      {formatMilestone(milestone)} cataloged
                    </span>
                  ))}
                  {milestoneState.upcoming.length === 0 && (
                    <span className="text-xs text-slate-500">No further listed milestones.</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
