import {
  Activity,
  Award,
  Calendar,
  GitBranch,
  Hash,
  Timer,
  TrendingUp,
} from "lucide-react";
import type { ComponentType } from "react";
import {
  formatNullableMetric,
  formatVisualTimestamp,
} from "./collatzTransforms";
import type { VisualTrajectory } from "./visualStudioTypes";

interface SelectedPathPanelProps {
  trajectory: VisualTrajectory | null;
}

export function SelectedPathPanel({ trajectory }: SelectedPathPanelProps) {
  return (
    <aside className="rounded-lg border border-slate-700/70 bg-slate-950/72 p-5 shadow-2xl shadow-cyan-950/10 ring-1 ring-white/[0.025] backdrop-blur">
      <div className="mb-5 flex items-center gap-3">
        <Activity className="h-5 w-5 text-cyan-300" aria-hidden />
        <div>
          <h2 className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-slate-100">
            {trajectory ? "Selected Path" : "Current Path"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {trajectory
              ? "Telemetry for the selected computed trajectory."
              : "Select a trajectory to inspect its computed behavior."}
          </p>
        </div>
      </div>

      {!trajectory ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-500">
          Waiting for analyzed trajectory data from the engine.
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80">
          <TelemetryRow
            Icon={Hash}
            label="Starting Number"
            value={trajectory.startLabel}
            valueClassName="text-amber-300"
          />
          <TelemetryRow
            Icon={Timer}
            label="Steps to 1"
            value={trajectory.steps.toLocaleString("en-US")}
            valueClassName="text-cyan-300"
          />
          <TelemetryRow
            Icon={TrendingUp}
            label="Peak Value"
            value={trajectory.peakLabel}
            valueClassName="text-violet-300"
          />
          <TelemetryRow
            Icon={GitBranch}
            label="Descent Step"
            value={formatNullableMetric(trajectory.descentStep)}
            valueClassName="text-emerald-300"
          />
          <TelemetryRow
            Icon={Activity}
            label="Odd / Even Steps"
            value={`${trajectory.oddCount.toLocaleString("en-US")} / ${trajectory.evenCount.toLocaleString("en-US")}`}
            valueClassName="text-sky-300"
          />
          <TelemetryRow
            Icon={Calendar}
            label="Checked"
            value={formatVisualTimestamp(trajectory.checkedAt)}
          />
          {trajectory.isRecord && trajectory.recordLabel && (
            <TelemetryRow
              Icon={Award}
              label="Record Status"
              value={trajectory.recordLabel}
              valueClassName="text-orange-300"
            />
          )}
          {trajectory.partial && (
            <div className="pt-4 text-xs leading-relaxed text-slate-500">
              This path is displayed with a safe client-side derivation cap. Stored
              catalog metrics remain authoritative.
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function TelemetryRow({
  Icon,
  label,
  value,
  valueClassName = "text-slate-100",
}: {
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex gap-3 py-4">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-700/70 bg-slate-900/70 text-slate-500">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p
          className={`mt-1 break-words font-mono text-lg font-semibold tabular-nums ${valueClassName}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
