import { Activity, Database, SlidersHorizontal } from "lucide-react";
import type { ComponentType } from "react";
import type { ScaleMode, VisualTrajectory } from "./visualStudioTypes";

interface SceneHUDProps {
  trajectoryCount: number;
  scaleMode: ScaleMode;
  selectedTrajectory: VisualTrajectory | null;
}

export function SceneHUD({
  trajectoryCount,
  scaleMode,
  selectedTrajectory,
}: SceneHUDProps) {
  return (
    <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
      <HudPill Icon={Activity} label="Live Sequence Stack 3D" />
      <HudPill
        Icon={Database}
        label={`${trajectoryCount.toLocaleString("en-US")} paths`}
      />
      <HudPill
        Icon={SlidersHorizontal}
        label={scaleMode === "log" ? "Log scale" : "Linear scale"}
      />
      {selectedTrajectory && (
        <HudPill label={`Selected n=${selectedTrajectory.startLabel}`} />
      )}
    </div>
  );
}

function HudPill({
  Icon,
  label,
}: {
  Icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded border border-cyan-300/15 bg-slate-950/72 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300 shadow-lg shadow-black/30 backdrop-blur">
      {Icon && <Icon className="h-3.5 w-3.5 text-cyan-300" aria-hidden />}
      {label}
    </span>
  );
}
