import {
  Activity,
  CheckCircle2,
  Play,
  Route,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { ActivityLogRow } from "@/lib/collatz/store";

export type EventColorKey =
  | "cyan"
  | "blue"
  | "emerald"
  | "amber"
  | "violet"
  | "slate";

export type CollatzEventKind =
  | "active"
  | "batch_started"
  | "batch_completed"
  | "completed"
  | "verified"
  | "peak_record"
  | "trajectory_record"
  | "integrity"
  | "health_passed"
  | "unknown";

export interface EventColorStyle {
  name: string;
  text: string;
  border: string;
  bg: string;
  chip: string;
  glow: string;
  ring: string;
  dot: string;
  marker: string;
  rail: string;
  line: string;
  subtleBorder: string;
  subtleBg: string;
  svg: string;
}

export interface EventVisualStyle {
  kind: CollatzEventKind;
  label: string;
  icon: LucideIcon;
  accent: EventColorKey;
  accentColor: string;
  borderClass: string;
  backgroundClass: string;
  textClass: string;
  glowClass: string;
  chipClass: string;
  markerClass: string;
  railClass: string;
  badgeClass: string;
  ringClass: string;
  dotClass: string;
  lineClass: string;
  subtleBorderClass: string;
  subtleBackgroundClass: string;
}

export const EVENT_COLORS: Record<EventColorKey, EventColorStyle> = {
  cyan: {
    name: "Cyan / Teal",
    text: "text-cyan-300",
    border: "border-cyan-400/40",
    bg: "bg-cyan-950/25",
    chip: "bg-cyan-400/10 text-cyan-200 border-cyan-300/30",
    glow: "shadow-cyan-500/20",
    ring: "ring-cyan-400/20",
    dot: "bg-cyan-300",
    marker:
      "border-cyan-300/70 bg-cyan-950 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.42)]",
    rail: "from-cyan-300/80 to-transparent",
    line: "bg-cyan-200/60 shadow-[0_0_22px_rgba(34,211,238,0.65)]",
    subtleBorder: "border-cyan-300/20",
    subtleBg: "bg-cyan-400/10",
    svg: "#22d3ee",
  },
  blue: {
    name: "Electric Blue",
    text: "text-blue-300",
    border: "border-blue-400/40",
    bg: "bg-blue-950/25",
    chip: "bg-blue-400/10 text-blue-200 border-blue-300/30",
    glow: "shadow-blue-500/20",
    ring: "ring-blue-400/20",
    dot: "bg-blue-300",
    marker:
      "border-blue-300/75 bg-blue-950 text-blue-100 shadow-[0_0_30px_rgba(59,130,246,0.46)]",
    rail: "from-blue-300/80 to-transparent",
    line: "bg-blue-200/60 shadow-[0_0_22px_rgba(59,130,246,0.65)]",
    subtleBorder: "border-blue-300/20",
    subtleBg: "bg-blue-400/10",
    svg: "#60a5fa",
  },
  emerald: {
    name: "Green",
    text: "text-emerald-300",
    border: "border-emerald-400/40",
    bg: "bg-emerald-950/25",
    chip: "bg-emerald-400/10 text-emerald-200 border-emerald-300/30",
    glow: "shadow-emerald-500/20",
    ring: "ring-emerald-400/20",
    dot: "bg-emerald-300",
    marker:
      "border-emerald-300/75 bg-emerald-950 text-emerald-100 shadow-[0_0_30px_rgba(52,211,153,0.44)]",
    rail: "from-emerald-300/80 to-transparent",
    line: "bg-emerald-200/60 shadow-[0_0_22px_rgba(52,211,153,0.6)]",
    subtleBorder: "border-emerald-300/20",
    subtleBg: "bg-emerald-400/10",
    svg: "#34d399",
  },
  amber: {
    name: "Amber / Gold",
    text: "text-amber-300",
    border: "border-amber-400/50",
    bg: "bg-amber-950/25",
    chip: "bg-amber-400/10 text-amber-200 border-amber-300/30",
    glow: "shadow-amber-500/25",
    ring: "ring-amber-400/20",
    dot: "bg-amber-300",
    marker:
      "border-amber-300/80 bg-amber-950 text-amber-100 shadow-[0_0_32px_rgba(245,158,11,0.5)]",
    rail: "from-amber-300/85 to-transparent",
    line: "bg-amber-200/60 shadow-[0_0_22px_rgba(245,158,11,0.65)]",
    subtleBorder: "border-amber-300/20",
    subtleBg: "bg-amber-400/10",
    svg: "#f59e0b",
  },
  violet: {
    name: "Purple / Violet",
    text: "text-violet-300",
    border: "border-violet-400/50",
    bg: "bg-violet-950/25",
    chip: "bg-violet-400/10 text-violet-200 border-violet-300/30",
    glow: "shadow-violet-500/25",
    ring: "ring-violet-400/20",
    dot: "bg-violet-300",
    marker:
      "border-violet-300/80 bg-violet-950 text-violet-100 shadow-[0_0_32px_rgba(139,92,246,0.5)]",
    rail: "from-violet-300/85 to-transparent",
    line: "bg-violet-200/60 shadow-[0_0_22px_rgba(139,92,246,0.65)]",
    subtleBorder: "border-violet-300/20",
    subtleBg: "bg-violet-400/10",
    svg: "#8b5cf6",
  },
  slate: {
    name: "Slate / Blue-gray",
    text: "text-slate-300",
    border: "border-slate-500/30",
    bg: "bg-slate-900/30",
    chip: "bg-slate-500/10 text-slate-300 border-slate-400/20",
    glow: "shadow-slate-500/10",
    ring: "ring-slate-500/20",
    dot: "bg-slate-400",
    marker:
      "border-slate-400/50 bg-slate-900 text-slate-200 shadow-[0_0_24px_rgba(148,163,184,0.24)]",
    rail: "from-slate-300/60 to-transparent",
    line: "bg-slate-300/40 shadow-[0_0_18px_rgba(148,163,184,0.35)]",
    subtleBorder: "border-slate-500/20",
    subtleBg: "bg-slate-500/10",
    svg: "#94a3b8",
  },
};

const EVENT_DEFINITIONS: Record<
  CollatzEventKind,
  { label: string; icon: LucideIcon; accent: EventColorKey }
> = {
  active: { label: "Live Engine Stream", icon: Activity, accent: "cyan" },
  batch_started: { label: "Batch Started", icon: Play, accent: "cyan" },
  batch_completed: { label: "Verified Batch", icon: CheckCircle2, accent: "blue" },
  completed: { label: "Completed Check", icon: CheckCircle2, accent: "blue" },
  verified: { label: "Verified", icon: ShieldCheck, accent: "emerald" },
  peak_record: { label: "Peak Record", icon: TrendingUp, accent: "amber" },
  trajectory_record: { label: "Trajectory Record", icon: Route, accent: "violet" },
  integrity: { label: "Integrity Verified", icon: ShieldCheck, accent: "emerald" },
  health_passed: { label: "Health Passed", icon: ShieldCheck, accent: "emerald" },
  unknown: { label: "Engine Event", icon: Activity, accent: "slate" },
};

function metadataRecord(log: ActivityLogRow): Record<string, unknown> {
  if (!log.metadata || typeof log.metadata !== "object" || Array.isArray(log.metadata)) {
    return {};
  }
  return log.metadata;
}

export function metadataNumber(log: ActivityLogRow, keys: string[]): number | null {
  const metadata = metadataRecord(log);
  for (const key of keys) {
    const value = metadata[key];
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function metadataString(log: ActivityLogRow, keys: string[]): string | null {
  const metadata = metadataRecord(log);
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function getActivityLogEventKind(log: ActivityLogRow): CollatzEventKind {
  const eventType = log.event_type.toLowerCase();
  const message = log.message.toLowerCase();

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
  }

  return "unknown";
}

export function getEventVisualStyle(kind: CollatzEventKind): EventVisualStyle {
  const definition = EVENT_DEFINITIONS[kind] ?? EVENT_DEFINITIONS.unknown;
  const color = EVENT_COLORS[definition.accent];

  return {
    kind,
    label: definition.label,
    icon: definition.icon,
    accent: definition.accent,
    accentColor: color.svg,
    borderClass: color.border,
    backgroundClass: color.bg,
    textClass: color.text,
    glowClass: color.glow,
    chipClass: color.chip,
    markerClass: color.marker,
    railClass: color.rail,
    badgeClass: `${color.border} ${color.subtleBg} ${color.text}`,
    ringClass: color.ring,
    dotClass: color.dot,
    lineClass: color.line,
    subtleBorderClass: color.subtleBorder,
    subtleBackgroundClass: color.subtleBg,
  };
}
