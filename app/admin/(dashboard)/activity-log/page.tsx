"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { COLLATZ_POLL_MS } from "@/lib/collatz/cache-policy";
import { useSafePolling } from "@/hooks/useSafePolling";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActivityEntry {
  id?: string;
  event_type: string;
  message: string;
  created_at: string;
  numbers_processed?: number | null;
  numbers_per_second?: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  heartbeat:       { bg: "bg-teal-500/10",    text: "text-teal-400",    border: "border-teal-500/20"   },
  milestone:       { bg: "bg-purple-500/10",  text: "text-purple-400",  border: "border-purple-500/20" },
  range_summary:   { bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/20"   },
  cleanup:         { bg: "bg-orange-500/10",  text: "text-orange-400",  border: "border-orange-500/20" },
  error:           { bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/20"    },
  warning:         { bg: "bg-yellow-500/10",  text: "text-yellow-400",  border: "border-yellow-500/20" },
  pause:           { bg: "bg-yellow-500/10",  text: "text-yellow-400",  border: "border-yellow-500/20" },
  resume:          { bg: "bg-green-500/10",   text: "text-green-400",   border: "border-green-500/20"  },
  worker_start:    { bg: "bg-green-500/10",   text: "text-green-400",   border: "border-green-500/20"  },
  worker_stop:     { bg: "bg-slate-700/50",   text: "text-slate-400",   border: "border-slate-700"     },
  lock_acquired:   { bg: "bg-teal-500/10",    text: "text-teal-400",    border: "border-teal-500/20"   },
  lock_released:   { bg: "bg-slate-700/50",   text: "text-slate-400",   border: "border-slate-700"     },
  lock_force:      { bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/20"    },
  integrity_check: { bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/20"   },
  config_change:   { bg: "bg-purple-500/10",  text: "text-purple-400",  border: "border-purple-500/20" },
  admin_pause:     { bg: "bg-yellow-500/10",  text: "text-yellow-400",  border: "border-yellow-500/20" },
  admin_resume:    { bg: "bg-green-500/10",   text: "text-green-400",   border: "border-green-500/20"  },
  admin_cleanup:   { bg: "bg-orange-500/10",  text: "text-orange-400",  border: "border-orange-500/20" },
};

function eventColors(type: string) {
  const key = type.toLowerCase();
  if (EVENT_COLORS[key]) return EVENT_COLORS[key];
  for (const [k, v] of Object.entries(EVENT_COLORS)) {
    if (key.includes(k)) return v;
  }
  return { bg: "bg-slate-800", text: "text-slate-500", border: "border-slate-700" };
}

const FILTER_TYPES = [
  { label: "All",          value: "all" },
  { label: "Error",        value: "error" },
  { label: "Warning",      value: "warning" },
  { label: "Milestone",    value: "milestone" },
  { label: "Heartbeat",    value: "heartbeat" },
  { label: "Cleanup",      value: "cleanup" },
  { label: "Range",        value: "range_summary" },
  { label: "Worker",       value: "worker" },
  { label: "Admin",        value: "admin" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ActivityLogPage() {
  const [events, setEvents] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const load = useCallback(async (signal: AbortSignal) => {
    try {
      const res = await fetch("/api/admin/metrics", { signal, headers: { "x-poll": "1" } });
      if (res.ok) {
        const json = await res.json();
        setEvents((json.activity ?? []) as ActivityEntry[]);
        setLastFetched(new Date().toLocaleTimeString("en-US"));
      }
    } catch {
      // keep last data
    } finally {
      setLoading(false);
    }
  }, []);

  useSafePolling({
    intervalMs: COLLATZ_POLL_MS.ADMIN_ACTIVITY_LOG,
    minIntervalMs: 30_000,
    staleAfterMs: 90_000,
    poll: load,
  });

  const filtered = events.filter((e) => {
    const type = e.event_type.toLowerCase();
    const matchesFilter =
      filter === "all" ? true :
      filter === "worker" ? type.startsWith("worker") :
      filter === "admin" ? type.startsWith("admin") :
      type.includes(filter);
    const matchesSearch = search === "" ||
      e.message.toLowerCase().includes(search.toLowerCase()) ||
      e.event_type.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const errorCount = events.filter((e) => e.event_type.toLowerCase().includes("error")).length;
  const warnCount  = events.filter((e) => e.event_type.toLowerCase().includes("warn")).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">Activity Log</h1>
            <PanelHelp
              title="Activity Log"
              description="Shows what happened, when, and why — operational events from the engine, workers, and admin actions."
              details="Some batch processing events are sampled to save storage. Missing batch log rows do not mean missing computation — check the sequence pointer for continuity."
              source="collatz_activity_logs table, polled every 15 seconds."
              operatorNote="Do not delete logs. Repair logs are important for audit history."
            />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">Operational events, health signals, and admin actions</p>
        </div>
        <div className="flex items-center gap-3">
          {lastFetched && (
            <span className="text-[10px] text-slate-600">Updated {lastFetched}</span>
          )}
          <Link href="/admin" className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
            ← Overview
          </Link>
        </div>
      </div>

      {/* Health summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Events",    value: events.length.toString(),    color: "text-slate-200" },
          { label: "Filtered",        value: filtered.length.toString(),   color: "text-slate-200" },
          { label: "Errors (recent)", value: errorCount.toString(),        color: errorCount > 0 ? "text-red-400" : "text-green-400" },
          { label: "Warnings",        value: warnCount.toString(),         color: warnCount > 0 ? "text-yellow-400" : "text-green-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">{s.label}</p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_TYPES.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all ${
                filter === f.value
                  ? "bg-teal-500/20 border border-teal-500/40 text-teal-300"
                  : "border border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search events…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-300 placeholder-slate-600 outline-none focus:border-teal-600 sm:w-56"
        />
      </div>

      {/* Sampled-log note */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
        <p className="text-[11px] text-slate-500">
          <span className="font-semibold text-slate-400">Sampled logs:</span>{" "}
          Some batch events are sampled to reduce storage. Log gaps do not indicate computation gaps — check
          the sequence pointer on the{" "}
          <Link href="/admin/integrity" className="text-teal-400 hover:underline">
            Integrity Checks
          </Link>{" "}
          page to verify continuity.
        </p>
      </div>

      {/* Event timeline */}
      {loading ? (
        <div className="flex justify-center py-12">
          <p className="text-sm text-slate-500">Loading activity log…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 py-14 text-center">
          <p className="text-sm font-semibold text-slate-500">No events match</p>
          <p className="mt-1.5 text-[11px] text-slate-600">Try a different filter or clear the search.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((event, i) => {
            const c = eventColors(event.event_type);
            const key = event.id ?? `${event.created_at}-${i}`;
            const isOpen = expandedId === key;
            return (
              <div key={key} className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden`}>
                <button
                  className="flex w-full items-start gap-3 px-4 py-3 text-left"
                  onClick={() => setExpandedId(isOpen ? null : key)}
                >
                  <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${c.bg} ${c.text}`}>
                    {event.event_type}
                  </span>
                  <span className="min-w-0 flex-1 text-[11px] leading-relaxed text-slate-300">{event.message}</span>
                  <span className="shrink-0 text-[10px] tabular-nums text-slate-600">{fmtDate(event.created_at)}</span>
                  <span className={`shrink-0 text-slate-600 transition-transform ${isOpen ? "rotate-90" : ""}`}>›</span>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-800/60 px-4 py-3 text-[11px]">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {event.numbers_processed != null && (
                        <div>
                          <span className="text-slate-600">Numbers processed: </span>
                          <span className="text-slate-300">{event.numbers_processed.toLocaleString("en-US")}</span>
                        </div>
                      )}
                      {event.numbers_per_second != null && (
                        <div>
                          <span className="text-slate-600">Throughput: </span>
                          <span className="text-slate-300">{event.numbers_per_second.toLocaleString("en-US")} /s</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-600">Event ID: </span>
                        <span className="font-mono text-slate-500">{event.id ?? "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Timestamp: </span>
                        <span className="text-slate-500">{event.created_at}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
