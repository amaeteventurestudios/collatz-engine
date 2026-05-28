import type { VisualTrajectory } from "./visualStudioTypes";

interface SceneTooltipProps {
  trajectory: VisualTrajectory | null;
}

export function SceneTooltip({ trajectory }: SceneTooltipProps) {
  if (!trajectory) return null;

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 max-w-xs rounded-md border border-cyan-300/20 bg-slate-950/82 px-3 py-2 shadow-2xl shadow-black/50 backdrop-blur">
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-300">
        Hovered trajectory
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-100">
        n = {trajectory.startLabel}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        {trajectory.steps.toLocaleString("en-US")} steps, peak {trajectory.peakLabel}
      </p>
    </div>
  );
}
