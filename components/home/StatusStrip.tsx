"use client";

import { useMemo } from "react";
import { useCollatzLiveState } from "@/hooks/useCollatzLiveState";
import { LocalTimeCard } from "@/components/home/TimeStatusCards";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { formatLargeNumber, formatLargeNumberTitle } from "@/lib/collatz/format";
import { EVENT_COLORS } from "@/lib/collatz/event-visuals";

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
  valueTitle,
  sub,
  valueClass = "text-slate-900 dark:text-slate-100",
}: {
  label: string;
  value: string;
  valueTitle?: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="live-card flex flex-col items-center justify-center rounded-xl px-3 py-3 text-center">
      <p className="stat-label">{label}</p>
      <p
        className={`live-value mt-1.5 text-sm font-bold leading-tight ${valueClass}`}
        title={valueTitle}
      >
        {value}
      </p>
      <p className="live-subtext mt-0.5 text-[10px] leading-snug text-slate-400 dark:text-slate-500">{sub}</p>
    </div>
  );
}

export function StatusStrip() {
  const { state, runtimeSeconds, error: loadError } = useCollatzLiveState();

  const runtime = useMemo(
    () => formatRuntime(state?.started_at ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state?.started_at, runtimeSeconds],
  );

  const currentNumber = Number(state?.last_checked_number ?? 0) + 1;
  const status = state?.current_status ?? "offline";

  const statusValueClass =
    status === "running"
      ? EVENT_COLORS.cyan.text
      : EVENT_COLORS.slate.text;

  const throughput = state?.numbers_per_second
    ? Number(state.numbers_per_second)
    : 0;

  const lastRunSub = state?.last_run_at
    ? `Last run: ${new Date(state.last_run_at).toLocaleTimeString()}`
    : "Awaiting next run";

  const stats = [
    {
      label: "Engine Status",
      value: status.toUpperCase(),
      sub: loadError ?? (state?.last_error ? `Issue: ${state.last_error.slice(0, 36)}` : "Live catalog active"),
      valueClass: statusValueClass,
    },
    {
      label: "Runtime",
      value: runtime,
      sub: state?.started_at ? "Persistent runtime" : "Waiting for engine start",
      valueClass: EVENT_COLORS.cyan.text,
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
      sub: `Highest: ${formatNumber(state?.last_checked_number)}`,
      valueClass: "text-slate-900 dark:text-slate-100",
    },
    {
      label: "Highest Peak",
      value: state?.highest_peak != null ? formatLargeNumber(state.highest_peak) : "Pending",
      valueTitle: state?.highest_peak != null ? formatLargeNumberTitle(state.highest_peak) : undefined,
      sub: "Largest value encountered",
      valueClass: EVENT_COLORS.amber.text,
    },
    {
      label: "Longest Trajectory",
      value: `${formatNumber(state?.longest_steps)} steps`,
      sub: "Current record trajectory length",
      valueClass: EVENT_COLORS.violet.text,
    },
    {
      label: "Throughput",
      value: throughput > 0 ? `${throughput.toFixed(1)}/sec` : "Pending",
      sub: lastRunSub,
      valueClass: throughput > 0
        ? EVENT_COLORS.cyan.text
        : EVENT_COLORS.slate.text,
    },
  ];

  return (
    <section className="live-stable border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
      {/* Live status header */}
      <div className="flex flex-col items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 text-center dark:border-slate-800 sm:flex-row sm:text-left sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
          <span className="live-dot" />
          <span className={`text-xs font-bold uppercase tracking-[0.08em] ${EVENT_COLORS.cyan.text}`}>
            Live
          </span>
          <PanelHelp
            title="Historical Statistics"
            description="Summarizes what the engine has recorded over time, including checked numbers, long trajectories, high peaks, throughput, and persistent runtime."
            align="left"
          />
          <span className="hidden text-[11px] text-slate-500 dark:text-slate-400 sm:inline">
            Live catalog active, autonomous runner connected
          </span>
        </div>

        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${EVENT_COLORS.cyan.chip}`}>
          Verified Catalog State
        </span>
      </div>

      {/* Stats grid */}
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {stats.map((stat) => (
            <StatusCard key={stat.label} {...stat} />
          ))}
          <LocalTimeCard />
        </div>
      </div>
    </section>
  );
}
