"use client";

import { useMemo, useState } from "react";
import {
  formatLargeNumber,
  formatLargeNumberTitle,
  formatSteps,
} from "@/lib/collatz/format";
import type { CollatzResult } from "@/lib/collatz/types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TrajectoryVisualizerProps {
  result: CollatzResult;
  displayLabel: string;
  helperCopy?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VIEW_MODES = ["Trajectory", "Tree View", "Sequence", "Odd-Only (3n+1)"] as const;
type ViewMode = (typeof VIEW_MODES)[number];

const SVG_W = 600;
const SVG_H = 200;
const Y_BOTTOM = 185;
const Y_RANGE = 160;

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function yLog(val: bigint | number, logPeak: number): number {
  const n = typeof val === "bigint" ? Number(val) : val;
  if (n <= 1) return Y_BOTTOM;
  return Y_BOTTOM - (Math.log10(Math.max(n, 1)) / Math.max(logPeak, 1)) * Y_RANGE;
}

function yLinear(val: bigint | number, peak: number): number {
  const n = typeof val === "bigint" ? Number(val) : val;
  return Y_BOTTOM - (n / Math.max(peak, 1)) * Y_RANGE;
}

function seqToPoints(seq: bigint[], peakValue: bigint, log: boolean): string {
  const len = seq.length;
  const peakN = Number(peakValue);
  const logPeak = Math.log10(Math.max(peakN, 2));
  return seq
    .map((val, i) => {
      const x = (i / Math.max(len - 1, 1)) * SVG_W;
      const y = log ? yLog(val, logPeak) : yLinear(val, peakN);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

// ─── Sub-view: Sequence ───────────────────────────────────────────────────────

function SequenceView({ result }: { result: CollatzResult }) {
  const [showAll, setShowAll] = useState(false);
  const PREVIEW = 50;
  const seq = result.full_sequence;
  const visible = showAll ? seq : seq.slice(0, PREVIEW);

  return (
    <div>
      <div
        className="overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800"
        style={{ maxHeight: 340 }}
      >
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
              {["Step", "Value", "Type", "Operation"].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((val, i) => {
              const isOdd = val % 2n !== 0n;
              const isLast = i === seq.length - 1;
              return (
                <tr
                  key={i}
                  className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                >
                  <td className="px-3 py-2 font-mono text-slate-400 dark:text-slate-400">{i}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-slate-900 dark:text-slate-100">
                    <span title={formatLargeNumberTitle(val)}>
                      {formatLargeNumber(val)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {isLast ? (
                      <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
                        Done
                      </span>
                    ) : (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isOdd
                            ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                            : "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                        }`}
                      >
                        {isOdd ? "Odd" : "Even"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">
                    {isLast ? "—" : isOdd ? "3n + 1" : "n / 2"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {seq.length > PREVIEW && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/40"
        >
          {showAll ? `↑ Show first ${PREVIEW} steps` : `↓ Show all ${seq.length} steps`}
        </button>
      )}
    </div>
  );
}

// ─── Sub-view: Odd-Only ───────────────────────────────────────────────────────

function OddOnlyView({ result }: { result: CollatzResult }) {
  const oddSteps = useMemo(
    () =>
      result.full_sequence
        .map((val, i) => ({ step: i, val }))
        .filter(({ val }) => val % 2n !== 0n),
    [result],
  );

  const [showAll, setShowAll] = useState(false);
  const PREVIEW = 40;
  const visible = showAll ? oddSteps : oddSteps.slice(0, PREVIEW);
  const evenCount = result.steps_to_1 - oddSteps.length;
  const pct =
    result.steps_to_1 > 0
      ? ((oddSteps.length / result.steps_to_1) * 100).toFixed(1)
      : "—";

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {[
          { label: "Odd steps", value: oddSteps.length.toLocaleString("en-US"), cls: "bg-violet-500/10 text-violet-600 dark:text-violet-300" },
          { label: "Even steps", value: evenCount.toLocaleString("en-US"), cls: "bg-sky-500/10 text-sky-600 dark:text-sky-300" },
          { label: "Odd density", value: `${pct}%`, cls: "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl px-3 py-2 ${s.cls}`}>
            <p className="text-[9px] font-semibold uppercase tracking-wider opacity-70">{s.label}</p>
            <p className="mt-0.5 font-mono text-base font-bold">{s.value}</p>
          </div>
        ))}
      </div>
      <div
        className="overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800"
        style={{ maxHeight: 280 }}
      >
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
              {["Original step", "Odd value (n)", "→ 3n+1 result"].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map(({ step, val }) => (
              <tr key={step} className="transition-colors hover:bg-violet-50/30 dark:hover:bg-violet-900/10">
                <td className="px-3 py-2 font-mono text-slate-400 dark:text-slate-400">{step}</td>
                <td className="px-3 py-2 font-mono font-bold text-violet-700 dark:text-violet-300">
                  <span title={formatLargeNumberTitle(val)}>
                    {formatLargeNumber(val)}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-teal-600 dark:text-teal-400">
                  <span title={formatLargeNumberTitle(3n * val + 1n)}>
                    {formatLargeNumber(3n * val + 1n)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {oddSteps.length > PREVIEW && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/40"
        >
          {showAll ? `↑ Show first ${PREVIEW} odd steps` : `↓ Show all ${oddSteps.length} odd steps`}
        </button>
      )}
    </div>
  );
}

// ─── Sub-view: Tree View ──────────────────────────────────────────────────────

function TreeView({ result }: { result: CollatzResult }) {
  const seq = result.full_sequence;
  const MAX_NODES = 24;

  const sampled = useMemo(() => {
    if (seq.length <= MAX_NODES) return seq.map((val, i) => ({ i, val }));
    const step = Math.floor(seq.length / MAX_NODES);
    const out: { i: number; val: bigint }[] = [];
    for (let i = 0; i < seq.length; i += step) {
      out.push({ i, val: seq[i] });
    }
    const last = { i: seq.length - 1, val: seq[seq.length - 1] };
    if (out[out.length - 1].i !== last.i) out.push(last);
    return out;
  }, [seq]);

  return (
    <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
      <div className="flex flex-col items-center py-2">
        {sampled.map(({ i, val }, idx) => {
          const isOdd = val % 2n !== 0n;
          const isPeak = val === result.peak_value;
          const isStart = i === 0;
          const isEnd = i === seq.length - 1;
          const prev = sampled[idx - 1];
          const skipped = prev !== undefined && prev.i < i - 1;
          return (
            <div key={i} className="flex flex-col items-center">
              {skipped && (
                <div className="flex flex-col items-center py-0.5 text-slate-400 dark:text-slate-500">
                  <span className="text-base leading-none">⋮</span>
                  <span className="text-[9px]">{i - prev.i - 1} step{i - prev.i - 1 !== 1 ? "s" : ""}</span>
                  <span className="text-base leading-none">⋮</span>
                </div>
              )}
              <div
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] ${
                  isStart ? "border-teal-500/40 bg-teal-500/10"
                    : isEnd ? "border-green-500/40 bg-green-500/10"
                    : isPeak ? "border-yellow-500/40 bg-yellow-400/10"
                    : isOdd ? "border-violet-500/30 bg-violet-500/8"
                    : "border-sky-500/20 bg-sky-500/5"
                }`}
              >
                <span className="w-8 text-right font-mono text-[9px] text-slate-400 dark:text-slate-500">{i}</span>
                <span className={`font-mono font-bold ${
                  isStart ? "text-teal-600 dark:text-teal-400"
                    : isEnd ? "text-green-600 dark:text-green-400"
                    : isPeak ? "text-yellow-600 dark:text-yellow-300"
                    : isOdd ? "text-violet-700 dark:text-violet-300"
                    : "text-sky-700 dark:text-sky-300"
                }`} title={formatLargeNumberTitle(val)}>{formatLargeNumber(val)}</span>
                {!isEnd && <span className="text-[9px] text-slate-400 dark:text-slate-400">{isOdd ? "→ 3n+1" : "→ n/2"}</span>}
                {isPeak && !isEnd && (
                  <span className="rounded bg-yellow-400/20 px-1 text-[8px] font-bold text-yellow-600 dark:text-yellow-300">PEAK</span>
                )}
              </div>
              {idx < sampled.length - 1 && <div className="h-3 w-px bg-slate-200 dark:bg-slate-800" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TrajectoryVisualizer({
  result,
  displayLabel,
  helperCopy,
}: TrajectoryVisualizerProps) {
  const [activeView, setActiveView] = useState<ViewMode>("Trajectory");
  const [showOddSteps, setShowOddSteps] = useState(false);
  const [showEvenSteps, setShowEvenSteps] = useState(false);
  const [showPeaks, setShowPeaks] = useState(true);
  const [showFirstDescent, setShowFirstDescent] = useState(false);
  const [logScale, setLogScale] = useState(true);

  const seq = result.full_sequence;
  const peakN = Number(result.peak_value);
  const logPeak = Math.log10(Math.max(peakN, 2));
  const startDisplay = formatLargeNumber(result.start_number);
  const startTitle = formatLargeNumberTitle(result.start_number);
  const peakDisplay = formatLargeNumber(result.peak_value);
  const peakTitle = formatLargeNumberTitle(result.peak_value);

  const points = useMemo(
    () => seqToPoints(seq, result.peak_value, logScale),
    [seq, result.peak_value, logScale],
  );

  const peakIdx = useMemo(
    () => seq.findIndex((v) => v === result.peak_value),
    [seq, result.peak_value],
  );

  // Use pre-computed first_descent_step from the result
  const firstDescentIdx = result.first_descent_step;

  // Sampled odd/even dots (capped to avoid SVG bloat)
  const stepDots = useMemo(() => {
    if (!showOddSteps && !showEvenSteps) return [];
    const MAX_DOTS = 200;
    const stride = seq.length > MAX_DOTS ? Math.ceil(seq.length / MAX_DOTS) : 1;
    const out: { x: number; y: number; isOdd: boolean }[] = [];
    for (let i = 0; i < seq.length; i += stride) {
      const val = seq[i];
      const isOdd = val % 2n !== 0n;
      if (isOdd && !showOddSteps) continue;
      if (!isOdd && !showEvenSteps) continue;
      const x = (i / Math.max(seq.length - 1, 1)) * SVG_W;
      const y = logScale ? yLog(val, logPeak) : yLinear(val, peakN);
      out.push({ x, y, isOdd });
    }
    return out;
  }, [seq, showOddSteps, showEvenSteps, logScale, logPeak, peakN]);

  const peakX = (Math.max(peakIdx, 0) / Math.max(seq.length - 1, 1)) * SVG_W;
  const peakY = logScale ? yLog(result.peak_value, logPeak) : yLinear(result.peak_value, peakN);
  const startY = logScale ? yLog(result.start_number, logPeak) : yLinear(result.start_number, peakN);

  const descentX =
    firstDescentIdx !== null && firstDescentIdx >= 0
      ? (firstDescentIdx / Math.max(seq.length - 1, 1)) * SVG_W
      : null;
  const descentY =
    firstDescentIdx !== null && firstDescentIdx >= 0
      ? logScale
        ? yLog(seq[firstDescentIdx], logPeak)
        : yLinear(seq[firstDescentIdx], peakN)
      : null;

  const gridLines = logScale
    ? [10, 100, 1_000].map((v) => ({ v, y: yLog(v, logPeak), label: v >= 1_000 ? `${v / 1_000}K` : String(v) }))
    : [0.25, 0.5, 0.75].map((frac) => {
        const v = Math.round(peakN * frac);
        return { v, y: yLinear(v, peakN), label: v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v) };
      });

  const checkboxes: { label: string; checked: boolean; setter: (v: boolean) => void }[] = [
    { label: "Odd steps", checked: showOddSteps, setter: setShowOddSteps },
    { label: "Even steps", checked: showEvenSteps, setter: setShowEvenSteps },
    { label: "Peaks", checked: showPeaks, setter: setShowPeaks },
    { label: "First descent", checked: showFirstDescent, setter: setShowFirstDescent },
    { label: "Log scale", checked: logScale, setter: setLogScale },
  ];

  return (
    <section id="visualizer" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="section-heading">Collatz Trajectory Visualizer</p>
              <p
                className="mt-1 text-xs text-slate-400 dark:text-slate-400"
                title={`n=${startTitle} · peak ${peakTitle}`}
              >
                n={startDisplay} · {formatSteps(result.steps_to_1)} steps ·
                peak {peakDisplay} · {logScale ? "log" : "linear"} scale
              </p>
              {helperCopy && (
                <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">{helperCopy}</p>
              )}
            </div>

            {/* View mode tabs */}
            <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {VIEW_MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setActiveView(m)}
                  className={`flex-shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    activeView === m
                      ? "bg-teal-500/20 text-teal-500 ring-1 ring-teal-500/40 dark:text-teal-300"
                      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* ── Trajectory tab ────────────────────────────────────────────── */}
          {activeView === "Trajectory" && (
            <>
              {/* Legend */}
              <div className="mb-5 grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5">
                {[
                  { color: "bg-violet-500", label: "Odd steps (3n+1)" },
                  { color: "bg-sky-500", label: "Even steps (n/2)" },
                  { color: "bg-yellow-400", label: "Peaks" },
                  { color: "bg-orange-400", label: "First descent" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-sm ${item.color}`} />
                    <span className="text-xs text-slate-500 dark:text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* SVG */}
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                <svg
                  viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                  width="100%"
                  height="auto"
                  className="block"
                  aria-label={`Collatz trajectory for n=${startTitle}, ${logScale ? "log" : "linear"} scale, ${result.steps_to_1} steps`}
                >
                  {gridLines.map(({ v, y }) => (
                    <line key={v} x1="0" y1={y} x2={SVG_W} y2={y} stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />
                  ))}
                  {gridLines.map(({ v, y, label }) => (
                    <text key={v} x="4" y={y + 4} fontSize="8" fill="currentColor" opacity="0.4">{label}</text>
                  ))}
                  <text x="4" y="12" fontSize="7" fill="currentColor" opacity="0.35">
                    Value ({logScale ? "log" : "linear"})
                  </text>

                  <polyline points={`0,${Y_BOTTOM} ${points} ${SVG_W},${Y_BOTTOM}`} fill="url(#trailFill)" stroke="none" />
                  <polyline points={points} fill="none" stroke="url(#trailLine)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />

                  {stepDots.map((d, i) => (
                    <circle key={i} cx={d.x} cy={d.y} r="2" fill={d.isOdd ? "#a855f7" : "#0ea5e9"} opacity="0.65" />
                  ))}

                  {showFirstDescent && descentX !== null && descentY !== null && (
                    <>
                      <circle cx={descentX} cy={descentY} r="4" fill="#fb923c" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
                      <text x={descentX + 6} y={descentY - 4} fontSize="7" fill="#f97316" fontWeight="600">First descent</text>
                    </>
                  )}

                  {showPeaks && (
                    <>
                      <circle cx={peakX} cy={peakY} r="4" fill="#facc15" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
                      <line x1={peakX} y1={peakY + 5} x2={peakX} y2={Y_BOTTOM} stroke="#facc15" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="3 3" />
                      <rect x={peakX + 6} y={peakY - 3} width="62" height="14" rx="3" fill="#facc15" fillOpacity="0.15" />
                      <text x={peakX + 9} y={peakY + 7} fontSize="8.5" fill="#ca8a04" fontWeight="600">
                        Peak: {peakDisplay}
                        <title>{peakTitle}</title>
                      </text>
                    </>
                  )}

                  <circle cx="0" cy={startY} r="3" fill="#14b8a6" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
                  <text x="4" y={startY - 4} fontSize="8" fill="#14b8a6" fontWeight="600">
                    n={startDisplay}
                    <title>{startTitle}</title>
                  </text>
                  <circle cx={SVG_W} cy={Y_BOTTOM} r="3" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />

                  {[0, 20, 40, 60, 80, 100, result.steps_to_1]
                    .filter((s, i, arr) => s <= result.steps_to_1 && arr.indexOf(s) === i)
                    .map((s) => (
                      <text key={s} x={(s / Math.max(result.steps_to_1, 1)) * SVG_W} y={SVG_H - 2} fontSize="8" fill="currentColor" opacity="0.35">{s}</text>
                    ))}
                  <text x={SVG_W / 2} y={SVG_H - 2} fontSize="8" fill="currentColor" opacity="0.3" textAnchor="middle">Step</text>

                  <defs>
                    <linearGradient id="trailLine" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#14b8a6" />
                      <stop offset="50%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                    <linearGradient id="trailFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="absolute right-3 top-2">
                  <span className="rounded-full bg-teal-500/15 px-2.5 py-1 text-[10px] font-semibold text-teal-500 dark:text-teal-300">
                    {displayLabel}
                  </span>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:flex-wrap sm:items-center">
                {checkboxes.map(({ label, checked, setter }) => (
                  <label key={label} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setter(e.target.checked)}
                      className="h-3.5 w-3.5 rounded accent-teal-500"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {activeView === "Tree View" && <TreeView result={result} />}
          {activeView === "Sequence" && <SequenceView result={result} />}
          {activeView === "Odd-Only (3n+1)" && <OddOnlyView result={result} />}

          {/* Footer */}
          <p
            className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-400"
            title={`peak ${peakTitle}`}
          >
            {displayLabel} · {result.steps_to_1} steps · peak {peakDisplay}
          </p>
        </div>
      </div>
    </section>
  );
}
