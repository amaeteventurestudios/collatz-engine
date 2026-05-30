"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock,
  Database,
  Gauge,
  GitBranch,
  RefreshCw,
  Satellite,
  ShieldCheck,
  Signal,
  Sparkles,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { EventColorLegend } from "@/components/collatz/EventColorLegend";
import { useCollatzLiveState } from "@/hooks/useCollatzLiveState";
import { useSafePolling } from "@/hooks/useSafePolling";
import { formatLargeNumber } from "@/lib/collatz/format";
import { COLLATZ_POLL_MS } from "@/lib/collatz/cache-policy";
import {
  EVENT_COLORS,
  getActivityLogEventKind,
  getEventVisualStyle,
  metadataNumber,
  metadataString,
  type CollatzEventKind,
  type EventVisualStyle,
} from "@/lib/collatz/event-visuals";
import type { ActivityLogRow } from "@/lib/collatz/store";
import type { DashboardEvent } from "@/app/api/collatz/dashboard/route";

const REFRESH_CADENCE_MS = COLLATZ_POLL_MS.PUBLIC_DASHBOARD;

type ChipTone = "default" | "source" | "verified";

interface MetricChip {
  text: string;
  Icon?: LucideIcon;
  tone?: ChipTone;
  title?: string;
}

function fmtNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return Math.trunc(value).toLocaleString("en-US");
}

function fmtDuration(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  return `${Math.trunc(ms).toLocaleString("en-US")} ms`;
}

function fmtRate(rate: number | null | undefined): string | null {
  if (rate == null || !Number.isFinite(Number(rate)) || Number(rate) <= 0) {
    return null;
  }
  return `${Number(rate).toFixed(1)}/sec`;
}

function relativeTime(iso: string | undefined, now: Date): string {
  if (!iso) return "timestamp pending";
  const ms = now.getTime() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function timestampLabel(iso: string | undefined): string {
  if (!iso) return "Awaiting time";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function refreshAge(date: Date | null, now: Date): string {
  if (!date) return "not yet refreshed";
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

function logIdentity(log: ActivityLogRow): string {
  return String(
    log.id ??
      `${log.event_type}-${log.created_at ?? "pending"}-${log.batch_start ?? "x"}-${log.message}`,
  );
}

function sameLogList(a: ActivityLogRow[], b: ActivityLogRow[]): boolean {
  return a.length === b.length && a.every((log, index) => logIdentity(log) === logIdentity(b[index]));
}

function countNewLogs(next: ActivityLogRow[], current: ActivityLogRow[]): number {
  const currentIds = new Set(current.map(logIdentity));
  return next.filter((log) => !currentIds.has(logIdentity(log))).length;
}

function rangeLabel(log: ActivityLogRow): string | null {
  if (log.batch_start == null || log.batch_end == null) return null;
  return `n = ${fmtNumber(log.batch_start)} to ${fmtNumber(log.batch_end)}`;
}

function isFresh(iso: string | undefined, now: Date): boolean {
  if (!iso) return false;
  return now.getTime() - new Date(iso).getTime() < 60_000;
}

function eventHeadline(log: ActivityLogRow, kind: CollatzEventKind): string {
  const range = rangeLabel(log);
  const processed = log.numbers_processed;

  if (kind === "batch_completed" && processed != null) {
    return `Batch completed: ${fmtNumber(processed)} numbers verified`;
  }
  if (kind === "batch_started" && range) {
    return `Batch started: ${range}`;
  }
  if (kind === "peak_record") return "New highest peak recorded";
  if (kind === "trajectory_record") return "New longest trajectory recorded";
  if (kind === "integrity") {
    if (log.event_type === "verification_passed") return "Engine integrity check passed";
    if (log.event_type === "heartbeat_ok") return "Engine heartbeat verified";
    if (log.event_type === "worker_recovered") return "Engine stream recovered";
  }

  return log.message;
}

function eventSubline(log: ActivityLogRow, kind: CollatzEventKind): string | null {
  if (kind === "batch_completed") return rangeLabel(log);
  if (kind === "peak_record" || kind === "trajectory_record") {
    const n = metadataNumber(log, ["n", "number", "record_n", "candidate_n"]) ?? log.batch_start;
    return n != null ? `n = ${fmtNumber(n)}` : null;
  }
  if (kind === "unknown") return rangeLabel(log);
  return null;
}

function batchSizeChip(log: ActivityLogRow): MetricChip | null {
  if (log.numbers_processed == null) return null;
  return {
    text: `${fmtNumber(log.numbers_processed)}-number batch`,
    Icon: Database,
  };
}

function eventMetricChips(log: ActivityLogRow, kind: CollatzEventKind, now: Date): MetricChip[] {
  const chips: MetricChip[] = [];
  const range = rangeLabel(log);
  const duration = fmtDuration(log.duration_ms);
  const rate = fmtRate(log.numbers_per_second);

  if (kind === "batch_completed") {
    if (range) chips.push({ text: range, Icon: Database });
    if (duration) chips.push({ text: duration, Icon: Gauge, title: "Duration" });
    if (rate) chips.push({ text: rate, Icon: Zap, title: "Throughput" });
    chips.push({ text: "Source: engine", Icon: Signal, tone: "source" });
    chips.push({ text: "Verified", Icon: ShieldCheck, tone: "verified" });
    return chips;
  }

  if (kind === "batch_started") {
    const batch = batchSizeChip(log);
    if (batch) chips.push(batch);
    chips.push({ text: "Engine active", Icon: Activity });
    if (isFresh(log.created_at, now)) chips.push({ text: "Queued just now", Icon: Clock });
    return chips;
  }

  if (kind === "peak_record") {
    const n = metadataNumber(log, ["n", "number", "record_n", "candidate_n"]) ?? log.batch_start;
    const peak = metadataNumber(log, ["peak", "new_peak", "highest_peak", "highest_peak_in_batch", "peak_value"]);
    const previousPeak = metadataNumber(log, ["previous_peak", "previous_highest_peak", "previous_value"]);
    if (n != null) chips.push({ text: `n = ${fmtNumber(n)}`, Icon: Database });
    if (peak != null) chips.push({ text: `Peak = ${formatLargeNumber(peak)}`, Icon: TrendingUp });
    if (previousPeak != null) chips.push({ text: `Previous = ${formatLargeNumber(previousPeak)}`, Icon: Activity });
    chips.push({ text: "Verified result", Icon: ShieldCheck, tone: "verified" });
    return chips;
  }

  if (kind === "trajectory_record") {
    const n = metadataNumber(log, ["n", "number", "record_n", "candidate_n"]) ?? log.batch_start;
    const steps = metadataNumber(log, ["steps", "new_steps", "longest_steps", "longest_steps_in_batch", "steps_to_1"]);
    const peak = metadataNumber(log, ["peak", "peak_value", "highest_peak_in_batch"]);
    if (n != null) chips.push({ text: `n = ${fmtNumber(n)}`, Icon: Database });
    if (steps != null) chips.push({ text: `Steps = ${fmtNumber(steps)}`, Icon: GitBranch });
    if (peak != null) chips.push({ text: `Peak = ${formatLargeNumber(peak)}`, Icon: TrendingUp });
    chips.push({ text: "Verified result", Icon: ShieldCheck, tone: "verified" });
    return chips;
  }

  if (kind === "integrity") {
    const heartbeatAge = metadataNumber(log, ["heartbeat_age_seconds"]);
    const cataloged = metadataNumber(log, ["numbers_cataloged"]);
    if (log.event_type === "verification_passed") {
      chips.push({ text: "State consistent", Icon: ShieldCheck, tone: "verified" });
      chips.push({ text: "Persistence confirmed", Icon: Database });
      chips.push({ text: "Verified", Icon: CheckCircle2, tone: "verified" });
    } else {
      chips.push({ text: "State consistent", Icon: ShieldCheck, tone: "verified" });
      if (heartbeatAge != null) chips.push({ text: `Heartbeat ${fmtNumber(heartbeatAge)}s`, Icon: Signal });
      if (cataloged != null) chips.push({ text: `${fmtNumber(cataloged)} cataloged`, Icon: Database });
    }
    return chips;
  }

  if (range) chips.push({ text: range, Icon: Database });
  if (log.numbers_processed != null) {
    chips.push({ text: `${fmtNumber(log.numbers_processed)} numbers`, Icon: Database });
  }
  if (duration) chips.push({ text: duration, Icon: Gauge });
  if (rate) chips.push({ text: rate, Icon: Zap });
  const severity = metadataString(log, ["severity"]);
  if (severity) {
    chips.push({
      text: severity,
      Icon: Activity,
      tone: "default",
    });
  }
  chips.push({ text: "Source: engine", Icon: Signal, tone: "source" });
  return chips;
}

function chipClass(visual: EventVisualStyle, tone: ChipTone = "default"): string {
  if (tone === "verified") {
    return EVENT_COLORS.emerald.chip;
  }
  if (tone === "source") {
    return EVENT_COLORS.slate.chip;
  }
  return visual.chipClass;
}

function MetadataItem({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2.5 border-slate-700/70 px-3 py-4 text-center sm:flex-row sm:border-r sm:px-4 sm:text-left sm:last:border-r-0">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border sm:h-10 sm:w-10 ${EVENT_COLORS.slate.chip}`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="card-label leading-tight text-slate-400 sm:text-[10px]">
          {label}
        </p>
        <p className="live-value mt-1 text-[13px] font-semibold leading-snug text-slate-50 sm:text-sm">
          {value}
        </p>
      </div>
    </div>
  );
}

function EngineStatusCard({
  status,
  currentN,
}: {
  status: string;
  currentN: number | null;
}) {
  const isActive = status.toLowerCase() === "running";
  const visual = getEventVisualStyle(isActive ? "active" : "unknown");

  return (
    <div className={`relative min-h-[6.25rem] overflow-hidden rounded-2xl border bg-slate-950/70 px-5 py-4 shadow-2xl ${visual.borderClass} ${visual.glowClass}`}>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-45 [mask-image:linear-gradient(to_left,black,transparent)] bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.44)_1px,transparent_1.8px)] [background-size:16px_16px]"
        aria-hidden="true"
      />
        <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border ${visual.markerClass}`}>
          <Satellite className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <p className="card-label text-slate-400">
            Engine Status
          </p>
          <p
            className={`mt-1 text-2xl font-bold leading-none tracking-tight ${
              isActive ? visual.textClass : "text-slate-200"
            }`}
          >
            {isActive ? "Active" : status}
          </p>
          {currentN != null && (
            <p className="mt-2 text-xs tabular-nums text-slate-300">
              n = {fmtNumber(currentN)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricChipView({
  chip,
  visual,
}: {
  chip: MetricChip;
  visual: EventVisualStyle;
}) {
  const Icon = chip.Icon;

  return (
    <span
      title={chip.title}
      className={`shrink-0 metadata-chip shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${chipClass(
        visual,
        chip.tone,
      )}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      <span className="min-w-0 break-words leading-snug">{chip.text}</span>
    </span>
  );
}

function TimelineCard({
  log,
  index,
  now,
}: {
  log: ActivityLogRow;
  index: number;
  now: Date;
}) {
  const kind = getActivityLogEventKind(log);
  const visual = getEventVisualStyle(kind);
  const Icon = visual.icon;
  const chips = eventMetricChips(log, kind, now);
  const headline = eventHeadline(log, kind);
  const subline = eventSubline(log, kind);
  const fresh = isFresh(log.created_at, now);

  return (
    <article className="relative pl-0 sm:pl-24">
      <div
        className={`absolute left-10 top-9 hidden h-px w-6 bg-gradient-to-r sm:left-16 sm:block sm:w-8 ${visual.railClass}`}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border sm:absolute sm:left-0 sm:top-3 sm:mx-0 sm:mb-0 sm:h-16 sm:w-16 ${visual.markerClass} ${
          fresh ? "motion-safe:animate-pulse" : ""
        }`}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
      </div>

      <div
        className={`group relative min-w-0 overflow-hidden rounded-2xl border p-4 shadow-2xl transition duration-300 hover:border-white/20 sm:p-5 ${visual.borderClass} ${visual.backgroundClass} ${visual.glowClass} ${
          index === 0 ? "ring-1 ring-white/10" : ""
        }`}
      >
        <div
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 opacity-25 [mask-image:linear-gradient(to_left,black,transparent)] [background-size:18px_18px] sm:block"
          style={{
            backgroundImage: `radial-gradient(circle at center, ${visual.accentColor}55 1px, transparent 1.8px)`,
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04),transparent_28%,transparent_72%,rgba(255,255,255,0.04))] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden="true"
        />
        {kind === "batch_completed" && (
          <span
            className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-blue-200/70 to-transparent opacity-70"
            aria-hidden="true"
          />
        )}

        <div className="relative grid gap-4 text-center lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center lg:text-left">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <span
                className={`engine-badge ${visual.badgeClass}`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {visual.label}
              </span>
              {index === 0 && (
                <span className="engine-badge border-cyan-300/20 bg-cyan-300/10 px-2.5 text-cyan-100">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Newest
                </span>
              )}
            </div>
            <h3 className="break-words text-lg font-bold leading-snug text-slate-50 sm:text-xl">
              {headline}
            </h3>
            {subline && (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                {subline}
              </p>
            )}
          </div>

          {chips.length > 0 && (
            <div className="no-scrollbar flex min-w-0 gap-2 overflow-x-auto pb-0.5 lg:flex-wrap lg:overflow-visible lg:pb-0 lg:max-w-[34rem] lg:justify-end">
              {chips.map((chip) => (
                <MetricChipView key={`${chip.text}-${chip.title ?? ""}`} chip={chip} visual={visual} />
              ))}
            </div>
          )}

          <div className="flex shrink-0 flex-row items-center justify-center gap-4 border-t border-white/10 pt-3 lg:min-w-32 lg:flex-col lg:items-end lg:border-t-0 lg:pt-0">
            <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan-100">
              {relativeTime(log.created_at, now)}
            </p>
            <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-200">
              {timestampLabel(log.created_at)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function TimelineSkeleton() {
  return (
    <div className="relative mt-8">
      <div
        className="absolute bottom-6 left-5 top-6 w-px bg-cyan-300/20 shadow-[0_0_18px_rgba(34,211,238,0.4)] sm:left-8"
        aria-hidden="true"
      />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="relative pl-0 sm:pl-24">
            <div className="relative mx-auto mb-3 h-10 w-10 rounded-full border border-cyan-300/20 bg-cyan-300/10 motion-safe:animate-pulse sm:absolute sm:left-0 sm:top-3 sm:mx-0 sm:mb-0 sm:h-16 sm:w-16" />
            <div className="rounded-2xl border border-cyan-300/10 bg-slate-900/60 p-5">
              <div className="h-5 w-32 rounded bg-slate-800 motion-safe:animate-pulse" />
              <div className="mt-4 h-6 w-full max-w-lg rounded bg-slate-800 motion-safe:animate-pulse" />
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="h-9 w-36 rounded-xl bg-slate-800 motion-safe:animate-pulse" />
                <div className="h-9 w-28 rounded-xl bg-slate-800 motion-safe:animate-pulse" />
                <div className="h-9 w-32 rounded-xl bg-slate-800 motion-safe:animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  const visual = getEventVisualStyle("active");

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-cyan-300/25 bg-slate-950/70 px-6 py-12 text-center shadow-[0_0_34px_rgba(34,211,238,0.08)]">
      <div className="relative mx-auto h-16 w-16">
        <span
          className={`absolute inset-0 rounded-full border ${visual.borderClass} ${visual.subtleBackgroundClass} motion-safe:animate-ping`}
          aria-hidden="true"
        />
        <div className={`relative flex h-16 w-16 items-center justify-center rounded-full border ${visual.markerClass}`}>
          <Signal className="h-7 w-7" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-5 text-lg font-bold text-slate-50">
        No new records in this refresh window.
      </p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
        The engine is still processing verified batches. New peak and trajectory
        records will appear here when the live run produces them.
      </p>
      <span className={`mt-5 engine-badge ${visual.badgeClass}`}>
        <span className={`h-2 w-2 rounded-full ${visual.dotClass} motion-safe:animate-pulse`} />
        Watching engine stream
      </span>
    </div>
  );
}

function dashboardEventToActivityLog(event: DashboardEvent): ActivityLogRow {
  return {
    id: event.id ?? undefined,
    event_type: event.eventType,
    message: event.message,
    batch_start: event.batchStart,
    batch_end: event.batchEnd,
    numbers_processed: event.numbersProcessed,
    duration_ms: event.durationMs,
    numbers_per_second: event.numbersPerSecond,
    metadata: event.metadata ?? {},
    created_at: event.createdAt ?? undefined,
  };
}

export function DiscoveryFeed() {
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const logsRef = useRef<ActivityLogRow[]>([]);
  const [pendingLogs, setPendingLogs] = useState<ActivityLogRow[] | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());
  const { state } = useCollatzLiveState(REFRESH_CADENCE_MS);

  const load = useCallback(async (signal: AbortSignal) => {
    const res = await fetch("/api/collatz/dashboard", { signal });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error("Public discovery feed unavailable.");
    const rows = ((json.meaningfulEvents ?? []) as DashboardEvent[]).map(dashboardEventToActivityLog);

    const currentLogs = logsRef.current;
    if (currentLogs.length === 0 || sameLogList(rows, currentLogs)) {
      logsRef.current = rows;
      setLogs(rows);
      setPendingLogs(null);
      setPendingCount(0);
    } else {
      const newRows = countNewLogs(rows, currentLogs);
      if (newRows > 0) {
        setPendingLogs(rows);
        setPendingCount(newRows);
      } else {
        logsRef.current = rows;
        setLogs(rows);
        setPendingLogs(null);
        setPendingCount(0);
      }
    }

    setLoaded(true);
    setLastRefreshedAt(json.generatedAt ? new Date(json.generatedAt as string) : new Date());
  }, []);

  useSafePolling({
    intervalMs: REFRESH_CADENCE_MS,
    minIntervalMs: 60_000,
    staleAfterMs: REFRESH_CADENCE_MS * 2,
    poll: load,
  });

  useEffect(() => {
    // 30s precision is enough: relativeTime only changes at minute boundaries
    // for entries > 60s old, and "just now" is stable for the first 60s.
    // Reducing from 1s to 30s eliminates per-second re-renders of all 20 cards.
    const clock = window.setInterval(() => setNow(new Date()), 30_000);
    return () => {
      window.clearInterval(clock);
    };
  }, []);

  function applyPendingLogs() {
    if (!pendingLogs) return;
    logsRef.current = pendingLogs;
    setLogs(pendingLogs);
    setPendingLogs(null);
    setPendingCount(0);
  }

  const refreshedLabel = refreshAge(lastRefreshedAt, now);
  const eventCountLabel = loaded
    ? pendingCount > 0
      ? `${logs.length.toLocaleString("en-US")} + ${pendingCount.toLocaleString("en-US")} new`
      : logs.length.toLocaleString("en-US")
    : "Loading";
  const latestEventsValue = loaded
    ? pendingCount > 0
      ? `${pendingCount.toLocaleString("en-US")} new available`
      : `Showing ${logs.length.toLocaleString("en-US")}`
    : "Loading";
  const currentN = state ? Number(state.last_checked_number ?? 0) + 1 : null;
  const engineStatus = state?.current_status ?? null;
  const liveVisual = getEventVisualStyle("active");
  const countVisual = getEventVisualStyle("unknown");

  return (
    <section
      id="feed"
      className="live-stable relative isolate scroll-mt-20 overflow-hidden border-y border-cyan-300/10 bg-slate-950 px-4 py-12 text-slate-100 sm:px-6 sm:py-16"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,rgba(34,211,238,0.16),transparent_24%),radial-gradient(circle_at_84%_16%,rgba(59,130,246,0.15),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.2),rgba(2,6,23,0.92))]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_72%)] bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:42px_42px]"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-5 text-center lg:flex-row lg:items-start lg:justify-between lg:text-left">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <h2 className="text-2xl font-bold tracking-tight text-slate-50 min-[420px]:text-3xl sm:text-4xl">
                Discovery Feed
              </h2>
              <PanelHelp
                title="Discovery Feed"
                description="Shows public-safe scientific milestones from the Collatz engine, such as record trajectories, high peaks, verified milestones, and Observatory insights."
                align="left"
              />
              <PanelHelp
                title="Public Milestones"
                description="Operational logs, admin actions, worker incidents, and raw errors are intentionally kept inside authenticated admin views."
                align="left"
              />
            </div>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-300 lg:mx-0">
              Public-safe computational milestones from the autonomous Collatz engine.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-end">
            <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] shadow-2xl ${liveVisual.badgeClass} ${liveVisual.glowClass}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${liveVisual.dotClass} shadow-[0_0_14px_rgba(34,211,238,0.8)] motion-safe:animate-pulse`} />
              Live Engine Stream
            </span>
            <span className={`inline-flex items-center rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] ${countVisual.badgeClass}`}>
              {eventCountLabel} {loaded && logs.length === 1 ? "Event" : "Events"}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,32rem)]">
          <div className="grid overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950/70 shadow-[0_0_34px_rgba(14,165,233,0.1)] sm:grid-cols-2 xl:grid-cols-5">
            <MetadataItem Icon={Clock} label="Last Refreshed" value={refreshedLabel} />
            <MetadataItem Icon={Activity} label="Latest Events" value={latestEventsValue} />
            <MetadataItem Icon={ShieldCheck} label="Source" value="Verified Engine" />
            <MetadataItem Icon={RefreshCw} label="Refresh Cadence" value="30 seconds" />
            <MetadataItem Icon={Satellite} label="Engine Status" value={engineStatus ?? "Loading"} />
          </div>

          <div className={engineStatus ? "" : "invisible"}>
            <EngineStatusCard status={engineStatus ?? "Loading"} currentN={currentN} />
          </div>
        </div>

        <div className="mt-6 flex min-h-[2.75rem] items-center justify-center">
          {pendingCount > 0 ? (
            <button
              type="button"
              onClick={applyPendingLogs}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${liveVisual.badgeClass} hover:bg-cyan-300/15`}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {pendingCount.toLocaleString("en-US")} new {pendingCount === 1 ? "event" : "events"} available
            </button>
          ) : (
            <span className="invisible inline-flex rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em]">
              No new activity
            </span>
          )}
        </div>

        {!loaded ? (
          <TimelineSkeleton />
        ) : logs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="relative mt-8">
            <div
              className={`absolute bottom-7 left-5 top-7 hidden w-px sm:left-8 sm:block ${liveVisual.lineClass}`}
              aria-hidden="true"
            />
            <div
              className={`absolute bottom-7 left-[17px] top-7 hidden w-[7px] rounded-full blur-sm sm:left-[29px] sm:block ${liveVisual.subtleBackgroundClass}`}
              aria-hidden="true"
            />
            <div className="space-y-4">
              {logs.map((log, index) => (
                <TimelineCard key={logIdentity(log)} log={log} index={index} now={now} />
              ))}
            </div>
          </div>
        )}

        <EventColorLegend surface="dark" className="mt-6" />
      </div>
    </section>
  );
}
