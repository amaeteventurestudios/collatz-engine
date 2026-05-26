"use client";

import { useEffect, useState } from "react";
import { getEngineState } from "@/lib/collatz/store";
import type { EngineState } from "@/lib/collatz/store";

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface FeedEvent {
  icon: string;
  iconColor: string;
  bg: string;
  ring: string;
  time: string;
  title: string;
  body: string;
  tag: string;
  tagColor: string;
}

function buildFeedEvents(state: EngineState | null): FeedEvent[] {
  const events: FeedEvent[] = [];

  if (!state) {
    // Loading / unreachable
    events.push({
      icon: "○",
      iconColor: "text-slate-400 dark:text-slate-500",
      bg: "bg-slate-100/60 dark:bg-slate-800/40",
      ring: "ring-slate-200/60 dark:ring-slate-700/40",
      time: "—",
      title: "Loading engine state…",
      body: "Connecting to Supabase to read the latest engine state. Feed events will appear once the catalog data is loaded.",
      tag: "System",
      tagColor: "bg-slate-200/80 text-slate-500 dark:bg-slate-700/80 dark:text-slate-400",
    });
    return events;
  }

  // Engine start event
  if (state.started_at) {
    events.push({
      icon: "▶",
      iconColor: "text-teal-500 dark:text-teal-400",
      bg: "bg-teal-500/8 dark:bg-teal-400/8",
      ring: "ring-teal-500/20 dark:ring-teal-400/20",
      time: fmtDate(state.started_at),
      title: "Autonomous engine started",
      body: `The Collatz engine began cataloging trajectories from n = 1. Current status: ${state.current_status}. Engine uptime tracked in Supabase.`,
      tag: "Engine",
      tagColor: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
    });
  } else {
    events.push({
      icon: "○",
      iconColor: "text-slate-400 dark:text-slate-500",
      bg: "bg-slate-100/60 dark:bg-slate-800/40",
      ring: "ring-slate-200/60 dark:ring-slate-700/40",
      time: "—",
      title: "Engine not yet started",
      body: "The autonomous computation worker has been configured but has not started its first batch. Catalog events will appear once processing begins.",
      tag: "Engine",
      tagColor: "bg-slate-200/80 text-slate-500 dark:bg-slate-700/80 dark:text-slate-400",
    });
  }

  // Catalog milestone
  if (state.total_numbers_checked > 0) {
    events.push({
      icon: "◈",
      iconColor: "text-blue-500 dark:text-blue-400",
      bg: "bg-blue-500/8 dark:bg-blue-400/8",
      ring: "ring-blue-500/20 dark:ring-blue-400/20",
      time: `n = 1 – ${fmt(state.last_checked_number)}`,
      title: `${fmt(state.total_numbers_checked)} trajectories cataloged`,
      body: `The engine has verified ${fmt(state.total_numbers_checked)} starting numbers, processing up to n = ${fmt(state.last_checked_number)}. Each trajectory confirms the Collatz sequence reaches 1.`,
      tag: "Batch",
      tagColor: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    });
  }

  // Trajectory record
  if (state.longest_steps > 0) {
    events.push({
      icon: "⏱",
      iconColor: "text-orange-500 dark:text-orange-400",
      bg: "bg-orange-500/8 dark:bg-orange-400/8",
      ring: "ring-orange-500/20 dark:ring-orange-400/20",
      time: "Current record",
      title: `Longest trajectory: ${fmt(state.longest_steps)} steps`,
      body: `The current longest cataloged trajectory requires ${fmt(state.longest_steps)} steps to reach 1. This record updates automatically as the engine processes more starting numbers.`,
      tag: "Record",
      tagColor: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    });
  }

  // Peak record
  if (state.highest_peak > 0) {
    events.push({
      icon: "▲",
      iconColor: "text-violet-500 dark:text-violet-400",
      bg: "bg-violet-500/8 dark:bg-violet-400/8",
      ring: "ring-violet-500/20 dark:ring-violet-400/20",
      time: "Current record",
      title: `Highest peak: ${fmt(state.highest_peak)}`,
      body: `The largest value encountered across all cataloged trajectories is ${fmt(state.highest_peak)}. All trajectories are confirmed to eventually reach 1.`,
      tag: "Record",
      tagColor: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    });
  }

  // AI review guardrail — always present
  events.push({
    icon: "✦",
    iconColor: "text-violet-500 dark:text-violet-400",
    bg: "bg-violet-500/8 dark:bg-violet-400/8",
    ring: "ring-violet-500/20 dark:ring-violet-400/20",
    time: "Active",
    title: "AI observation review guardrail active",
    body: "The AI-assisted observation pipeline is configured. Observations are generated only when trajectory data is present and remain private until admin-approved. No note appears publicly until reviewed.",
    tag: "AI",
    tagColor: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  });

  // No approved observations
  events.push({
    icon: "○",
    iconColor: "text-slate-400 dark:text-slate-500",
    bg: "bg-slate-100/60 dark:bg-slate-800/40",
    ring: "ring-slate-200/60 dark:ring-slate-700/40",
    time: "—",
    title: "No public observations submitted yet",
    body: "No AI-drafted observations have been approved for public display. This feed will show approved research notes once the engine begins processing and observations pass admin review.",
    tag: "Research Log",
    tagColor: "bg-slate-200/80 text-slate-500 dark:bg-slate-700/80 dark:text-slate-400",
  });

  return events;
}

export function DiscoveryFeed() {
  const [engineState, setEngineState] = useState<EngineState | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const state = await getEngineState();
      if (isMounted) setEngineState(state);
    }
    load();
    return () => { isMounted = false; };
  }, []);

  const feedEvents = buildFeedEvents(engineState);

  return (
    <section id="feed" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between gap-2">
            <div>
              <p className="section-heading">Discovery Feed</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Milestones, records, and approved research notes — in order
              </p>
            </div>
            <button className="shrink-0 text-[11px] font-medium text-teal-600 hover:underline dark:text-teal-400">
              View all
            </button>
          </div>

          {/* Feed list */}
          <div className="space-y-3">
            {feedEvents.map((event, i) => (
              <div
                key={i}
                className={`flex gap-3.5 rounded-xl border p-4 ring-1 ${event.bg} ${event.ring}`}
                style={{ borderColor: "transparent" }}
              >
                {/* Icon */}
                <div className="mt-0.5 shrink-0">
                  <span className={`text-lg leading-none ${event.iconColor}`}>{event.icon}</span>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${event.tagColor}`}>
                      {event.tag}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {event.time}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {event.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {event.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Feed updates automatically as the engine catalogs trajectories and observations are
            approved. Live data from Supabase.
          </p>
        </div>
      </div>
    </section>
  );
}
