"use client";

import { useState, useEffect } from "react";

// TODO Phase 5: wire these props from Supabase to display live engine runtime
export interface EngineRuntimeProps {
  engine_started_at?: Date | null;
  engine_status?: "running" | "paused" | "offline" | "pending";
  engine_last_run_at?: Date | null;
  engine_paused_at?: Date | null;
}

// TODO Phase 5: add props: EngineRuntimeProps and compute elapsed time from engine_started_at
export function EngineRuntimeCard() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-slate-100/60 px-3 py-3 text-center ring-1 ring-slate-200/80 dark:bg-slate-800/40 dark:ring-slate-700/60">
      <p className="stat-label">Engine Runtime</p>
      <p className="mt-1.5 text-sm font-bold leading-tight text-slate-500 dark:text-slate-400">
        Pending Start
      </p>
      <p className="mt-0.5 text-[10px] leading-snug text-slate-400 dark:text-slate-500">
        Starts when persistent cataloging is enabled
      </p>
    </div>
  );
}

export function LocalTimeCard() {
  const [display, setDisplay] = useState<{ time: string; tz: string } | null>(null);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fmt = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: tz,
    });

    const tick = () => setDisplay({ time: fmt.format(new Date()), tz });
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-teal-500/5 px-3 py-3 text-center ring-1 ring-teal-500/20 dark:bg-teal-400/5 dark:ring-teal-400/20">
      <p className="stat-label">Your Local Time</p>
      <p className="mt-1.5 text-sm font-bold leading-tight tabular-nums text-slate-900 dark:text-slate-100">
        {display?.time ?? "—"}
      </p>
      <p className="mt-0.5 text-[10px] leading-snug text-slate-400 dark:text-slate-500">
        {display?.tz || "Detecting timezone…"}
      </p>
    </div>
  );
}
