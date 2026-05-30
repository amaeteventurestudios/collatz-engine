"use client";

import { useDashboardData } from "@/hooks/useDashboardData";
import type { DashboardEvent } from "@/app/api/collatz/dashboard/route";
import { PanelHelp } from "@/components/ui/PanelHelp";
import {
  getActivityLogEventKind,
  getEventVisualStyle,
  metadataNumber,
  type CollatzEventKind,
} from "@/lib/collatz/event-visuals";
import type { ActivityLogRow } from "@/lib/collatz/store";
import { formatLargeNumber } from "@/lib/collatz/format";
import { Signal } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtN(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return Math.trunc(n).toLocaleString("en-US");
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "recently";
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function eventHeadline(event: DashboardEvent, kind: CollatzEventKind): string {
  if (kind === "peak_record") return "New highest peak recorded";
  if (kind === "trajectory_record") return "New longest trajectory recorded";
  if (kind === "integrity") {
    if (event.eventType === "verification_passed") return "Engine integrity check passed";
    if (event.eventType === "worker_recovered") return "Engine stream recovered";
  }
  return event.message;
}

function eventDetail(event: DashboardEvent, kind: CollatzEventKind): string | null {
  // Coerce to ActivityLogRow shape for shared helpers
  const row = { metadata: event.metadata ?? {} } as ActivityLogRow;
  if (kind === "peak_record" || kind === "trajectory_record") {
    const n = metadataNumber(row, ["n", "number", "record_n", "candidate_n"]) ?? event.batchStart;
    const peak = metadataNumber(row, ["peak", "new_peak", "highest_peak"]);
    const steps = metadataNumber(row, ["steps", "new_steps", "longest_steps"]);
    if (kind === "peak_record" && peak != null) return `n = ${fmtN(n)} · peak = ${formatLargeNumber(peak)}`;
    if (kind === "trajectory_record" && steps != null) return `n = ${fmtN(n)} · ${fmtN(steps)} steps`;
    if (n != null) return `n = ${fmtN(n)}`;
  }
  if (kind === "integrity" && event.eventType === "verification_passed") {
    return "State consistent · Persistence confirmed";
  }
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EventRow({ event }: { event: DashboardEvent }) {
  const kind = getActivityLogEventKind({
    event_type: event.eventType,
    message: event.message,
    metadata: event.metadata ?? undefined,
  } as ActivityLogRow);
  const visual = getEventVisualStyle(kind);
  const Icon = visual.icon;
  const headline = eventHeadline(event, kind);
  const detail = eventDetail(event, kind);

  return (
    <div
      className={`flex gap-3 rounded-xl border p-4 ${visual.borderClass} ${visual.backgroundClass}`}
    >
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${visual.markerClass}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`engine-badge ${visual.badgeClass}`}>
            <Icon className="h-3 w-3" aria-hidden="true" />
            {visual.label}
          </span>
          <span className="text-[10px] text-slate-500">{relativeTime(event.createdAt)}</span>
        </div>
        <p className="mt-1.5 text-sm font-semibold text-slate-100">{headline}</p>
        {detail && (
          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{detail}</p>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-700/60 bg-slate-950/60 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900">
        <Signal className="h-5 w-5 text-slate-500" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-300">No notable events yet</p>
        <p className="mt-1 text-xs text-slate-500">
          High-signal events like new records and integrity checks will appear here
          as the engine produces them.
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LatestMeaningfulEvents() {
  const { data } = useDashboardData();
  const events = data?.meaningfulEvents ?? [];

  return (
    <section
      id="events"
      className="live-stable scroll-mt-20 px-4 pb-10 sm:pb-14"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-center gap-2 text-center sm:justify-start sm:text-left">
          <h2 className="text-base font-bold text-slate-50 tracking-tight">
            Latest Engine Events
          </h2>
          <PanelHelp
            title="Latest Engine Events"
            description="Shows high-signal events from the autonomous engine: new records, integrity checks, and notable system activity. Routine batch processing logs are excluded to reduce noise."
            align="left"
          />
          <span className="text-[10px] text-slate-500">· updated every 10s · routine batches excluded</span>
        </div>

        {events.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((event, i) => (
              <EventRow key={event.id ?? `event-${i}`} event={event} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
