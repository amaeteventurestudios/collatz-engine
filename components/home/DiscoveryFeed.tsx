"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  Clock,
  Database,
  Gauge,
  GitBranch,
  Play,
  RefreshCw,
  Satellite,
  ShieldCheck,
  Signal,
  Sparkles,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { getRecentActivityLogs } from "@/lib/collatz/store";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { useCollatzLiveState } from "@/hooks/useCollatzLiveState";
import { formatLargeNumber } from "@/lib/collatz/format";
import type { ActivityLogRow } from "@/lib/collatz/store";

const FEED_LIMIT = 20;
const REFRESH_CADENCE_MS = 30_000;

type EventKind =
  | "batch_started"
  | "batch_completed"
  | "peak_record"
  | "trajectory_record"
  | "integrity"
  | "failed"
  | "general";

type ChipTone = "default" | "source" | "verified" | "warning";

interface EventVisual {
  Icon: LucideIcon;
  badge: string;
  badgeClass: string;
  cardClass: string;
  connectorClass: string;
  markerClass: string;
  chipClass: string;
  textureClass: string;
}

interface MetricChip {
  text: string;
  Icon?: LucideIcon;
  tone?: ChipTone;
  title?: string;
}

const EVENT_VISUALS: Record<EventKind, EventVisual> = {
  batch_started: {
    Icon: Play,
    badge: "Batch Started",
    badgeClass: "border-teal-300/40 bg-teal-400/10 text-teal-100 shadow-[0_0_18px_rgba(45,212,191,0.16)]",
    cardClass:
      "border-teal-400/35 bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(6,78,59,0.32))] shadow-[0_0_34px_rgba(20,184,166,0.14)] hover:border-teal-300/65 hover:shadow-[0_0_42px_rgba(20,184,166,0.22)]",
    connectorClass: "from-teal-300/80 to-transparent",
    markerClass:
      "border-teal-300/70 bg-teal-950 text-teal-100 shadow-[0_0_28px_rgba(45,212,191,0.46)]",
    chipClass: "border-teal-300/25 bg-teal-400/10 text-teal-100",
    textureClass:
      "bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.42)_1px,transparent_1.8px)] [background-size:18px_18px]",
  },
  batch_completed: {
    Icon: CheckCircle2,
    badge: "Verified Batch",
    badgeClass: "border-blue-300/45 bg-blue-500/15 text-blue-100 shadow-[0_0_18px_rgba(59,130,246,0.18)]",
    cardClass:
      "border-blue-400/40 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,64,175,0.34))] shadow-[0_0_34px_rgba(59,130,246,0.16)] hover:border-blue-300/70 hover:shadow-[0_0_46px_rgba(59,130,246,0.24)]",
    connectorClass: "from-blue-300/80 to-transparent",
    markerClass:
      "border-blue-300/75 bg-blue-950 text-blue-100 shadow-[0_0_30px_rgba(59,130,246,0.52)]",
    chipClass: "border-blue-300/25 bg-blue-500/10 text-blue-100",
    textureClass:
      "bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.42)_1px,transparent_1.8px)] [background-size:18px_18px]",
  },
  peak_record: {
    Icon: TrendingUp,
    badge: "Peak Record",
    badgeClass: "border-amber-300/50 bg-amber-400/15 text-amber-100 shadow-[0_0_18px_rgba(245,158,11,0.2)]",
    cardClass:
      "border-amber-300/45 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(120,53,15,0.34))] shadow-[0_0_36px_rgba(245,158,11,0.16)] hover:border-amber-200/75 hover:shadow-[0_0_48px_rgba(245,158,11,0.25)]",
    connectorClass: "from-amber-300/85 to-transparent",
    markerClass:
      "border-amber-300/80 bg-amber-950 text-amber-100 shadow-[0_0_32px_rgba(245,158,11,0.52)]",
    chipClass: "border-amber-300/25 bg-amber-400/10 text-amber-100",
    textureClass:
      "bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.44)_1px,transparent_1.8px)] [background-size:18px_18px]",
  },
  trajectory_record: {
    Icon: GitBranch,
    badge: "Trajectory Record",
    badgeClass: "border-violet-300/50 bg-violet-400/15 text-violet-100 shadow-[0_0_18px_rgba(139,92,246,0.2)]",
    cardClass:
      "border-violet-300/45 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(76,29,149,0.38))] shadow-[0_0_36px_rgba(139,92,246,0.17)] hover:border-violet-200/75 hover:shadow-[0_0_48px_rgba(139,92,246,0.26)]",
    connectorClass: "from-violet-300/85 to-transparent",
    markerClass:
      "border-violet-300/80 bg-violet-950 text-violet-100 shadow-[0_0_32px_rgba(139,92,246,0.52)]",
    chipClass: "border-violet-300/25 bg-violet-400/10 text-violet-100",
    textureClass:
      "bg-[radial-gradient(circle_at_center,rgba(167,139,250,0.44)_1px,transparent_1.8px)] [background-size:18px_18px]",
  },
  integrity: {
    Icon: ShieldCheck,
    badge: "Integrity Verified",
    badgeClass: "border-emerald-300/45 bg-emerald-400/12 text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.18)]",
    cardClass:
      "border-emerald-300/38 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(6,95,70,0.32))] shadow-[0_0_34px_rgba(16,185,129,0.15)] hover:border-emerald-200/70 hover:shadow-[0_0_44px_rgba(16,185,129,0.23)]",
    connectorClass: "from-emerald-300/80 to-transparent",
    markerClass:
      "border-emerald-300/75 bg-emerald-950 text-emerald-100 shadow-[0_0_30px_rgba(52,211,153,0.48)]",
    chipClass: "border-emerald-300/25 bg-emerald-400/10 text-emerald-100",
    textureClass:
      "bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.42)_1px,transparent_1.8px)] [background-size:18px_18px]",
  },
  failed: {
    Icon: CircleAlert,
    badge: "Engine Alert",
    badgeClass: "border-rose-300/45 bg-rose-400/15 text-rose-100 shadow-[0_0_18px_rgba(244,63,94,0.18)]",
    cardClass:
      "border-rose-300/38 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(127,29,29,0.32))] shadow-[0_0_34px_rgba(244,63,94,0.14)] hover:border-rose-200/70 hover:shadow-[0_0_44px_rgba(244,63,94,0.22)]",
    connectorClass: "from-rose-300/80 to-transparent",
    markerClass:
      "border-rose-300/75 bg-rose-950 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.45)]",
    chipClass: "border-rose-300/25 bg-rose-400/10 text-rose-100",
    textureClass:
      "bg-[radial-gradient(circle_at_center,rgba(251,113,133,0.4)_1px,transparent_1.8px)] [background-size:18px_18px]",
  },
  general: {
    Icon: Activity,
    badge: "Engine Event",
    badgeClass: "border-cyan-300/40 bg-cyan-400/10 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.16)]",
    cardClass:
      "border-cyan-300/32 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(8,47,73,0.32))] shadow-[0_0_32px_rgba(34,211,238,0.13)] hover:border-cyan-200/65 hover:shadow-[0_0_42px_rgba(34,211,238,0.21)]",
    connectorClass: "from-cyan-300/75 to-transparent",
    markerClass:
      "border-cyan-300/70 bg-cyan-950 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.44)]",
    chipClass: "border-cyan-300/25 bg-cyan-400/10 text-cyan-100",
    textureClass:
      "bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.42)_1px,transparent_1.8px)] [background-size:18px_18px]",
  },
};

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

function rangeLabel(log: ActivityLogRow): string | null {
  if (log.batch_start == null || log.batch_end == null) return null;
  return `n = ${fmtNumber(log.batch_start)} – ${fmtNumber(log.batch_end)}`;
}

function metadataRecord(log: ActivityLogRow): Record<string, unknown> {
  if (!log.metadata || typeof log.metadata !== "object" || Array.isArray(log.metadata)) {
    return {};
  }
  return log.metadata;
}

function metadataNumber(log: ActivityLogRow, keys: string[]): number | null {
  const metadata = metadataRecord(log);
  for (const key of keys) {
    const value = metadata[key];
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function metadataString(log: ActivityLogRow, keys: string[]): string | null {
  const metadata = metadataRecord(log);
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function isFresh(iso: string | undefined, now: Date): boolean {
  if (!iso) return false;
  return now.getTime() - new Date(iso).getTime() < 60_000;
}

function detectEventKind(log: ActivityLogRow): EventKind {
  const eventType = log.event_type.toLowerCase();
  const message = log.message.toLowerCase();

  if (eventType.includes("failed") || eventType.includes("error")) return "failed";
  if (eventType === "batch_started") return "batch_started";
  if (eventType === "batch_completed") return "batch_completed";
  if (
    eventType.includes("verification_passed") ||
    eventType.includes("integrity") ||
    eventType.includes("heartbeat_ok") ||
    eventType.includes("worker_recovered")
  ) {
    return "integrity";
  }
  if (eventType === "record_updated" || eventType.includes("record")) {
    if (
      message.includes("trajectory") ||
      message.includes("longest") ||
      metadataNumber(log, ["steps", "new_steps", "longest_steps", "longest_steps_in_batch"]) != null
    ) {
      return "trajectory_record";
    }
    if (
      message.includes("peak") ||
      metadataNumber(log, ["peak", "new_peak", "highest_peak", "highest_peak_in_batch"]) != null
    ) {
      return "peak_record";
    }
    return "peak_record";
  }
  return "general";
}

function eventHeadline(log: ActivityLogRow, kind: EventKind): string {
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

function eventSubline(log: ActivityLogRow, kind: EventKind): string | null {
  if (kind === "batch_completed") return rangeLabel(log);
  if (kind === "peak_record" || kind === "trajectory_record") {
    const n = metadataNumber(log, ["n", "number", "record_n", "candidate_n"]) ?? log.batch_start;
    return n != null ? `n = ${fmtNumber(n)}` : null;
  }
  if (kind === "general" || kind === "failed") return rangeLabel(log);
  return null;
}

function batchSizeChip(log: ActivityLogRow): MetricChip | null {
  if (log.numbers_processed == null) return null;
  return {
    text: `${fmtNumber(log.numbers_processed)}-number batch`,
    Icon: Database,
  };
}

function eventMetricChips(log: ActivityLogRow, kind: EventKind, now: Date): MetricChip[] {
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
      Icon: kind === "failed" ? CircleAlert : Activity,
      tone: kind === "failed" ? "warning" : "default",
    });
  }
  chips.push({ text: "Source: engine", Icon: Signal, tone: "source" });
  return chips;
}

function chipClass(visual: EventVisual, tone: ChipTone = "default"): string {
  if (tone === "verified") {
    return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
  }
  if (tone === "source") {
    return "border-cyan-300/25 bg-cyan-400/10 text-cyan-100";
  }
  if (tone === "warning") {
    return "border-rose-300/30 bg-rose-400/10 text-rose-100";
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
    <div className="flex min-w-0 items-center gap-2.5 border-cyan-300/10 px-3 py-4 sm:border-r sm:px-4 sm:last:border-r-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.18)] sm:h-10 sm:w-10">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[9px] font-semibold uppercase leading-tight tracking-[0.14em] text-slate-400 sm:text-[10px]">
          {label}
        </p>
        <p className="mt-1 max-w-full break-words font-mono text-[13px] font-bold leading-snug text-slate-50 sm:text-sm">
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

  return (
    <div className="relative min-h-[6.25rem] overflow-hidden rounded-2xl border border-blue-300/25 bg-slate-950/70 px-5 py-4 shadow-[0_0_34px_rgba(37,99,235,0.16)]">
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-45 [mask-image:linear-gradient(to_left,black,transparent)] bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.44)_1px,transparent_1.8px)] [background-size:16px_16px]"
        aria-hidden="true"
      />
      <div className="relative flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-violet-300/35 bg-violet-500/10 text-violet-100 shadow-[0_0_28px_rgba(139,92,246,0.24)]">
          <Satellite className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Engine Status
          </p>
          <p
            className={`mt-1 font-mono text-2xl font-black uppercase leading-none tracking-[0.08em] ${
              isActive ? "text-teal-200 glow-teal" : "text-slate-200"
            }`}
          >
            {isActive ? "Active" : status}
          </p>
          {currentN != null && (
            <p className="mt-2 font-mono text-xs text-slate-300">
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
  visual: EventVisual;
}) {
  const Icon = chip.Icon;

  return (
    <span
      title={chip.title}
      className={`inline-flex max-w-full items-center gap-2 rounded-xl border px-3 py-2 font-mono text-[11px] font-semibold leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${chipClass(
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
  const kind = detectEventKind(log);
  const visual = EVENT_VISUALS[kind];
  const Icon = visual.Icon;
  const chips = eventMetricChips(log, kind, now);
  const headline = eventHeadline(log, kind);
  const subline = eventSubline(log, kind);
  const fresh = isFresh(log.created_at, now);

  return (
    <article className="relative pl-14 sm:pl-24">
      <div
        className={`absolute left-10 top-9 hidden h-px w-6 bg-gradient-to-r sm:left-16 sm:block sm:w-8 ${visual.connectorClass}`}
        aria-hidden="true"
      />
      <div
        className={`absolute left-0 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border sm:h-16 sm:w-16 ${visual.markerClass} ${
          fresh ? "motion-safe:animate-pulse" : ""
        }`}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
      </div>

      <div
        className={`group relative min-w-0 overflow-hidden rounded-2xl border p-4 transition duration-300 sm:p-5 ${visual.cardClass} ${
          index === 0 ? "ring-1 ring-white/10" : ""
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 opacity-35 [mask-image:linear-gradient(to_left,black,transparent)] sm:block ${visual.textureClass}`}
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

        <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${visual.badgeClass}`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {visual.badge}
              </span>
              {index === 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-100">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Newest
                </span>
              )}
            </div>
            <h3 className="break-words text-lg font-bold leading-snug text-slate-50 sm:text-xl">
              {headline}
            </h3>
            {subline && (
              <p className="mt-1.5 font-mono text-sm leading-relaxed text-slate-300">
                {subline}
              </p>
            )}
          </div>

          {chips.length > 0 && (
            <div className="flex min-w-0 flex-wrap gap-2 lg:max-w-[34rem] lg:justify-end">
              {chips.map((chip) => (
                <MetricChipView key={`${chip.text}-${chip.title ?? ""}`} chip={chip} visual={visual} />
              ))}
            </div>
          )}

          <div className="flex shrink-0 flex-row items-center justify-between gap-4 border-t border-white/10 pt-3 lg:min-w-32 lg:flex-col lg:items-end lg:border-t-0 lg:pt-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100">
              {relativeTime(log.created_at, now)}
            </p>
            <p className="font-mono text-sm font-semibold tabular-nums text-slate-200">
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
          <div key={index} className="relative pl-14 sm:pl-24">
            <div className="absolute left-0 top-3 h-10 w-10 animate-pulse rounded-full border border-cyan-300/20 bg-cyan-300/10 sm:h-16 sm:w-16" />
            <div className="rounded-2xl border border-cyan-300/10 bg-slate-900/60 p-5">
              <div className="h-5 w-32 animate-pulse rounded bg-slate-800" />
              <div className="mt-4 h-6 w-full max-w-lg animate-pulse rounded bg-slate-800" />
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="h-9 w-36 animate-pulse rounded-xl bg-slate-800" />
                <div className="h-9 w-28 animate-pulse rounded-xl bg-slate-800" />
                <div className="h-9 w-32 animate-pulse rounded-xl bg-slate-800" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-cyan-300/25 bg-slate-950/70 px-6 py-12 text-center shadow-[0_0_34px_rgba(34,211,238,0.08)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.18)]">
        <Activity className="h-7 w-7" aria-hidden="true" />
      </div>
      <p className="mt-5 text-lg font-bold text-slate-50">
        No new records in this refresh window.
      </p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
        The engine is still processing verified batches. New peak and trajectory
        records will appear here when the live run produces them.
      </p>
      <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-teal-300/25 bg-teal-400/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-teal-100">
        <span className="h-2 w-2 rounded-full bg-teal-300 motion-safe:animate-pulse" />
        Watching engine stream
      </span>
    </div>
  );
}

export function DiscoveryFeed() {
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());
  const { state } = useCollatzLiveState(REFRESH_CADENCE_MS);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const rows = await getRecentActivityLogs(FEED_LIMIT);
      if (!isMounted) return;
      setLogs(rows);
      setLoaded(true);
      setLastRefreshedAt(new Date());
    }

    load();
    const interval = window.setInterval(load, REFRESH_CADENCE_MS);
    const clock = window.setInterval(() => setNow(new Date()), 1_000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
      window.clearInterval(clock);
    };
  }, []);

  const refreshedLabel = refreshAge(lastRefreshedAt, now);
  const eventCountLabel = loaded ? logs.length.toLocaleString("en-US") : "Loading";
  const latestEventsValue = loaded ? `Showing ${logs.length.toLocaleString("en-US")}` : "Loading";
  const currentN = state ? Number(state.last_checked_number ?? 0) + 1 : null;
  const engineStatus = state?.current_status ?? null;

  return (
    <section
      id="feed"
      className="relative isolate scroll-mt-20 overflow-hidden border-y border-cyan-300/10 bg-slate-950 px-4 py-12 text-slate-100 sm:px-6 sm:py-16"
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
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-mono text-2xl font-black uppercase tracking-[0.14em] text-slate-50 min-[420px]:text-3xl sm:text-4xl sm:tracking-[0.18em]">
                Discovery Feed
              </h2>
              <PanelHelp
                title="Discovery Feed"
                description="Shows verified activity from the live Collatz engine, including batch starts, completed checks, record events, and integrity updates. The feed is based on persisted engine activity, not simulated events."
                align="left"
              />
            </div>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-300">
              Verified live events from the autonomous Collatz engine.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-400/10 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-100 shadow-[0_0_28px_rgba(16,185,129,0.22)]">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)] motion-safe:animate-pulse" />
              Live Engine Stream
            </span>
            <span className="inline-flex items-center rounded-full border border-blue-300/35 bg-blue-500/10 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100 shadow-[0_0_24px_rgba(59,130,246,0.18)]">
              {eventCountLabel} {loaded && logs.length === 1 ? "Event" : "Events"}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,32rem)]">
          <div className="grid overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-950/70 shadow-[0_0_34px_rgba(14,165,233,0.1)] sm:grid-cols-2 xl:grid-cols-4">
            <MetadataItem Icon={Clock} label="Last Refreshed" value={refreshedLabel} />
            <MetadataItem Icon={Activity} label="Latest Events" value={latestEventsValue} />
            <MetadataItem Icon={ShieldCheck} label="Source" value="Verified Engine" />
            <MetadataItem Icon={RefreshCw} label="Refresh Cadence" value="30 seconds" />
          </div>

          {engineStatus && (
            <EngineStatusCard status={engineStatus} currentN={currentN} />
          )}
        </div>

        {!loaded ? (
          <TimelineSkeleton />
        ) : logs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="relative mt-8">
            <div
              className="absolute bottom-7 left-5 top-7 w-px bg-cyan-200/60 shadow-[0_0_22px_rgba(34,211,238,0.75)] sm:left-8"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-7 left-[17px] top-7 w-[7px] rounded-full bg-cyan-300/10 blur-sm sm:left-[29px]"
              aria-hidden="true"
            />
            <div className="space-y-4">
              {logs.map((log, index) => (
                <TimelineCard key={log.id ?? `${log.event_type}-${index}`} log={log} index={index} now={now} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
