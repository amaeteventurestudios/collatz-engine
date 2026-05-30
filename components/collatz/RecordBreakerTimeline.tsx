"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { EventColorLegend } from "@/components/collatz/EventColorLegend";
import { formatLargeNumber, formatLargeNumberTitle } from "@/lib/collatz/format";
import { EVENT_COLORS, getEventVisualStyle } from "@/lib/collatz/event-visuals";
import type { AnalyticsRecordRow } from "@/hooks/useCollatzAnalyticsData";
import type { CollatzAllTimeRecordRow, EngineState } from "@/lib/collatz/store";

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

interface AllTimeRecordsSnapshot {
  ok: true;
  engineState: EngineState | null;
  longestRecords: CollatzAllTimeRecordRow[];
  peakRecords: CollatzAllTimeRecordRow[];
  backfillState: BackfillState | null;
}

interface BackfillState {
  status: "idle" | "running" | "paused" | "completed" | "failed";
  start_number: number;
  target_number: number | null;
  current_number: number;
  processed_count: number;
  top_n_limit: number;
  started_at: string | null;
  completed_at: string | null;
  last_heartbeat_at: string | null;
  error_message: string | null;
}

type AllTimeDisplaySource = "engine_state" | "permanent_record";

interface AllTimeDisplayRow {
  id: string;
  record_category: CollatzAllTimeRecordRow["record_category"];
  starting_number: number | null;
  steps: number | null;
  peak_value: number | null;
  discovered_at?: string | null;
  displaySource: AllTimeDisplaySource;
  missingDetails: boolean;
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

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Pending";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMaybeNumber(value: number | null): string {
  return value == null ? "not retained" : fmtNumber(value);
}

function formatMaybeLargeNumber(value: number | null): string {
  return value == null ? "not retained" : formatLargeNumber(value);
}

function formatMaybeLargeNumberTitle(value: number | null): string | undefined {
  return value == null ? undefined : formatLargeNumberTitle(value);
}

function backfillStatusNote(state: BackfillState | null): string {
  if (!state) return "Historical reconstruction not started. Permanent rows currently reflect retained data and future live preservation.";
  const target = state.target_number != null ? fmtNumber(state.target_number) : "a pending checkpoint";
  const current = fmtNumber(state.current_number);
  if (state.status === "completed") {
    return `Historical rankings reconstructed through frozen checkpoint n = ${target}.`;
  }
  if (state.status === "running") {
    return `Historical reconstruction in progress: processed through n = ${current} of frozen checkpoint n = ${target}.`;
  }
  if (state.status === "paused") {
    return `Historical reconstruction paused at n = ${current} of frozen checkpoint n = ${target}.`;
  }
  if (state.status === "failed") {
    return `Historical reconstruction failed at n = ${current}. ${state.error_message ?? "Check operator logs."}`;
  }
  return "Historical reconstruction not started. Permanent rows currently reflect retained data and future live preservation.";
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
    <div className={`rounded-xl border px-3 py-3 text-center sm:text-left ${color.border} ${color.bg}`}>
      <p className="card-label">{label}</p>
      <p className={`mt-1 text-sm font-semibold tabular-nums tracking-tight ${color.text}`} title={title}>
        {value}
      </p>
    </div>
  );
}

function AllTimeMetricCard({
  label,
  value,
  sub,
  title,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  title?: string;
  tone: keyof typeof EVENT_COLORS;
}) {
  const color = EVENT_COLORS[tone];
  return (
    <div className={`live-card rounded-xl border px-4 py-4 ${color.border} ${color.bg}`}>
      <p className="card-label">{label}</p>
      <p className={`live-value mt-2 text-lg font-bold tracking-tight ${color.text}`} title={title}>
        {value}
      </p>
      <p className="live-subtext mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
        {sub}
      </p>
    </div>
  );
}

function AllTimeRecordsTable({
  title,
  type,
  rows,
}: {
  title: string;
  type: RecordType;
  rows: AllTimeDisplayRow[];
}) {
  const color = type === "peak" ? EVENT_COLORS.amber : EVENT_COLORS.violet;
  const hasMissingHeadlineDetails = rows.some(
    (row) => row.displaySource === "engine_state" && row.missingDetails,
  );
  const placeholderRows = Math.max(0, 10 - rows.length);

  return (
    <div className={`overflow-hidden rounded-xl border ${color.subtleBorder} bg-slate-950/30`}>
      <div className={`border-b px-4 py-3 ${color.subtleBorder} ${color.subtleBg}`}>
        <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${color.text}`}>
          {title}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="bg-slate-950/50 text-[10px] uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-3 py-3 font-semibold">Rank</th>
              <th className="px-3 py-3 font-semibold">Starting Number (n)</th>
              <th className="px-3 py-3 font-semibold">{type === "peak" ? "Peak Value" : "Steps"}</th>
              <th className="px-3 py-3 font-semibold">{type === "peak" ? "Steps" : "Peak Value"}</th>
              <th className="px-3 py-3 font-semibold">Discovered</th>
              <th className="px-3 py-3 font-semibold">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  No permanent records preserved yet.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-slate-900/50">
                  <td className="px-3 py-3 text-slate-500">{idx + 1}</td>
                  <td className="px-3 py-3 font-mono font-semibold text-slate-200">
                    {formatMaybeNumber(row.starting_number)}
                  </td>
                  {type === "peak" ? (
                    <>
                      <td
                        className={`px-3 py-3 font-semibold tabular-nums whitespace-nowrap ${color.text}`}
                        title={formatMaybeLargeNumberTitle(row.peak_value)}
                      >
                        {formatMaybeLargeNumber(row.peak_value)}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-slate-400">
                        {formatMaybeNumber(row.steps)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`px-3 py-3 font-semibold tabular-nums ${color.text}`}>
                        {formatMaybeNumber(row.steps)}
                      </td>
                      <td
                        className="px-3 py-3 tabular-nums whitespace-nowrap text-slate-400"
                        title={formatMaybeLargeNumberTitle(row.peak_value)}
                      >
                        {formatMaybeLargeNumber(row.peak_value)}
                      </td>
                    </>
                  )}
                  <td className="px-3 py-3 text-slate-400">{formatDate(row.discovered_at)}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        row.displaySource === "engine_state"
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                          : "border-slate-500/25 bg-slate-500/10 text-slate-300"
                      }`}
                      title={row.displaySource === "engine_state" ? "Engine State Record" : "Permanent Record"}
                    >
                      {row.displaySource === "engine_state" ? "Engine State" : "Preserved"}
                    </span>
                  </td>
                </tr>
              ))
            )}
            {Array.from({ length: rows.length === 0 ? 9 : placeholderRows }).map((_, idx) => (
              <tr key={`placeholder-${type}-${idx}`} aria-hidden="true">
                <td className="px-3 py-3 text-transparent">-</td>
                <td className="px-3 py-3 text-transparent">-</td>
                <td className="px-3 py-3 text-transparent">-</td>
                <td className="px-3 py-3 text-transparent">-</td>
                <td className="px-3 py-3 text-transparent">-</td>
                <td className="px-3 py-3 text-transparent">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p
        className={`flex min-h-[3.25rem] items-center border-t border-violet-400/20 px-4 py-3 text-[11px] leading-relaxed text-slate-400 ${
          hasMissingHeadlineDetails ? "" : "invisible"
        }`}
      >
        Detailed starting number for this historical record was not retained. A reconstruction backfill can restore it.
      </p>
    </div>
  );
}

function toPermanentDisplayRow(row: CollatzAllTimeRecordRow): AllTimeDisplayRow {
  return {
    id: `permanent-${row.record_category}-${row.starting_number}`,
    record_category: row.record_category,
    starting_number: row.starting_number,
    steps: row.steps,
    peak_value: row.peak_value,
    discovered_at: row.discovered_at,
    displaySource: "permanent_record",
    missingDetails: false,
  };
}

function composeAllTimeDisplayRows(
  engineState: EngineState | null,
  records: CollatzAllTimeRecordRow[],
  type: RecordType,
): AllTimeDisplayRow[] {
  if (!engineState) return records.slice(0, 10).map(toPermanentDisplayRow);

  const category = type === "peak" ? "highest_peak" : "longest_trajectory";
  const headlineValue = type === "peak" ? engineState.highest_peak : engineState.longest_steps;
  const matchingStoredRecord = records.find((row) =>
    type === "peak"
      ? row.peak_value === headlineValue
      : row.steps === headlineValue,
  );

  const headlineRow: AllTimeDisplayRow = {
    id: `engine-state-${category}`,
    record_category: category,
    starting_number: matchingStoredRecord?.starting_number ?? null,
    steps: type === "peak" ? matchingStoredRecord?.steps ?? null : headlineValue,
    peak_value: type === "peak" ? headlineValue : matchingStoredRecord?.peak_value ?? null,
    discovered_at:
      matchingStoredRecord?.discovered_at ??
      engineState.worker_heartbeat_at ??
      engineState.updated_at,
    displaySource: "engine_state",
    missingDetails:
      matchingStoredRecord?.starting_number == null ||
      (type === "peak" ? matchingStoredRecord?.steps == null : matchingStoredRecord?.peak_value == null),
  };

  const remainingRows = records
    .filter((row) =>
      matchingStoredRecord
        ? row.record_category !== matchingStoredRecord.record_category ||
          row.starting_number !== matchingStoredRecord.starting_number
        : true,
    )
    .map(toPermanentDisplayRow);

  return [headlineRow, ...remainingRows].slice(0, 10);
}

async function getAllTimeRecordsSnapshot(): Promise<AllTimeRecordsSnapshot | null> {
  const res = await fetch("/api/collatz/all-time-records?limit=10", {
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("[Collatz Engine] all-time records snapshot failed", await res.text());
    return null;
  }

  return (await res.json()) as AllTimeRecordsSnapshot;
}

function preserveScrollAfterLivePaint(scrollX: number, scrollY: number) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const movedX = Math.abs(window.scrollX - scrollX) > 1;
      const movedY = Math.abs(window.scrollY - scrollY) > 1;
      if (movedX || movedY) {
        window.scrollTo({ left: scrollX, top: scrollY, behavior: "auto" });
      }
    });
  });
}

export function AllTimeEngineRecords() {
  const [engineState, setEngineState] = useState<EngineState | null>(null);
  const [longestRows, setLongestRows] = useState<CollatzAllTimeRecordRow[]>([]);
  const [peakRows, setPeakRows] = useState<CollatzAllTimeRecordRow[]>([]);
  const [backfillState, setBackfillState] = useState<BackfillState | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const headlineLongest = longestRows[0]?.steps === engineState?.longest_steps ? longestRows[0] : null;
  const headlinePeak = peakRows[0]?.peak_value === engineState?.highest_peak ? peakRows[0] : null;
  const allTimeLongestRows = useMemo(
    () => composeAllTimeDisplayRows(engineState, longestRows, "trajectory"),
    [engineState, longestRows],
  );
  const allTimePeakRows = useMemo(
    () => composeAllTimeDisplayRows(engineState, peakRows, "peak"),
    [engineState, peakRows],
  );

  useEffect(() => {
    mountedRef.current = true;

    async function poll() {
      try {
        const snapshot = await getAllTimeRecordsSnapshot();
        if (!mountedRef.current) return;
        if (!snapshot) return;
        const shouldPreserveScroll = hasLoadedRef.current;
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        setEngineState(snapshot.engineState);
        setLongestRows(snapshot.longestRecords);
        setPeakRows(snapshot.peakRecords);
        setBackfillState(snapshot.backfillState);
        hasLoadedRef.current = true;
        if (shouldPreserveScroll) {
          preserveScrollAfterLivePaint(scrollX, scrollY);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    poll();
    const id = window.setInterval(poll, 5_000);
    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
    };
  }, []);

  return (
    <section id="all-time-records" className="live-stable scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card border-violet-500/40 bg-slate-950/40">
          <div className="mb-5 flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <p className="section-heading text-violet-300">All-Time Engine Records</p>
                <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-violet-200">
                  Authoritative
                </span>
                <PanelHelp
                  title="All-Time Engine Records"
                  description="Authoritative records preserved in engine state and permanent record storage. Missing historical starting numbers are labeled rather than reconstructed."
                  align="left"
                />
              </div>
              <p className="panel-subtitle mt-1">
                Authoritative records preserved in engine state and permanent record storage.
              </p>
            </div>
            <span
              className={`rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-slate-500 sm:self-start ${loading ? "" : "invisible"}`}
            >
              Updating...
            </span>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <AllTimeMetricCard
              label="Longest Trajectory"
              value={engineState ? `${fmtNumber(engineState.longest_steps)} steps` : "Pending"}
              sub={headlineLongest ? `Starting n: ${fmtNumber(headlineLongest.starting_number)}` : "Starting n: not retained"}
              tone="violet"
            />
            <AllTimeMetricCard
              label="Highest Peak"
              value={engineState?.highest_peak != null ? formatLargeNumber(engineState.highest_peak) : "Pending"}
              title={engineState?.highest_peak != null ? formatLargeNumberTitle(engineState.highest_peak) : undefined}
              sub={headlinePeak ? `Starting n: ${fmtNumber(headlinePeak.starting_number)}` : "Starting n: not retained"}
              tone="amber"
            />
            <AllTimeMetricCard
              label="Numbers Checked"
              value={engineState ? fmtNumber(engineState.total_numbers_checked) : "Pending"}
              sub={engineState ? `Last checked: ${fmtNumber(engineState.last_checked_number)}` : "Engine state unavailable"}
              tone="cyan"
            />
            <AllTimeMetricCard
              label="Current Number"
              value={engineState ? fmtNumber(engineState.current_number) : "Pending"}
              sub={engineState ? `Status: ${engineState.current_status}` : "Engine state unavailable"}
              tone="blue"
            />
            <AllTimeMetricCard
              label="Last Updated"
              value={formatDate(engineState?.worker_heartbeat_at ?? engineState?.updated_at)}
              sub={engineState?.worker_heartbeat_at ? "Worker heartbeat" : "Engine state timestamp"}
              tone="slate"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <AllTimeRecordsTable
              title="Top 10 All-Time Longest Trajectories"
              type="trajectory"
              rows={allTimeLongestRows}
            />
            <AllTimeRecordsTable
              title="Top 10 All-Time Highest Peaks"
              type="peak"
              rows={allTimePeakRows}
            />
          </div>

          <p className="mt-5 flex min-h-[4.75rem] items-center justify-center overflow-hidden rounded-lg border border-violet-400/20 bg-violet-400/10 px-3 py-2 text-center text-[11px] leading-relaxed text-slate-300 sm:min-h-[3.25rem]">
            {backfillStatusNote(backfillState)} Missing historical starting numbers are not inferred.
          </p>
        </div>
      </div>
    </section>
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
    <article className="relative pl-0 sm:pl-16">
      <div
        className={`absolute left-[1.15rem] top-12 hidden h-full w-px sm:block ${visual.lineClass}`}
        aria-hidden="true"
      />
      <div
        className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border sm:absolute sm:left-0 sm:top-1 sm:mx-0 sm:mb-0 ${visual.markerClass}`}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className={`rounded-xl border p-4 shadow-sm ${visual.borderClass} ${visual.backgroundClass}`}>
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
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

        <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
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
    <section id="record-breaker-timeline" className="live-stable scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          <div className="mb-5 flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
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
            <span
              className={`rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500 sm:self-start ${loading ? "" : "invisible"}`}
            >
              Updating...
            </span>
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

          <div className="h-[42rem] overflow-y-auto pr-1">
            {events.length === 0 ? (
              <div className="flex h-full items-center">
                <EmptyTimeline />
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <RecordEventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
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
  const displayRows = rows.slice(0, 10);
  const placeholderRows = Math.max(0, 10 - displayRows.length);

  return (
    <div className={`overflow-hidden rounded-xl border ${color.border}`}>
      <div className={`border-b px-4 py-3 text-center sm:text-left ${color.border} ${color.bg}`}>
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
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                  No persisted records available yet.
                </td>
              </tr>
            ) : (
              displayRows.map((row, index) => (
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
                        className={`px-3 py-3 font-semibold tabular-nums whitespace-nowrap ${color.text}`}
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
                        className="px-3 py-3 tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-400"
                        title={formatLargeNumberTitle(row.peak)}
                      >
                        {formatLargeNumber(row.peak)}
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
            {Array.from({ length: displayRows.length === 0 ? 9 : placeholderRows }).map((_, index) => (
              <tr key={`retained-placeholder-${type}-${index}`} aria-hidden="true" className="bg-white dark:bg-slate-900/30">
                <td className="px-3 py-3 text-transparent">-</td>
                <td className="px-3 py-3 text-transparent">-</td>
                <td className="px-3 py-3 text-transparent">-</td>
                <td className="px-3 py-3 text-transparent">-</td>
              </tr>
            ))}
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
    <section id="retained-buffer-leaders" className="live-stable scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          <div className="mb-5 flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <p className="section-heading text-cyan-300">Recent Retained Buffer Leaders</p>
                <PanelHelp
                  title="Recent Retained Buffer Leaders"
                  description="Shows the top ranked results from the retained results buffer. The engine retains recent results for analysis; all-time records are tracked separately in engine state."
                  align="left"
                />
              </div>
              <p className="panel-subtitle mt-1">
                Top retained results from the recent catalog buffer. These are not all-time records.
              </p>
            </div>
            <span
              className={`rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500 sm:self-start ${loading ? "" : "invisible"}`}
            >
              Updating...
            </span>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <LeaderboardTable
              title="Longest Trajectories (Retained Buffer)"
              type="trajectory"
              rows={topBySteps}
            />
            <LeaderboardTable
              title="Highest Peaks (Retained Buffer)"
              type="peak"
              rows={topByPeak}
            />
          </div>

          <p className="mt-5 text-center text-[11px] text-slate-400 dark:text-slate-500">
            These tables reflect the retained recent results buffer, not all-time engine records.
            All-time records (longest trajectory, highest peak) are tracked in engine state.
          </p>
        </div>

        <EventColorLegend variant="compact" className="mt-4" />
      </div>
    </section>
  );
}
