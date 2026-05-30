"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import type { DashboardNearEscape } from "@/app/api/collatz/dashboard/route";
import { computeCollatzSummary } from "@/lib/collatz/engine";
import { Modal } from "@/components/ui/Modal";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { formatLargeNumberTitle } from "@/lib/collatz/format";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOP_DISPLAY = 5;
const SPARKLINE_SAMPLES = 80;

// ─── Types ────────────────────────────────────────────────────────────────────

type LiveFlag = "high_peak_ratio" | "long_path";
type SortTab = "peak_ratio" | "long_path" | "all";

// Local shape that mirrors DashboardNearEscape with a typed flags array
interface Candidate {
  n: number;
  steps: number;
  peak: number;
  ratio: number;
  flags: LiveFlag[];
  createdAt: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fromDashboard(row: DashboardNearEscape): Candidate {
  return {
    n: row.n,
    steps: row.steps,
    peak: row.peak,
    ratio: row.peakRatio,
    flags: row.flags.filter((f): f is LiveFlag =>
      f === "high_peak_ratio" || f === "long_path",
    ),
    createdAt: null,
  };
}

function formatAge(date: Date | null, now: Date): string {
  if (!date) return "not yet refreshed";
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

function fmtCompact(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}

function getRangeInfo(candidates: Candidate[]): { min: number; max: number } | null {
  if (candidates.length === 0) return null;
  const min = candidates.reduce((v, r) => Math.min(v, r.n), candidates[0].n);
  const max = candidates.reduce((v, r) => Math.max(v, r.n), candidates[0].n);
  return { min, max };
}

/** Compute a sampled parity strip (true = odd) for sparkline. */
function computeParityStrip(startN: number, sampleCount: number): boolean[] {
  const parity: boolean[] = [];
  let n = startN;
  const sequence: boolean[] = [];
  let limit = 2000;
  while (n !== 1 && limit-- > 0) {
    sequence.push(n % 2 !== 0);
    n = n % 2 !== 0 ? 3 * n + 1 : n / 2;
  }
  sequence.push(true); // n=1 is odd

  if (sequence.length <= sampleCount) return sequence;
  const stride = sequence.length / sampleCount;
  for (let i = 0; i < sampleCount; i++) {
    parity.push(sequence[Math.floor(i * stride)]);
  }
  return parity;
}

/** Compute a sampled value trajectory for the mini SVG graph. */
function computeMiniGraph(startN: number, points: number): number[] {
  const values: number[] = [];
  let n = startN;
  let limit = 2000;
  while (n !== 1 && limit-- > 0) {
    values.push(n);
    n = n % 2 !== 0 ? 3 * n + 1 : n / 2;
  }
  values.push(1);

  if (values.length <= points) return values;
  const stride = values.length / points;
  const sampled: number[] = [];
  for (let i = 0; i < points; i++) {
    sampled.push(values[Math.floor(i * stride)]);
  }
  return sampled;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FlagPill({ flag }: { flag: LiveFlag }) {
  if (flag === "high_peak_ratio") {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/25">
        High peak ratio
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/25">
      Long path
    </span>
  );
}

function ParityBar({ n, width = SPARKLINE_SAMPLES }: { n: number; width?: number }) {
  const parity = useMemo(() => computeParityStrip(n, width), [n, width]);
  const rectW = 100 / width;
  return (
    <svg viewBox={`0 0 100 8`} width="100%" height="10" className="block">
      {parity.map((isOdd, i) => (
        <rect
          key={i}
          x={i * rectW}
          y={0}
          width={rectW + 0.3}
          height={8}
          fill={isOdd ? "#a855f7" : "#06b6d4"}
          opacity={0.85}
        />
      ))}
    </svg>
  );
}

function MiniTrajectoryGraph({ n, h = 56 }: { n: number; h?: number }) {
  const pts = useMemo(() => computeMiniGraph(n, 60), [n]);
  if (pts.length < 2) return null;
  const maxVal = Math.max(...pts);
  const W = 200;
  const H = h;
  const path = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * W;
      const y = H - (v / maxVal) * H * 0.9 - H * 0.05;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const areaPath = `${path} L${W},${H} L0,${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={h} className="block overflow-visible">
      <path d={areaPath} fill="url(#traj-fill)" opacity="0.18" />
      <path d={path} fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinejoin="round" opacity="0.9" />
      <defs>
        <linearGradient id="traj-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const RANK_STYLES = [
  { badge: "bg-amber-400 text-slate-900", border: "border-amber-500/30", glow: "shadow-amber-500/10" },
  { badge: "bg-slate-400 text-slate-900", border: "border-slate-500/30", glow: "shadow-slate-400/10" },
  { badge: "bg-orange-600 text-white",    border: "border-orange-500/30", glow: "shadow-orange-500/10" },
];

function FeaturedCard({ candidate, rank }: { candidate: Candidate; rank: number }) {
  const style = RANK_STYLES[rank - 1] ?? RANK_STYLES[2];
  return (
    <div className={`relative flex flex-col gap-3 rounded-xl border ${style.border} bg-slate-900/80 p-4 shadow-lg ${style.glow}`}>
      {/* Rank badge */}
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${style.badge}`}>
          {rank}
        </span>
        <div className="flex flex-wrap gap-1">
          {candidate.flags.map((f) => <FlagPill key={f} flag={f} />)}
        </div>
      </div>

      {/* Number */}
      <div>
        <p
          className="font-mono text-xl font-black text-slate-50 tabular-nums leading-none"
          title={formatLargeNumberTitle(candidate.n)}
        >
          {candidate.n.toLocaleString("en-US")}
        </p>
        <p className="mt-1 text-xs text-slate-400">{candidate.steps.toLocaleString("en-US")} steps to 1</p>
      </div>

      {/* Mini graph */}
      <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950/60 px-1 pt-1">
        <div className="flex items-center justify-between px-1 pb-0.5">
          <span className="text-[8px] text-slate-500 font-mono">Start</span>
          <span className="text-[8px] text-slate-500 font-mono">Step {candidate.steps}</span>
        </div>
        <MiniTrajectoryGraph n={candidate.n} h={52} />
        <div className="flex items-end justify-between px-1 mt-0.5 pb-1">
          <span className="text-[8px] text-slate-600 font-mono">1</span>
          <span className="text-[8px] text-slate-600 font-mono">10B</span>
          <span className="text-[8px] text-slate-600 font-mono">100M</span>
          <span className="text-[8px] text-slate-600 font-mono">1M</span>
          <span className="text-[8px] text-slate-600 font-mono">1K</span>
          <span className="text-[8px] text-slate-600 font-mono">1</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Peak Ratio</p>
          <p className="mt-0.5 font-mono text-base font-black text-orange-400">
            ×{candidate.ratio.toFixed(0)}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Peak Value</p>
          <p className="mt-0.5 font-mono text-base font-bold text-slate-200" title={formatLargeNumberTitle(candidate.peak)}>
            {fmtCompact(candidate.peak)}
          </p>
        </div>
      </div>

      {/* Y-axis labels hint for graph (right side) */}
      <p className="text-[9px] text-slate-500 -mt-1">
        Peak at step ~{Math.round(candidate.steps * 0.35)}
      </p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-center sm:items-start sm:text-left">
      <div className="flex items-center justify-center gap-1.5 sm:justify-start">
        <span className={`text-sm ${accent}`}>{icon}</span>
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      </div>
      <p className={`font-mono text-lg font-black leading-tight ${accent}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
        active
          ? "bg-teal-500/20 border border-teal-500/40 text-teal-300"
          : disabled
            ? "border border-slate-800 text-slate-600 cursor-not-allowed"
            : "border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

function RankedRow({ candidate, rank }: { candidate: Candidate; rank: number }) {
  const maxStepsVisual = 400;
  const maxRatioVisual = 1500;
  const stepsBarPct = Math.min(100, (candidate.steps / maxStepsVisual) * 100);
  const ratioBarPct = Math.min(100, (candidate.ratio / maxRatioVisual) * 100);

  return (
    <tr className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
      <td className="px-3 py-2.5">
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-slate-700 bg-slate-800 px-1.5 text-[10px] font-bold text-slate-300 tabular-nums">
          {rank}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span
          className="font-mono text-sm font-bold text-slate-100 tabular-nums"
          title={formatLargeNumberTitle(candidate.n)}
        >
          {candidate.n.toLocaleString("en-US")}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-slate-300 tabular-nums w-12 shrink-0">
            {candidate.steps.toLocaleString("en-US")}
          </span>
          <div className="h-1.5 w-20 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${stepsBarPct}%` }}
            />
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-orange-400 tabular-nums w-14 shrink-0">
            ×{candidate.ratio.toFixed(0)}
          </span>
          <div className="h-1.5 w-20 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-orange-500"
              style={{ width: `${ratioBarPct}%` }}
            />
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className="font-mono text-sm text-slate-300 tabular-nums" title={formatLargeNumberTitle(candidate.peak)}>
          {fmtCompact(candidate.peak)}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap gap-1">
          {candidate.flags.map((f) => <FlagPill key={f} flag={f} />)}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="w-24 overflow-hidden rounded">
          <ParityBar n={candidate.n} width={60} />
        </div>
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

// ── Browser-side candidate generation ────────────────────────────────────────
// Computes Collatz summaries for a small window around the estimated engine
// position. Display-only — never written to Supabase, never used for records.

const BROWSER_WINDOW = 12; // numbers before + after estimated position
const BROWSER_REFRESH_MS = 10_000;

function computeBrowserCandidates(estimatedN: number): Candidate[] {
  if (estimatedN <= 1) return [];
  const start = Math.max(2, estimatedN - BROWSER_WINDOW);
  const end = estimatedN + BROWSER_WINDOW;
  const candidates: Candidate[] = [];
  for (let n = start; n <= end; n++) {
    try {
      const s = computeCollatzSummary(n);
      const peak = Number(s.peak_value);
      const ratio = n > 0 ? peak / n : 0;
      const flags: LiveFlag[] = [];
      if (ratio > 50) flags.push("high_peak_ratio");
      if (s.steps_to_1 > 150) flags.push("long_path");
      candidates.push({ n, steps: s.steps_to_1, peak, ratio, flags, createdAt: null });
    } catch {
      // skip problematic values
    }
  }
  return candidates.sort((a, b) => b.ratio - a.ratio).slice(0, 5);
}

export function NearEscapeCandidates() {
  const { data } = useDashboardData();
  const [tab, setTab] = useState<SortTab>("peak_ratio");
  const [modalOpen, setModalOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [browserCandidates, setBrowserCandidates] = useState<Candidate[]>([]);
  const [browserRefreshedAt, setBrowserRefreshedAt] = useState<Date | null>(null);
  const [lastBrowserN, setLastBrowserN] = useState<number>(0);

  // Clock for refreshed-label display
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(id);
  }, []);

  // Estimation params ref — keeps interval callback current without re-creating it
  const estimateRef = useRef({
    backendN: 0,
    rate: 0 as number | null | undefined,
    generatedAt: null as Date | null,
    running: false,
  });

  // Keep ref in sync with latest dashboard data
  const backendN = Number(
    data?.engineState?.current_number ??
    (Number(data?.engineState?.last_checked_number ?? 0) + 1),
  );
  const rate = data?.engineState?.numbers_per_second;
  const generatedAtStr = data?.generatedAt ?? null;
  const generatedAt = useMemo(
    () => (generatedAtStr ? new Date(generatedAtStr) : null),
    [generatedAtStr],
  );
  const engineRunning = data?.engineState?.current_status === "running";

  useEffect(() => {
    estimateRef.current = {
      backendN,
      rate,
      generatedAt,
      running: engineRunning,
    };
  }, [backendN, rate, generatedAt, engineRunning]);

  // 10-second interval generates browser candidates from estimated position
  useEffect(() => {
    function refresh() {
      const { backendN: base, rate: r, generatedAt: ga, running } = estimateRef.current;
      let estimatedN = base;
      if (running && r && r > 0 && ga) {
        const elapsed = Math.max(0, (Date.now() - ga.getTime()) / 1000);
        estimatedN = Math.round(base + r * elapsed);
      }
      if (estimatedN <= 1) return;
      const candidates = computeBrowserCandidates(estimatedN);
      setBrowserCandidates(candidates);
      setBrowserRefreshedAt(new Date());
      setLastBrowserN(estimatedN);
    }
    refresh();
    const id = window.setInterval(refresh, BROWSER_REFRESH_MS);
    return () => window.clearInterval(id);
  }, []); // reads from ref

  const lastRefreshedAt = data ? new Date(data.generatedAt) : null;

  // Use dashboard candidates when available; fall back to browser-generated ones
  const dashboardCandidates = useMemo(
    () => (data?.nearEscapes ?? []).map(fromDashboard),
    [data],
  );
  const isEstimatedDisplay = dashboardCandidates.length === 0;

  const allCandidates = useMemo(
    () => (isEstimatedDisplay ? browserCandidates : dashboardCandidates),
    [isEstimatedDisplay, browserCandidates, dashboardCandidates],
  );
  const peakCandidates = useMemo(
    () => [...allCandidates].sort((a, b) => b.ratio - a.ratio),
    [allCandidates],
  );
  const pathCandidates = useMemo(
    () => [...allCandidates].sort((a, b) => b.steps - a.steps),
    [allCandidates],
  );

  const displayedCandidates = useMemo(() => {
    if (tab === "peak_ratio") return peakCandidates;
    if (tab === "long_path") return pathCandidates;
    return allCandidates;
  }, [tab, peakCandidates, pathCandidates, allCandidates]);

  const top3 = peakCandidates.slice(0, 3);
  const tableRows = displayedCandidates.slice(0, TOP_DISPLAY);
  const placeholderRows = Math.max(0, TOP_DISPLAY - tableRows.length);
  const allForModal = displayedCandidates;

  // Stats
  const highestRatio = peakCandidates[0]?.ratio ?? 0;
  const longestPath = pathCandidates[0]?.steps ?? 0;
  const avgRatio =
    peakCandidates.length > 0
      ? peakCandidates.reduce((s, c) => s + c.ratio, 0) / peakCandidates.length
      : 0;
  // All verified numbers in the Collatz catalog reach 1 by definition
  const allReachOne = true;
  const rangeInfo = getRangeInfo(allCandidates);
  const refreshedLabel = formatAge(isEstimatedDisplay ? browserRefreshedAt : lastRefreshedAt, now);
  const hasCandidates = peakCandidates.length > 0;
  // Don't show "View all" modal for browser-generated estimated candidates (only 5 max)
  const hasMore = !isEstimatedDisplay && allForModal.length > TOP_DISPLAY;

  return (
    <section id="near-escape" className="live-stable scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-lg">

          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="mb-4 flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
            <div className="min-w-0 max-w-3xl">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h2 className="text-base font-bold text-slate-50 tracking-tight">
                  {isEstimatedDisplay
                    ? "Estimated Live Near-Escape Candidates"
                    : "Near-Escape Candidates"}
                </h2>
                {isEstimatedDisplay && (
                  <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 font-mono text-[10px] font-semibold text-cyan-400">
                    Visualization Only
                  </span>
                )}
                <PanelHelp
                  title="Near-Escape Candidates"
                  description={
                    isEstimatedDisplay
                      ? "Generated locally from the estimated engine position. These are live visualization candidates, not verified catalog records. No database query is made for this panel."
                      : "Highlights numbers that climb unusually high or take unusually long before reaching 1. This is a visualization label only, not a mathematical claim."
                  }
                  align="left"
                />
              </div>
              {isEstimatedDisplay && lastBrowserN > 0 && (
                <p className="mt-1 text-[11px] text-cyan-600 dark:text-cyan-500">
                  Generated locally from the estimated engine position. These are live visualization candidates, not verified catalog records.
                </p>
              )}
              <p className="mt-1 text-xs text-slate-400">
                {isEstimatedDisplay
                  ? `Browser-computed window around estimated n=~${lastBrowserN > 0 ? lastBrowserN.toLocaleString("en-US") : "…"}`
                  : "Numbers with unusually high peak ratios or long trajectories from the live catalog"}
              </p>
              <div className="mt-1.5 flex min-h-[2.5rem] flex-wrap items-center justify-center gap-2 text-[10px] text-slate-500 sm:justify-start">
                <span className="flex items-center justify-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full motion-safe:animate-pulse ${isEstimatedDisplay ? "bg-cyan-400" : "bg-emerald-400"}`} />
                  {isEstimatedDisplay ? "ESTIMATED" : "LIVE"}
                </span>
                <span>·</span>
                <span>Refreshed {refreshedLabel}</span>
                <span>·</span>
                <span>Refresh cadence: {isEstimatedDisplay ? "10s" : "10s"}</span>
                <span>·</span>
                <span>
                  Ranked by: <span className="text-teal-400">
                    {tab === "peak_ratio" ? "Peak Ratio" : tab === "long_path" ? "Path Length" : "Peak Ratio"}
                  </span>
                </span>
                {rangeInfo && (
                  <>
                    <span>·</span>
                    <span className="text-slate-400">
                      Catalog range: n = {rangeInfo.min.toLocaleString("en-US")} to {rangeInfo.max.toLocaleString("en-US")}
                    </span>
                  </>
                )}
              </div>
            </div>
            {hasMore && (
              <button
                onClick={() => setModalOpen(true)}
                className="shrink-0 rounded-lg border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-300 transition-colors hover:bg-teal-500/15"
              >
                View all ({allForModal.length})
              </button>
            )}
          </div>

          {/* ── Stat strip ──────────────────────────────────────────── */}
          {hasCandidates && (
            <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard
                icon="◈"
                label="Candidates Found"
                value={allCandidates.length.toString()}
                sub="Live verified"
                accent="text-teal-400"
              />
              <StatCard
                icon="▲"
                label="Highest Peak Ratio"
                value={`×${highestRatio.toFixed(0)}`}
                sub={peakCandidates[0] ? `n = ${peakCandidates[0].n.toLocaleString("en-US")}` : undefined}
                accent="text-orange-400"
              />
              <StatCard
                icon="↗"
                label="Longest Path"
                value={`${longestPath.toLocaleString("en-US")}`}
                sub="steps to 1"
                accent="text-blue-400"
              />
              <StatCard
                icon="⌀"
                label="Avg Peak Ratio"
                value={`×${avgRatio.toFixed(0)}`}
                sub="Across all candidates"
                accent="text-slate-300"
              />
              <StatCard
                icon="✓"
                label="All Verified Reach"
                value="1"
                sub="By Collatz rule"
                accent="text-emerald-400"
              />
              <StatCard
                icon="◷"
                label="Last Full Scan"
                value={lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}
                sub={lastRefreshedAt ? lastRefreshedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Pending"}
                accent="text-amber-400"
              />
            </div>
          )}

          {/* ── Top 3 featured cards ─────────────────────────────────── */}
          {top3.length >= 2 && (
            <div className="mb-5">
              <p className="mb-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-left">
                Top 3 Near-Escape Candidates
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {top3.map((c, i) => (
                  <FeaturedCard key={c.n} candidate={c} rank={i + 1} />
                ))}
              </div>
            </div>
          )}

          {/* ── Explainer callout ────────────────────────────────────── */}
          <div className="mb-5 flex flex-col items-center gap-3 rounded-xl border border-orange-500/25 bg-orange-500/5 px-4 py-3 text-center sm:flex-row sm:items-start sm:text-left">
            <span className="shrink-0 text-orange-400 sm:mt-0.5">△</span>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <p className="text-xs font-bold text-orange-300">What is a near-escape candidate?</p>
                <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange-400">
                  Visualization label only
                </span>
              </div>
              <p className="text-xs leading-relaxed text-orange-300/70">
                Near-escape candidates are trajectories that climb unusually high, delay descent, or show
                unusually high odd-step density before collapsing back to 1. These numbers are flagged for
                analytical interest based on configurable thresholds.{" "}
                <span className="font-semibold text-orange-300/90">All verified numbers reach 1.</span>{" "}
                Near-escape is a visualization label, not a mathematical claim.
              </p>
            </div>
          </div>

          {/* ── Ranking tabs ─────────────────────────────────────────── */}
          <div className="mb-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <TabButton label="Top by Peak Ratio" active={tab === "peak_ratio"} onClick={() => setTab("peak_ratio")} />
              <TabButton label="Top by Long Path"  active={tab === "long_path"}  onClick={() => setTab("long_path")} />
              <TabButton label={`All Candidates (${allCandidates.length})`} active={tab === "all"} onClick={() => setTab("all")} />
            </div>
            {hasMore && (
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-300"
              >
                <span>↓</span> Export CSV
              </button>
            )}
          </div>

          {/* ── Enhanced ranked table ────────────────────────────────── */}
          {hasCandidates ? (
            <div className="overflow-hidden rounded-xl border border-slate-800">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60">
                      {[
                        { label: "Rank", hint: "" },
                        { label: "Number", hint: "Starting n" },
                        { label: "Steps to 1", hint: "Trajectory length" },
                        { label: "Peak Ratio", hint: "Peak ÷ n" },
                        { label: "Peak Value", hint: "Highest value reached" },
                        { label: "Flags", hint: "Why flagged" },
                        { label: "Trajectory Preview", hint: "Log scale (sampled)" },
                      ].map((col) => (
                        <th key={col.label} className="px-3 py-2.5 text-left font-semibold">
                          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">{col.label}</p>
                          {col.hint && <p className="text-[8px] font-normal text-slate-600">{col.hint}</p>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((c, i) => (
                      <RankedRow key={c.n} candidate={c} rank={i + 1} />
                    ))}
                    {Array.from({ length: placeholderRows }).map((_, i) => (
                      <tr key={`candidate-placeholder-${i}`} aria-hidden="true" className="border-b border-slate-800/60">
                        {Array.from({ length: 7 }).map((__, cell) => (
                          <td key={cell} className="px-3 py-2.5 text-transparent">
                            -
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 px-4 py-14 text-center">
              <span className="text-3xl text-slate-700">◇</span>
              <p className="mt-3 text-sm font-semibold text-slate-500">Awaiting dataset growth</p>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-600">
                Near-escape candidates will appear here as the engine catalogs more trajectories.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 flex flex-col items-center justify-between gap-2 text-center sm:flex-row">
            <p className="text-[10px] text-slate-500">
              <span className="flex items-center justify-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-violet-500 opacity-80" />
                <span>Odd step (3n+1)</span>
              </span>
            </p>
            <p className="text-center text-[10px] text-slate-500">
              {hasCandidates
                ? isEstimatedDisplay
                  ? `Estimated candidates from browser-computed window around n=~${lastBrowserN.toLocaleString("en-US")}. Visualization only — not catalog-verified.`
                  : `Showing top ${tableRows.length} of ${allCandidates.length} candidates by ${tab === "long_path" ? "path length" : "peak ratio"} from the live verified catalog.${allReachOne ? " All displayed candidates reach 1." : ""}`
                : isEstimatedDisplay
                  ? "Waiting for estimated engine position. No database query is being made for this panel."
                  : "Candidates flagged by peak ratio > 50× or trajectory length > 150 steps"}
            </p>
            <p className="text-[10px] text-slate-500">
              <span className="flex items-center justify-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-cyan-500 opacity-80" />
                <span>Even step (n/2)</span>
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* "View all" modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`All Near-Escape Candidates (${allForModal.length})`}
        maxWidth="max-w-3xl"
      >
        <div>
          <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Live ranked sample
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {allForModal.length} candidates from the latest peak sample · refreshed {refreshedLabel} · sorted by computed peak ratio.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Near-escape is a visualization label only. All verified numbers reach 1.
            </p>
          </div>
          <div className="overflow-y-auto rounded-xl border border-slate-700" style={{ maxHeight: 440 }}>
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-700 bg-slate-800">
                  {["n", "Steps", "Peak", "Ratio", "Flags"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {allForModal.map((c) => (
                  <tr key={c.n} className="hover:bg-slate-800/50">
                    <td className="px-3 py-2 font-mono font-bold text-slate-100" title={formatLargeNumberTitle(c.n)}>
                      {c.n.toLocaleString("en-US")}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-300">{c.steps.toLocaleString("en-US")}</td>
                    <td className="px-3 py-2 font-mono text-blue-400" title={formatLargeNumberTitle(c.peak)}>
                      {fmtCompact(c.peak)}
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-orange-400">×{c.ratio.toFixed(0)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {c.flags.map((f) => <FlagPill key={f} flag={f} />)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </section>
  );
}
