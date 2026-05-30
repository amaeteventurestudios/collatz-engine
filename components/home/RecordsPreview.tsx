"use client";

import { useEffect, useRef, useState } from "react";
import {
  getEngineState,
  getTopLongestTrajectories,
  getTopHighestPeaks,
} from "@/lib/collatz/store";
import type { EngineState, CollatzResultRow } from "@/lib/collatz/store";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { formatLargeNumber, formatLargeNumberTitle } from "@/lib/collatz/format";
import { EVENT_COLORS } from "@/lib/collatz/event-visuals";

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
      value: engineState
        ? `${fmt(engineState.longest_steps)} steps`
        : topTrajectory
          ? `${fmt(topTrajectory.steps)} steps`
          : "Pending",
      sub: topTrajectory
        ? `n = ${fmt(topTrajectory.n)}`
        : engineState
          ? "All-time engine record"
          : "Awaiting dataset growth",
      color: EVENT_COLORS.violet.text,
      ring: EVENT_COLORS.violet.ring,
      bg: EVENT_COLORS.violet.bg,
    },
    {
      icon: "▲",
      label: "Highest Peak",
      value: topPeaks[0] ? formatLargeNumber(topPeaks[0].peak) : "Pending",
      valueTitle: topPeaks[0] ? formatLargeNumberTitle(topPeaks[0].peak) : undefined,
      sub: topPeaks[0]
        ? `n = ${fmt(topPeaks[0].n)}`
        : "Awaiting dataset growth",
      color: EVENT_COLORS.amber.text,
      ring: EVENT_COLORS.amber.ring,
      bg: EVENT_COLORS.amber.bg,
    },
    {
      icon: "↗",
      label: "Highest Peak Ratio",
      value: bestRatio.n > 0 ? `×${bestRatio.ratio.toFixed(0)}` : "Pending",
      sub: bestRatio.n > 0
        ? `n = ${fmt(bestRatio.n)} · peak ÷ n`
        : "Awaiting dataset growth",
      color: EVENT_COLORS.amber.text,
      ring: EVENT_COLORS.amber.ring,
      bg: EVENT_COLORS.amber.bg,
    },
    {
      icon: "≡",
      label: "Numbers Cataloged",
      value: engineState ? fmt(engineState.total_numbers_checked) : "Pending",
      sub: engineState
        ? `up to n = ${fmt(engineState.last_checked_number)}`
        : "Engine state unavailable",
      color: EVENT_COLORS.blue.text,
      ring: EVENT_COLORS.blue.ring,
      bg: EVENT_COLORS.blue.bg,
    },
    {
      icon: "→",
      label: "Highest n Checked",
      value: engineState ? fmt(engineState.last_checked_number) : "Pending",
      sub: engineState
        ? `Engine: ${engineState.current_status}`
        : "Engine state unavailable",
      color: EVENT_COLORS.blue.text,
      ring: EVENT_COLORS.blue.ring,
      bg: EVENT_COLORS.blue.bg,
    },
    {
      icon: "★",
      label: "Catalog Status",
      value: engineState ? engineState.current_status.toUpperCase() : "Pending",
      sub: engineState?.started_at
        ? `Running since ${new Date(engineState.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : "Not yet started",
      color:
        engineState?.current_status === "running"
          ? EVENT_COLORS.cyan.text
          : EVENT_COLORS.slate.text,
      ring:
        engineState?.current_status === "running"
          ? EVENT_COLORS.cyan.ring
          : EVENT_COLORS.slate.ring,
      bg:
        engineState?.current_status === "running"
          ? EVENT_COLORS.cyan.bg
          : EVENT_COLORS.slate.bg,
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
    <section id="records" className="live-stable scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        {/* Section heading */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
              Key Records
            </h2>
            <PanelHelp
              title="Key Records"
              description="Shows the most extreme results found so far, such as the longest path to 1, the highest peak value, and the largest verified catalog number."
              align="center"
            />
          </div>
          <p className="mt-1.5 min-h-[2rem] text-xs text-slate-500 dark:text-slate-400">
            {totalChecked > 0
              ? `Live records from ${fmt(totalChecked)} cataloged trajectories · Computed by the Collatz engine`
              : "Awaiting dataset growth · Records update automatically as the engine catalogs numbers"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {records.map((rec) => (
            <div
              key={rec.label}
              className={`engine-card-sm live-card flex flex-col items-center text-center ring-1 ${rec.ring} ${rec.bg}`}
            >
              <span className={`text-3xl leading-none ${rec.color}`}>{rec.icon}</span>
              <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {rec.label}
              </p>
              <p className={`live-value mt-2 text-sm font-bold leading-tight ${rec.color}`}>
                <span title={rec.valueTitle}>{rec.value}</span>
              </p>
              <p className="live-subtext mt-1 text-[9px] leading-snug text-slate-400 dark:text-slate-500">
                <span title={rec.subTitle}>{rec.sub}</span>
              </p>
            </div>
          ))}
        </div>

        <p className="mt-4 min-h-[1.25rem] text-center text-[11px] text-slate-400 dark:text-slate-500">
          {totalChecked > 0
            ? `Live catalog records · ${fmt(totalChecked)} numbers verified · All trajectories confirmed to reach 1`
            : "Records will appear here as the engine catalogs trajectories. All verified numbers reach 1."}
        </p>
      </div>
    </section>
  );
}
