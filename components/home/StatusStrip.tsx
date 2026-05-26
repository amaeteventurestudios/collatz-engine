"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LocalTimeCard } from "@/components/home/TimeStatusCards";

interface EngineState {
  id: string;
  started_at: string | null;
  last_checked_number: number;
  total_numbers_checked: number;
  highest_peak: number;
  longest_steps: number;
  current_status: string;
  updated_at: string;
}

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-US");
}

function formatRuntime(startedAt: string | null) {
  if (!startedAt) return "Not started";

  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));

  const days = Math.floor(diffSeconds / 86_400);
  const hours = Math.floor((diffSeconds % 86_400) / 3_600);
  const minutes = Math.floor((diffSeconds % 3_600) / 60);
  const seconds = diffSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function StatusCard({
  label,
  value,
  sub,
  valueClass = "text-slate-900 dark:text-slate-100",
}: {
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl px-3 py-3 text-center">
      <p className="stat-label">{label}</p>
      <p className={`mt-1.5 text-sm font-bold leading-tight tabular-nums ${valueClass}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] leading-snug text-slate-400 dark:text-slate-500">{sub}</p>
    </div>
  );
}

export function StatusStrip() {
  const [state, setState] = useState<EngineState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loadError, setLoadError] = useState<string | null>(null);

  // Ref so the custom event listener can trigger an immediate reload
  // without recreating intervals.
  const reloadRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEngineState() {
      if (!supabase) {
        if (isMounted) setLoadError("Supabase not configured");
        return;
      }

      const { data, error } = await supabase
        .from("collatz_engine_state")
        .select("*")
        .eq("id", "main")
        .single();

      if (!isMounted) return;

      if (error) {
        console.error("[Collatz Engine] Failed to load dashboard state", error);
        setLoadError("Unable to load engine state");
        return;
      }

      setState(data as EngineState);
      setLoadError(null);
    }

    // Expose for the event listener below
    reloadRef.current = loadEngineState;

    loadEngineState();

    const refreshInterval = window.setInterval(loadEngineState, 5_000);
    const clockInterval = window.setInterval(() => setNow(Date.now()), 1_000);

    return () => {
      isMounted = false;
      reloadRef.current = null;
      window.clearInterval(refreshInterval);
      window.clearInterval(clockInterval);
    };
  }, []);

  // Listen for the custom event (dispatched by admin tools after a successful batch run)
  // so the public dashboard refreshes immediately without waiting for the 5 s poll.
  useEffect(() => {
    function handleStateUpdated() {
      reloadRef.current?.();
    }
    window.addEventListener("collatz-state-updated", handleStateUpdated);
    return () => window.removeEventListener("collatz-state-updated", handleStateUpdated);
  }, []);

  const runtime = useMemo(() => {
    void now; // Re-evaluate every second because `now` updates every second
    return formatRuntime(state?.started_at ?? null);
  }, [state?.started_at, now]);

  const currentNumber = Number(state?.last_checked_number ?? 0) + 1;
  const status = state?.current_status ?? "offline";

  const statusValueClass =
    status === "running"
      ? "text-green-600 dark:text-green-400"
      : status === "stopped"
        ? "text-amber-600 dark:text-amber-400"
        : "text-slate-500 dark:text-slate-400";

  const stats = [
    {
      label: "Engine Status",
      value: status.toUpperCase(),
      sub: loadError ?? "Persistent Supabase state",
      valueClass: statusValueClass,
    },
    {
      label: "Runtime",
      value: runtime,
      sub: state?.started_at ? "Database-backed uptime" : "Waiting for engine start",
      valueClass: "text-teal-600 dark:text-teal-400",
    },
    {
      label: "Current Number",
      value: formatNumber(currentNumber),
      sub: "Next integer scheduled",
      valueClass: "text-slate-900 dark:text-slate-100",
    },
    {
      label: "Numbers Checked",
      value: formatNumber(state?.total_numbers_checked),
      sub: `Last checked: ${formatNumber(state?.last_checked_number)}`,
      valueClass: "text-slate-900 dark:text-slate-100",
    },
    {
      label: "Highest Peak",
      value: formatNumber(state?.highest_peak),
      sub: "Largest value encountered",
      valueClass: "text-slate-900 dark:text-slate-100",
    },
    {
      label: "Longest Trajectory",
      value: `${formatNumber(state?.longest_steps)} steps`,
      sub: "Current record trajectory length",
      valueClass: "text-slate-900 dark:text-slate-100",
    },
  ];

  return (
    <section className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
      {/* Live status header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="live-dot" />
          <span className="text-xs font-bold uppercase tracking-widest text-green-600 dark:text-green-400">
            Live
          </span>
          <span className="hidden text-[11px] text-slate-500 dark:text-slate-400 sm:inline">
            — Supabase persistence active · autonomous runner connected
          </span>
        </div>

        <span className="rounded-full bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold text-teal-600 dark:text-teal-400">
          Persistent Engine State
        </span>
      </div>

      {/* Stats grid */}
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {stats.map((stat) => (
            <StatusCard key={stat.label} {...stat} />
          ))}
          <LocalTimeCard />
        </div>
      </div>
    </section>
  );
}
