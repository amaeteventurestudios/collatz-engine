"use client";

import { useEffect, useState } from "react";
import { getRecentActivityLogs } from "@/lib/collatz/store";
import type { ActivityLogRow } from "@/lib/collatz/store";

// ─── Event-type styles ────────────────────────────────────────────────────────

interface EventStyle {
  icon: string;
  iconColor: string;
  bg: string;
  ring: string;
  tag: string;
  tagColor: string;
}

const EVENT_STYLES: Record<string, EventStyle> = {
  batch_completed: {
    icon: "◈",
    iconColor: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-500/8 dark:bg-blue-400/8",
    ring: "ring-blue-500/20 dark:ring-blue-400/20",
    tag: "Batch",
    tagColor: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  batch_started: {
    icon: "▷",
    iconColor: "text-teal-500 dark:text-teal-400",
    bg: "bg-teal-500/8 dark:bg-teal-400/8",
    ring: "ring-teal-500/20 dark:ring-teal-400/20",
    tag: "Batch",
    tagColor: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  },
  batch_failed: {
    icon: "⚠",
    iconColor: "text-red-500 dark:text-red-400",
    bg: "bg-red-500/8 dark:bg-red-400/8",
    ring: "ring-red-500/20 dark:ring-red-400/20",
    tag: "Error",
    tagColor: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
  engine_started: {
    icon: "▶",
    iconColor: "text-teal-500 dark:text-teal-400",
    bg: "bg-teal-500/8 dark:bg-teal-400/8",
    ring: "ring-teal-500/20 dark:ring-teal-400/20",
    tag: "Engine",
    tagColor: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  },
  engine_stopped: {
    icon: "◼",
    iconColor: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-500/8 dark:bg-amber-400/8",
    ring: "ring-amber-500/20 dark:ring-amber-400/20",
    tag: "Engine",
    tagColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  checkpoint: {
    icon: "◎",
    iconColor: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-100/60 dark:bg-slate-800/40",
    ring: "ring-slate-200/60 dark:ring-slate-700/40",
    tag: "Checkpoint",
    tagColor: "bg-slate-200/80 text-slate-500 dark:bg-slate-700/80 dark:text-slate-400",
  },
  record_updated: {
    icon: "★",
    iconColor: "text-orange-500 dark:text-orange-400",
    bg: "bg-orange-500/8 dark:bg-orange-400/8",
    ring: "ring-orange-500/20 dark:ring-orange-400/20",
    tag: "Record",
    tagColor: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  },
  worker_heartbeat: {
    icon: "♡",
    iconColor: "text-slate-400 dark:text-slate-500",
    bg: "bg-slate-100/60 dark:bg-slate-800/40",
    ring: "ring-slate-200/60 dark:ring-slate-700/40",
    tag: "Heartbeat",
    tagColor: "bg-slate-200/80 text-slate-500 dark:bg-slate-700/80 dark:text-slate-400",
  },
};

const FALLBACK_STYLE: EventStyle = {
  icon: "○",
  iconColor: "text-slate-400 dark:text-slate-500",
  bg: "bg-slate-100/60 dark:bg-slate-800/40",
  ring: "ring-slate-200/60 dark:ring-slate-700/40",
  tag: "System",
  tagColor: "bg-slate-200/80 text-slate-500 dark:bg-slate-700/80 dark:text-slate-400",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function buildSubtext(log: ActivityLogRow): string {
  const parts: string[] = [];
  if (log.batch_start != null && log.batch_end != null) {
    parts.push(
      `n = ${log.batch_start.toLocaleString("en-US")} – ${log.batch_end.toLocaleString("en-US")}`,
    );
  }
  if (log.numbers_processed != null && log.event_type !== "batch_started") {
    parts.push(`${log.numbers_processed.toLocaleString("en-US")} numbers`);
  }
  if (log.duration_ms != null && log.event_type !== "batch_started") {
    parts.push(`${log.duration_ms.toLocaleString("en-US")} ms`);
  }
  if (log.numbers_per_second != null && Number(log.numbers_per_second) > 0) {
    parts.push(`${Number(log.numbers_per_second).toFixed(1)}/sec`);
  }
  return parts.join(" · ");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DiscoveryFeed() {
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const rows = await getRecentActivityLogs(20);
      if (!isMounted) return;
      setLogs(rows);
      setLoaded(true);
    }
    load();
    // Refresh every 30 seconds so recent batch activity surfaces quickly
    const interval = window.setInterval(load, 30_000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section id="feed" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between gap-2">
            <div>
              <p className="section-heading">Discovery Feed</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Operational activity log from the live catalog
              </p>
            </div>
            {logs.length > 0 && (
              <span className="rounded-full bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                {logs.length} events
              </span>
            )}
          </div>

          {/* Feed */}
          {loaded && logs.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 px-4 py-14 text-center dark:border-slate-800">
              <span className="text-3xl text-slate-300 dark:text-slate-700">◈</span>
              <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Awaiting operational activity logs
              </p>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                Batch events will appear here once the engine records its first
                completed run.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {(loaded ? logs : Array.from({ length: 3 })).map((log, i) => {
                if (!loaded) {
                  // Loading skeleton
                  return (
                    <div
                      key={i}
                      className="flex gap-3.5 rounded-xl border border-transparent bg-slate-100/60 p-4 ring-1 ring-slate-200/60 dark:bg-slate-800/40 dark:ring-slate-700/40"
                    >
                      <div className="mt-1 h-4 w-4 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3.5 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                      </div>
                    </div>
                  );
                }

                const row = log as ActivityLogRow;
                const style = EVENT_STYLES[row.event_type] ?? FALLBACK_STYLE;
                const time = row.created_at ? relativeTime(row.created_at) : "—";
                const sub = buildSubtext(row);

                return (
                  <div
                    key={row.id ?? i}
                    className={`flex gap-3.5 rounded-xl border p-4 ring-1 ${style.bg} ${style.ring}`}
                    style={{ borderColor: "transparent" }}
                  >
                    <div className="mt-0.5 shrink-0">
                      <span className={`text-lg leading-none ${style.iconColor}`}>
                        {style.icon}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.tagColor}`}>
                          {style.tag}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {time}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {row.message}
                      </p>
                      {sub && (
                        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                          {sub}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Showing the {logs.length > 0 ? `${logs.length} most recent` : "latest"} operational
            events · Refreshes every 30 seconds · Live catalog activity
          </p>
        </div>
      </div>
    </section>
  );
}
