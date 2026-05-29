"use client";

import type { CalcResult } from "@/lib/collatz/calculator";
import { fmtBig, fmtNum, fmtPct } from "@/lib/collatz/calculator";

interface Props {
  result: CalcResult;
}

export function CalculatorMetricCards({ result }: Props) {
  const cards = [
    {
      label: "Total Steps",
      value: fmtNum(result.totalSteps),
      caption: "Including starting number",
      icon: <StepsIcon />,
      color: "text-teal-400",
      bg: "bg-teal-500/10",
      ring: "ring-teal-500/20",
    },
    {
      label: "Highest Peak",
      value: fmtBig(result.highestPeak),
      caption: "Maximum value reached",
      icon: <PeakIcon />,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      ring: "ring-blue-500/20",
    },
    {
      label: "Odd Steps",
      value: fmtNum(result.oddSteps),
      caption: `${fmtPct(result.oddPercent)} of total steps`,
      icon: <OddIcon />,
      color: "text-pink-400",
      bg: "bg-pink-500/10",
      ring: "ring-pink-500/20",
    },
    {
      label: "Even Steps",
      value: fmtNum(result.evenSteps),
      caption: `${fmtPct(result.evenPercent)} of total steps`,
      icon: <EvenIcon />,
      color: "text-sky-400",
      bg: "bg-sky-500/10",
      ring: "ring-sky-500/20",
    },
    {
      label: "Stopping Time",
      value: fmtNum(result.stoppingTime),
      caption: `Steps to reach ${result.reachedOne ? "1" : "max"}`,
      icon: <TimeIcon />,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      ring: "ring-amber-500/20",
    },
    {
      label: "Final Value",
      value: fmtBig(result.finalValue),
      caption: result.reachedOne ? "Converged ✓" : "Max steps hit",
      icon: <FinalIcon />,
      color: "text-green-400",
      bg: "bg-green-500/10",
      ring: "ring-green-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-center transition-colors hover:border-slate-700"
        >
          <div className={`mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${card.bg} ${card.ring}`}>
            <span className={card.color}>{card.icon}</span>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            {card.label}
          </p>
          <p className={`mt-1 truncate text-xl font-bold tabular-nums tracking-tight ${card.color}`}>
            {card.value}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">{card.caption}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function StepsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function PeakIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
function OddIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" /><path d="M12 16h.01" />
    </svg>
  );
}
function EvenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
function TimeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function FinalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
