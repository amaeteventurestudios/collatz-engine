"use client";

import { useEffect, useState } from "react";
import { getEngineState } from "@/lib/collatz/store";
import type { EngineState } from "@/lib/collatz/store";

function fmt(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString("en-US");
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmtMs(ms: number | null | undefined) {
  const v = Number(ms ?? 0);
  if (v === 0) return "—";
  if (v < 1000) return `${v}ms`;
  return `${(v / 1000).toFixed(2)}s`;
}

export function OperationalHealthCard() {
  const [state, setEngineState] = useState<EngineState | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const s = await getEngineState();
      if (isMounted) setEngineState(s);
    }
    load();
    // Refresh every 30 s — operational health doesn't need tight polling
    const id = window.setInterval(load, 30_000);
    return () => {
      isMounted = false;
      window.clearInterval(id);
    };
  }, []);

  const throughput = Number(state?.numbers_per_second ?? 0);
  const hasData = state !== null && (state.last_batch_size ?? 0) > 0;

  const metrics = [
    {
      label: "Last Batch Size",
      value: hasData ? fmt(state?.last_batch_size) : "—",
      sub: "numbers processed",
    },
    {
      label: "Batch Duration",
      value: hasData ? fmtMs(state?.last_batch_duration_ms) : "—",
      sub: "wall-clock time",
    },
    {
      label: "Throughput",
      value: throughput > 0 ? `${throughput.toFixed(1)}/sec` : "—",
      sub: "numbers per second",
    },
    {
      label: "Last Run",
      value: state?.last_run_at
        ? fmtTime(state.last_run_at)
        : "—",
      sub: "batch completed at",
    },
    {
      label: "Worker Heartbeat",
      value: state?.worker_heartbeat_at
        ? fmtTime(state.worker_heartbeat_at)
        : "—",
      sub: "last heartbeat",
    },
  ];

  const hasError = Boolean(state?.last_error);

  return (
    <section className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        {/* Error banner */}
        {hasError && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 dark:border-red-800 dark:bg-red-900/20">
            <span className="mt-0.5 shrink-0 text-sm text-red-500">⚠</span>
            <p className="text-xs text-red-700 dark:text-red-300">
              <span className="font-semibold">Last batch error:</span>{" "}
              {state?.last_error}
            </p>
          </div>
        )}

        {/* Metrics row */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {m.label}
              </p>
              <p className="mt-1 text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {m.value}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{m.sub}</p>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
          Operational health ·{" "}
          {hasData ? "Throughput tracking active" : "Awaiting throughput tracking data"}
        </p>
      </div>
    </section>
  );
}
