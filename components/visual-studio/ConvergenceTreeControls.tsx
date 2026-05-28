"use client";

import {
  Award,
  Camera,
  Database,
  GitMerge,
  Info,
  Pause,
  Play,
  RotateCcw,
  Rows3,
} from "lucide-react";
import { VisualMetricCard } from "./VisualMetricCard";
import type { ConvergenceLayoutMode } from "./visualStudioTypes";

interface ConvergenceTreeControlsProps {
  treePathCount: number;
  renderedPathCount: number;
  requestedPathCount: number;
  liveUpdates: boolean;
  layoutMode: ConvergenceLayoutMode;
  hasRecordData: boolean;
  highlightRecords: boolean;
  capped: boolean;
  performanceCapNote: string | null;
  onTreePathCountChange: (count: number) => void;
  onLiveUpdatesChange: (live: boolean) => void;
  onLayoutModeChange: (mode: ConvergenceLayoutMode) => void;
  onHighlightRecordsChange: (highlight: boolean) => void;
  onResetCamera: () => void;
}

const treePathOptions = [25, 50, 100, 250];

export function ConvergenceTreeControls({
  treePathCount,
  renderedPathCount,
  requestedPathCount,
  liveUpdates,
  layoutMode,
  hasRecordData,
  highlightRecords,
  capped,
  performanceCapNote,
  onTreePathCountChange,
  onLiveUpdatesChange,
  onLayoutModeChange,
  onHighlightRecordsChange,
  onResetCamera,
}: ConvergenceTreeControlsProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[1.25fr_0.75fr_1fr_0.9fr_0.85fr_1.25fr]">
      <VisualMetricCard title="Tree Size">
        <div className="grid grid-cols-4 gap-2">
          {treePathOptions.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => onTreePathCountChange(count)}
              className={`rounded-md border px-3 py-2 text-sm font-medium tabular-nums transition-colors ${
                treePathCount === count
                  ? "border-blue-400/70 bg-blue-500/15 text-blue-200"
                  : "border-slate-700 bg-slate-950/70 text-slate-400 hover:border-cyan-400/50 hover:text-cyan-200"
              }`}
            >
              {count}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Building from {renderedPathCount.toLocaleString("en-US")} recent trajectories
        </p>
        {(performanceCapNote || capped) && (
          <p className="mt-2 text-[11px] leading-relaxed text-amber-300/80">
            {performanceCapNote ?? "Graph capped for performance."}
          </p>
        )}
      </VisualMetricCard>

      <VisualMetricCard title="Live Updates">
        <span
          className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
            liveUpdates
              ? "bg-emerald-400/15 text-emerald-300"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              liveUpdates ? "bg-emerald-300" : "bg-slate-500"
            }`}
          />
          {liveUpdates ? "Live" : "Paused"}
        </span>
        <button
          type="button"
          onClick={() => onLiveUpdatesChange(!liveUpdates)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-cyan-200"
        >
          {liveUpdates ? (
            <Pause className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Play className="h-3.5 w-3.5" aria-hidden />
          )}
          {liveUpdates ? "Pause Live" : "Resume Live"}
        </button>
      </VisualMetricCard>

      <VisualMetricCard title="Layout">
        <div className="grid gap-2">
          <LayoutButton
            active={layoutMode === "rooted"}
            label="Rooted View"
            onClick={() => onLayoutModeChange("rooted")}
          />
          <LayoutButton
            active={layoutMode === "peaks"}
            label="Elevated Peaks"
            onClick={() => onLayoutModeChange("peaks")}
          />
          <LayoutButton
            active={layoutMode === "density"}
            label="Merge Density"
            onClick={() => onLayoutModeChange("density")}
          />
        </div>
      </VisualMetricCard>

      <VisualMetricCard title="Highlights">
        <div className="space-y-2">
          <span className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-amber-300/50 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-200">
            <Rows3 className="h-3.5 w-3.5" aria-hidden />
            Latest Path
          </span>
          <span className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-200">
            <GitMerge className="h-3.5 w-3.5" aria-hidden />
            Merge Density
          </span>
          <button
            type="button"
            disabled={!hasRecordData}
            onClick={() => onHighlightRecordsChange(!highlightRecords)}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
              hasRecordData
                ? highlightRecords
                  ? "border-orange-300/60 bg-orange-400/15 text-orange-200"
                  : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-orange-300/50 hover:text-orange-200"
                : "cursor-not-allowed border-slate-800 bg-slate-900/40 text-slate-600"
            }`}
          >
            <Award className="h-3.5 w-3.5" aria-hidden />
            Records
          </button>
        </div>
      </VisualMetricCard>

      <VisualMetricCard title="Camera">
        <button
          type="button"
          onClick={onResetCamera}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-blue-400/35 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-200 transition-colors hover:bg-blue-500/20"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Reset Camera
        </button>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Camera className="h-3.5 w-3.5" aria-hidden />
          Orbit, pan, and scroll zoom are enabled.
        </div>
      </VisualMetricCard>

      <VisualMetricCard
        title="About This View"
        action={<Info className="h-4 w-4 text-slate-500" aria-hidden />}
      >
        <p className="text-xs leading-relaxed text-slate-400">
          This view maps computed Collatz transitions as a bounded 3D convergence
          graph. Nodes are values, edges are transitions, and repeated downstream
          paths reveal shared structure.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Database className="h-3 w-3" aria-hidden />
            {requestedPathCount.toLocaleString("en-US")} requested
          </span>
        </div>
      </VisualMetricCard>
    </div>
  );
}

function LayoutButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
        active
          ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
          : "border-slate-700 bg-slate-950/60 text-slate-500 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );
}
