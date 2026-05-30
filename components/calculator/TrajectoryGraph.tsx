"use client";

import { useMemo, useState, useId } from "react";
import type { CalcResult } from "@/lib/collatz/calculator";
import { fmtNum } from "@/lib/collatz/calculator";

interface Props {
  result: CalcResult;
  logScale: boolean;
  onLogScaleChange: (v: boolean) => void;
}

const SVG_W = 800;
const SVG_H = 280;
const PAD_LEFT = 64;
const PAD_RIGHT = 24;
const PAD_TOP = 16;
const PAD_BOTTOM = 40;
const CHART_W = SVG_W - PAD_LEFT - PAD_RIGHT;
const CHART_H = SVG_H - PAD_TOP - PAD_BOTTOM;

// ─── Y-axis helpers ───────────────────────────────────────────────────────────

function safeLog(v: number) {
  return v > 0 ? Math.log10(v) : 0;
}

function yForValue(v: number, minY: number, maxY: number, log: boolean): number {
  if (log) {
    const logMin = safeLog(Math.max(minY, 1));
    const logMax = safeLog(Math.max(maxY, 2));
    const range = logMax - logMin;
    if (range === 0) return PAD_TOP + CHART_H;
    const fraction = (safeLog(Math.max(v, 1)) - logMin) / range;
    return PAD_TOP + CHART_H - fraction * CHART_H;
  }
  const range = maxY - minY;
  if (range === 0) return PAD_TOP + CHART_H;
  const fraction = (v - minY) / range;
  return PAD_TOP + CHART_H - fraction * CHART_H;
}

function xForIndex(i: number, total: number): number {
  if (total <= 1) return PAD_LEFT;
  return PAD_LEFT + (i / (total - 1)) * CHART_W;
}

function formatAxisValue(v: number): string {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + "B";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "k";
  return String(Math.round(v));
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TrajectoryGraph({ result, logScale, onLogScaleChange }: Props) {
  const gradId = useId().replace(/:/g, "");
  const areaId = useId().replace(/:/g, "");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const pts = result.graphPoints;
  const total = pts.length;

  const { minY, maxY, polyline, areaPath, yTicks, xTicks } = useMemo(() => {
    if (total === 0) return { minY: 0, maxY: 1, polyline: "", areaPath: "", yTicks: [], xTicks: [] };

    const ys = pts.map((p) => p.y);
    const minY = Math.max(0, Math.min(...ys));
    const maxY = Math.max(...ys);

    const points = pts.map((p, i) => {
      const x = xForIndex(i, total);
      const y = yForValue(p.y, minY, maxY, logScale);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const polyline = points.join(" ");

    // Area path: start from bottom-left, go through points, back down to bottom-right
    const firstX = PAD_LEFT;
    const lastX = xForIndex(total - 1, total);
    const bottomY = PAD_TOP + CHART_H;
    const areaPath = `M${firstX},${bottomY} L${points.join(" L")} L${lastX},${bottomY} Z`;

    // Y axis ticks
    const yTickCount = 5;
    const yTicks: { y: number; label: string }[] = [];
    for (let i = 0; i <= yTickCount; i++) {
      const fraction = i / yTickCount;
      let val: number;
      if (logScale) {
        const logMin = safeLog(Math.max(minY, 1));
        const logMax = safeLog(Math.max(maxY, 2));
        val = Math.pow(10, logMin + fraction * (logMax - logMin));
      } else {
        val = minY + fraction * (maxY - minY);
      }
      const yPx = yForValue(val, minY, maxY, logScale);
      yTicks.push({ y: yPx, label: formatAxisValue(val) });
    }

    // X axis ticks
    const xTickCount = Math.min(8, total - 1);
    const xTicks: { x: number; label: string }[] = [];
    for (let i = 0; i <= xTickCount; i++) {
      const ptIdx = Math.round((i / xTickCount) * (total - 1));
      const xPx = xForIndex(ptIdx, total);
      xTicks.push({ x: xPx, label: fmtNum(pts[ptIdx]?.x ?? 0) });
    }

    return { minY, maxY, polyline, areaPath, yTicks, xTicks };
  }, [pts, total, logScale]);

  const hoverPt = hoverIdx !== null ? pts[hoverIdx] : null;
  const hoverX = hoverPt ? xForIndex(hoverIdx!, total) : 0;
  const hoverY = hoverPt ? yForValue(hoverPt.y, minY, maxY, logScale) : 0;

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const xRel = (e.clientX - rect.left) * (SVG_W / rect.width) - PAD_LEFT;
    if (xRel < 0 || xRel > CHART_W || total === 0) { setHoverIdx(null); return; }
    const idx = Math.round((xRel / CHART_W) * (total - 1));
    setHoverIdx(Math.max(0, Math.min(total - 1, idx)));
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
      {/* Header */}
      <div className="mb-4 flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
        <h2 className="text-sm font-semibold text-slate-200">Trajectory Graph</h2>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
          <span className="inline-flex h-2 w-5 rounded-full bg-gradient-to-r from-teal-500 to-cyan-400" />
          <span className="text-[10px] text-slate-500">Value</span>
          <div className="ml-2 flex overflow-hidden rounded-lg border border-slate-700">
            {(["Linear", "Logarithmic"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onLogScaleChange(mode === "Logarithmic")}
                className={`px-3 py-1 text-[10px] font-semibold transition-colors ${
                  (mode === "Logarithmic") === logScale
                    ? "bg-teal-500/20 text-teal-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative overflow-hidden rounded-xl bg-[#0a0f1e]">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full"
          style={{ height: "clamp(200px, 35vw, 320px)" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
          aria-label="Collatz trajectory graph"
          role="img"
        >
          <defs>
            <linearGradient id={`grad-${gradId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.02" />
            </linearGradient>
            <clipPath id={`clip-${areaId}`}>
              <rect x={PAD_LEFT} y={PAD_TOP} width={CHART_W} height={CHART_H} />
            </clipPath>
          </defs>

          {/* Grid lines */}
          {yTicks.map((t, i) => (
            <line
              key={i}
              x1={PAD_LEFT}
              x2={PAD_LEFT + CHART_W}
              y1={t.y}
              y2={t.y}
              stroke="#1e293b"
              strokeWidth="1"
            />
          ))}

          {/* Area fill */}
          <path
            d={areaPath}
            fill={`url(#grad-${gradId})`}
            clipPath={`url(#clip-${areaId})`}
          />

          {/* Line */}
          <polyline
            points={polyline}
            fill="none"
            stroke="url(#line-grad)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            clipPath={`url(#clip-${areaId})`}
          />
          <defs>
            <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>

          {/* Y axis labels */}
          {yTicks.map((t, i) => (
            <text
              key={i}
              x={PAD_LEFT - 6}
              y={t.y + 4}
              textAnchor="end"
              fontSize="9"
              fill="#475569"
            >
              {t.label}
            </text>
          ))}

          {/* X axis labels */}
          {xTicks.map((t, i) => (
            <text
              key={i}
              x={t.x}
              y={PAD_TOP + CHART_H + 20}
              textAnchor="middle"
              fontSize="9"
              fill="#475569"
            >
              {t.label}
            </text>
          ))}

          {/* Axis labels */}
          <text x={PAD_LEFT + CHART_W / 2} y={SVG_H - 2} textAnchor="middle" fontSize="9" fill="#334155">
            Step
          </text>

          {/* Hover crosshair */}
          {hoverPt && (
            <>
              <line
                x1={hoverX}
                x2={hoverX}
                y1={PAD_TOP}
                y2={PAD_TOP + CHART_H}
                stroke="#14b8a6"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <circle cx={hoverX} cy={hoverY} r="4" fill="#14b8a6" stroke="#020617" strokeWidth="2" />
              <HoverTooltip x={hoverX} y={hoverY} step={hoverPt.x} value={hoverPt.y} />
            </>
          )}
        </svg>
      </div>

      {/* Mini range note */}
      {result.graphPoints.length < result.sequenceLength && (
        <p className="mt-2 text-center text-[10px] text-slate-600 sm:text-left">
          Showing {fmtNum(result.graphPoints.length)} sampled points from {fmtNum(result.sequenceLength)} sequence values for performance.
        </p>
      )}
    </div>
  );
}

// ─── Hover tooltip ────────────────────────────────────────────────────────────

function HoverTooltip({ x, y, step, value }: { x: number; y: number; step: number; value: number }) {
  const tw = 110;
  const th = 36;
  const tx = Math.min(x + 8, SVG_W - tw - 4);
  const ty = Math.max(y - th - 4, PAD_TOP);

  return (
    <g>
      <rect x={tx} y={ty} width={tw} height={th} rx="4" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
      <text x={tx + 6} y={ty + 13} fontSize="8" fill="#94a3b8">
        Step {fmtNum(step)}
      </text>
      <text x={tx + 6} y={ty + 26} fontSize="9" fontWeight="600" fill="#14b8a6">
        {formatAxisValueTooltip(value)}
      </text>
    </g>
  );
}

function formatAxisValueTooltip(v: number): string {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(3) + "B";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(3) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "k";
  return v.toLocaleString("en-US");
}
