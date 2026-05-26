"use client";

import { useEffect, useRef, useState } from "react";
import {
  getEngineState,
  getTopLongestTrajectories,
  getTopHighestPeaks,
} from "@/lib/collatz/store";
import type { EngineState, CollatzResultRow } from "@/lib/collatz/store";
import { formatLargeNumber, formatLargeNumberTitle } from "@/lib/collatz/format";

const POLL_MS = 5_000;

function fmt(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString("en-US");
}

interface RecordCard {
  icon: string;
  label: string;
  value: string;
  valueTitle?: string;
  sub: string;
  subTitle?: string;
  color: string;
  ring: string;
  bg: string;
}

function buildRecords(
  engineState: EngineState | null,
  topTrajectory: CollatzResultRow | null,
  topPeaks: CollatzResultRow[],
): RecordCard[] {
  let bestRatio = { ratio: 0, n: 0 };
  for (const row of topPeaks) {
    const ratio = row.n > 0 ? row.peak / row.n : 0;
    if (ratio > bestRatio.ratio) bestRatio = { ratio, n: row.n };
  }

  return [
    {
      icon: "⏱",
      label: "Longest Path",
      value: topTrajectory ? `${fmt(topTrajectory.steps)} steps` : "—",
      sub: topTrajectory
        ? `n = ${fmt(topTrajectory.n)}`
        : "Awaiting dataset growth",
      color: "text-orange-500 dark:text-orange-400",
      ring: "ring-orange-500/20 dark:ring-orange-400/20",
      bg: "bg-orange-500/5 dark:bg-orange-500/5",
    },
    {
      icon: "▲",
      label: "Highest Peak",
      value: topPeaks[0] ? formatLargeNumber(topPeaks[0].peak) : "—",
      valueTitle: topPeaks[0] ? formatLargeNumberTitle(topPeaks[0].peak) : undefined,
      sub: topPeaks[0]
        ? `n = ${fmt(topPeaks[0].n)}`
        : "Awaiting dataset growth",
      color: "text-blue-500 dark:text-blue-400",
      ring: "ring-blue-500/20 dark:ring-blue-400/20",
      bg: "bg-blue-500/5 dark:bg-blue-500/5",
    },
    {
      icon: "↗",
      label: "Highest Peak Ratio",
      value: bestRatio.n > 0 ? `×${bestRatio.ratio.toFixed(0)}` : "—",
      sub: bestRatio.n > 0
        ? `n = ${fmt(bestRatio.n)} · peak ÷ n`
        : "Awaiting dataset growth",
      color: "text-green-500 dark:text-green-400",
      ring: "ring-green-500/20 dark:ring-green-400/20",
      bg: "bg-green-500/5 dark:bg-green-500/5",
    },
    {
      icon: "≡",
      label: "Numbers Cataloged",
      value: engineState ? fmt(engineState.total_numbers_checked) : "—",
      sub: engineState
        ? `up to n = ${fmt(engineState.last_checked_number)}`
        : "Engine state unavailable",
      color: "text-teal-500 dark:text-teal-400",
      ring: "ring-teal-500/20 dark:ring-teal-400/20",
      bg: "bg-teal-500/5 dark:bg-teal-500/5",
    },
    {
      icon: "→",
      label: "Highest n Checked",
      value: engineState ? fmt(engineState.last_checked_number) : "—",
      sub: engineState
        ? `Engine: ${engineState.current_status}`
        : "Engine state unavailable",
      color: "text-violet-500 dark:text-violet-400",
      ring: "ring-violet-500/20 dark:ring-violet-400/20",
      bg: "bg-violet-500/5 dark:bg-violet-500/5",
    },
    {
      icon: "★",
      label: "Catalog Status",
      value: engineState ? engineState.current_status.toUpperCase() : "—",
      sub: engineState?.started_at
        ? `Running since ${new Date(engineState.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : "Not yet started",
      color:
        engineState?.current_status === "running"
          ? "text-green-500 dark:text-green-400"
          : "text-slate-500 dark:text-slate-400",
      ring:
        engineState?.current_status === "running"
          ? "ring-green-500/20 dark:ring-green-400/20"
          : "ring-slate-200/60 dark:ring-slate-700/40",
      bg:
        engineState?.current_status === "running"
          ? "bg-green-500/5 dark:bg-green-500/5"
          : "bg-slate-50 dark:bg-slate-800/40",
    },
  ];
}

export function RecordsPreview() {
  const [engineState, setEngineState] = useState<EngineState | null>(null);
  const [topTrajectory, setTopTrajectory] = useState<CollatzResultRow | null>(null);
  const [topPeaks, setTopPeaks] = useState<CollatzResultRow[]>([]);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    async function poll() {
      try {
        const [state, trajectories, peaks] = await Promise.all([
          getEngineState(),
          getTopLongestTrajectories(1),
          getTopHighestPeaks(20),
        ]);
        if (!mountedRef.current) return;
        setEngineState(state);
        setTopTrajectory(trajectories[0] ?? null);
        setTopPeaks(peaks);
      } catch {
        // Keep last known data on transient errors
      }
    }

    poll();
    const pollId = window.setInterval(poll, POLL_MS);

    return () => {
      mountedRef.current = false;
      window.clearInterval(pollId);
    };
  }, []);

  const records = buildRecords(engineState, topTrajectory, topPeaks);
  const totalChecked = engineState?.total_numbers_checked ?? 0;

  return (
    <section id="records" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        {/* Section heading */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
            Key Records
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {totalChecked > 0
              ? `Live records from ${fmt(totalChecked)} cataloged trajectories · Computed by the Collatz engine`
              : "Awaiting dataset growth · Records update automatically as the engine catalogs numbers"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {records.map((rec) => (
            <div
              key={rec.label}
              className={`engine-card-sm flex flex-col items-center text-center ring-1 ${rec.ring} ${rec.bg}`}
            >
              <span className={`text-3xl leading-none ${rec.color}`}>{rec.icon}</span>
              <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {rec.label}
              </p>
              <p className={`mt-2 text-sm font-bold leading-tight tabular-nums ${rec.color}`}>
                <span title={rec.valueTitle}>{rec.value}</span>
              </p>
              <p className="mt-1 text-[9px] leading-snug text-slate-400 dark:text-slate-500">
                <span title={rec.subTitle}>{rec.sub}</span>
              </p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
          {totalChecked > 0
            ? `Live catalog records · ${fmt(totalChecked)} numbers verified · All trajectories confirmed to reach 1`
            : "Records will appear here as the engine catalogs trajectories. All verified numbers reach 1."}
        </p>
      </div>
    </section>
  );
}
