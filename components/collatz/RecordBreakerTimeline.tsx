"use client";

import { useMemo } from "react";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { EventColorLegend } from "@/components/collatz/EventColorLegend";
import { formatLargeNumber, formatLargeNumberTitle } from "@/lib/collatz/format";
import { EVENT_COLORS, getEventVisualStyle } from "@/lib/collatz/event-visuals";
import type { AnalyticsRecordRow } from "@/hooks/useCollatzAnalyticsData";

type RecordType = "trajectory" | "peak";

interface RecordTimelineEvent {
  id: string;
  type: RecordType;
  n: number;
  steps: number;
  peak: number;
  value: number;
  timestamp: string | null;
  previousValue: number | null;
  previousN: number | null;
  sortKey: number;
}

interface RecordTimelineProps {
  topBySteps: AnalyticsRecordRow[];
  topByPeak: AnalyticsRecordRow[];
  loading?: boolean;
}

function fmtNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "Pending";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(iso: string | null): string {
  if (!iso) return "time pending";
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatTimestamp(iso);
}

function sortKey(row: AnalyticsRecordRow): number {
  if (row.created_at) {
    const parsed = new Date(row.created_at).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }
  return row.n;
}

function deriveRecordProgression(
  rows: AnalyticsRecordRow[],
  type: RecordType,
): RecordTimelineEvent[] {
  const sorted = [...rows].sort((a, b) => sortKey(a) - sortKey(b));
  const events: RecordTimelineEvent[] = [];
  let recordValue = Number.NEGATIVE_INFINITY;
  let recordN: number | null = null;

  for (const row of sorted) {
    const value = type === "trajectory" ? row.steps : row.peak;
    if (value <= recordValue) continue;

    events.push({
      id: `${type}-${row.n}`,
      type,
      n: row.n,
      steps: row.steps,
      peak: row.peak,
      value,
      timestamp: row.created_at,
      previousValue: Number.isFinite(recordValue) ? recordValue : null,
      previousN: recordN,
      sortKey: sortKey(row),
    });

    recordValue = value;
    recordN = row.n;
  }

  return events;
}

function buildTimelineEvents(
  topBySteps: AnalyticsRecordRow[],
  topByPeak: AnalyticsRecordRow[],
): RecordTimelineEvent[] {
  return [
    ...deriveRecordProgression(topBySteps, "trajectory"),
    ...deriveRecordProgression(topByPeak, "peak"),
  ].sort((a, b) => a.sortKey - b.sortKey);
}

function recordTypeLabel(type: RecordType): string {
  return type === "peak" ? "Peak Record" : "Trajectory Record";
}

function recordValueLabel(event: RecordTimelineEvent): string {
  return event.type === "peak"
    ? formatLargeNumber(event.value)
    : `${fmtNumber(event.value)} steps`;
}

function previousValueLabel(event: RecordTimelineEvent): string | null {
  if (event.previousValue == null) return null;
  return event.type === "peak"
    ? formatLargeNumber(event.previousValue)
    : `${fmtNumber(event.previousValue)} steps`;
}

function TimelineMetricCard({
  label,
  value,
  title,
  tone,
}: {
  label: string;
  value: string;
  title?: string;
  tone: keyof typeof EVENT_COLORS;
}) {
  const color = EVENT_COLORS[tone];
  return (
    <div className={`rounded-xl border px-3 py-3 ${color.border} ${color.bg}`}>
      <p className="card-label">{label}</p>
      <p className={`mt-1 text-sm font-semibold tabular-nums tracking-tight ${color.text}`} title={title}>
        {value}
      </p>
    </div>
  );
}

function MetricChip({
  children,
  tone,
  title,
}: {
  children: React.ReactNode;
  tone: keyof typeof EVENT_COLORS;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`metadata-chip ${EVENT_COLORS[tone].chip}`}
    >
      {children}
    </span>
  );
}

function RecordEventCard({ event }: { event: RecordTimelineEvent }) {
  const visual = getEventVisualStyle(event.type === "peak" ? "peak_record" : "trajectory_record");
  const Icon = visual.icon;
  const previous = previousValueLabel(event);

  return (
    <article className="relative pl-12 sm:pl-16">
      <div
        className={`absolute left-[1.15rem] top-12 h-full w-px ${visual.lineClass}`}
        aria-hidden="true"
      />
      <div
        className={`absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-full border ${visual.markerClass}`}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className={`rounded-xl border p-4 shadow-sm ${visual.borderClass} ${visual.backgroundClass}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`engine-badge ${visual.badgeClass}`}>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {recordTypeLabel(event.type)}
              </span>
              <span className="engine-badge border-slate-500/25 bg-slate-500/10 text-slate-300">
                {relativeTime(event.timestamp)}
              </span>
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {event.type === "peak" ? "New highest peak recorded" : "New longest trajectory recorded"}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {event.type === "peak"
                ? `n = ${fmtNumber(event.n)} climbed to ${formatLargeNumber(event.peak)} before descent.`
                : `n = ${fmtNumber(event.n)} reached ${fmtNumber(event.steps)} steps before convergence.`}
            </p>
          </div>

          <time className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {formatTimestamp(event.timestamp)}
          </time>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <MetricChip tone="slate">n = {fmtNumber(event.n)}</MetricChip>
          <MetricChip
            tone={event.type === "peak" ? "amber" : "violet"}
            title={event.type === "peak" ? formatLargeNumberTitle(event.value) : undefined}
          >
            {recordValueLabel(event)}
          </MetricChip>
          {event.type === "peak" ? (
            <MetricChip tone="violet">{fmtNumber(event.steps)} steps</MetricChip>
          ) : (
            <MetricChip tone="amber" title={formatLargeNumberTitle(event.peak)}>
              Peak: {formatLargeNumber(event.peak)}
            </MetricChip>
          )}
          {previous && (
            <MetricChip
              tone={event.type === "peak" ? "amber" : "violet"}
              title={
                event.previousValue != null && event.type === "peak"
                  ? formatLargeNumberTitle(event.previousValue)
                  : undefined
              }
            >
              Previous: {previous}
            </MetricChip>
          )}
          {event.previousN != null && (
            <MetricChip tone="slate">Previous n = {fmtNumber(event.previousN)}</MetricChip>
          )}
        </div>
      </div>
    </article>
  );
}

function EmptyTimeline() {
  return (
    <div className="placeholder-panel">
      <p className="text-center text-sm text-slate-400 dark:text-slate-500">
        Record-setting events will appear as persisted results establish new highs.
      </p>
    </div>
  );
}

export function RecordBreakerTimeline({
  topBySteps,
  topByPeak,
  loading,
}: RecordTimelineProps) {
  const events = useMemo(
    () => buildTimelineEvents(topBySteps, topByPeak),
    [topBySteps, topByPeak],
  );

  const latestEvent = events[events.length - 1] ?? null;
  const topSteps = topBySteps[0] ?? null;
  const topPeak = topByPeak[0] ?? null;
  const recordTypesTracked =
    (topBySteps.length > 0 ? 1 : 0) + (topByPeak.length > 0 ? 1 : 0);

  return (
    <section className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="section-heading">Record Breaker Timeline</p>
                <PanelHelp
                  title="Record Breaker Timeline"
                  description="Shows record-setting moments in chronological order, including new longest trajectories and new highest peaks recorded by the engine. These are computational observations, not proof of the conjecture."
                  align="left"
                />
              </div>
              <p className="panel-subtitle mt-1">
                Chronicles the engine&apos;s most notable recorded events over time.
              </p>
            </div>
            {loading && (
              <span className="self-start rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                Updating...
              </span>
            )}
          </div>

          <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <TimelineMetricCard
              label="Latest Record"
              value={latestEvent ? `n = ${fmtNumber(latestEvent.n)}` : "Pending"}
              tone={latestEvent?.type === "peak" ? "amber" : latestEvent ? "violet" : "slate"}
            />
            <TimelineMetricCard
              label="Longest Trajectory"
              value={topSteps ? `${fmtNumber(topSteps.steps)} steps` : "Pending"}
              tone="violet"
            />
            <TimelineMetricCard
              label="Highest Peak"
              value={topPeak ? formatLargeNumber(topPeak.peak) : "Pending"
              }
              title={topPeak ? formatLargeNumberTitle(topPeak.peak) : undefined}
              tone="amber"
            />
            <TimelineMetricCard
              label="Record Types Tracked"
              value={recordTypesTracked.toString()}
              tone="slate"
            />
          </div>

          {events.length === 0 ? (
            <EmptyTimeline />
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <RecordEventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function LeaderboardTable({
  title,
  type,
  rows,
}: {
  title: string;
  type: RecordType;
  rows: AnalyticsRecordRow[];
}) {
  const color = type === "peak" ? EVENT_COLORS.amber : EVENT_COLORS.violet;

  return (
    <div className={`overflow-hidden rounded-xl border ${color.border}`}>
      <div className={`border-b px-4 py-3 ${color.border} ${color.bg}`}>
        <p className={`text-sm font-semibold ${color.text}`}>{title}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
            <tr>
              {(type === "peak"
                ? ["Rank", "Starting Number (n)", "Peak Value", "Steps"]
                : ["Rank", "Starting Number (n)", "Steps", "Peak"]
              ).map((heading) => (
                <th key={heading} className="px-3 py-2.5 font-semibold uppercase tracking-[0.08em]">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                  No persisted records available yet.
                </td>
              </tr>
            ) : (
              rows.slice(0, 10).map((row, index) => (
                <tr
                  key={`${type}-${row.n}`}
                  className={index === 0 ? `${color.bg}` : "bg-white dark:bg-slate-900/30"}
                >
                  <td className="px-3 py-3">
                    <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full border px-2 text-[10px] font-semibold ${index === 0 ? color.chip : EVENT_COLORS.slate.chip}`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {fmtNumber(row.n)}
                  </td>
                  {type === "peak" ? (
                    <>
                      <td
                        className={`px-3 py-3 font-semibold tabular-nums ${color.text}`}
                        title={formatLargeNumberTitle(row.peak)}
                      >
                        {formatLargeNumber(row.peak)}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-slate-600 dark:text-slate-400">
                        {fmtNumber(row.steps)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`px-3 py-3 font-semibold tabular-nums ${color.text}`}>
                        {fmtNumber(row.steps)}
                      </td>
                      <td
                        className="px-3 py-3 tabular-nums text-slate-600 dark:text-slate-400"
                        title={formatLargeNumberTitle(row.peak)}
                      >
                        {formatLargeNumber(row.peak)}
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RecordLeaderboards({
  topBySteps,
  topByPeak,
  loading,
}: RecordTimelineProps) {
  return (
    <section className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="section-heading">Record Leaderboards</p>
                <PanelHelp
                  title="Record Leaderboards"
                  description="Shows the current top ranked records found by the engine, including the longest trajectories and highest peaks from persisted results."
                  align="left"
                />
              </div>
              <p className="panel-subtitle mt-1">
                All-time top records across the engine&apos;s exploration.
              </p>
            </div>
            {loading && (
              <span className="self-start rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                Updating...
              </span>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <LeaderboardTable
              title="Longest Trajectories"
              type="trajectory"
              rows={topBySteps}
            />
            <LeaderboardTable
              title="Highest Peaks"
              type="peak"
              rows={topByPeak}
            />
          </div>

          <p className="mt-5 text-center text-[11px] text-slate-400 dark:text-slate-500">
            All records are verified computational observations, not proof of the Collatz Conjecture.
          </p>
        </div>

        <EventColorLegend variant="compact" className="mt-4" />
      </div>
    </section>
  );
}
