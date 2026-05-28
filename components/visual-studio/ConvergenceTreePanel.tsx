import {
  Activity,
  Award,
  Binary,
  GitMerge,
  Hash,
  Network,
  RadioTower,
} from "lucide-react";
import type { ComponentType } from "react";
import type {
  ConvergenceGraph,
  ConvergenceNode,
} from "./convergenceTreeGeometry";

interface ConvergenceTreePanelProps {
  graph: ConvergenceGraph | null;
  selectedNode: ConvergenceNode | null;
  hasRecordData: boolean;
}

export function ConvergenceTreePanel({
  graph,
  selectedNode,
  hasRecordData,
}: ConvergenceTreePanelProps) {
  return (
    <aside className="rounded-lg border border-slate-700/70 bg-slate-950/72 p-5 shadow-2xl shadow-cyan-950/10 ring-1 ring-white/[0.025] backdrop-blur">
      <div className="mb-5 flex items-center gap-3">
        <Network className="h-5 w-5 text-cyan-300" aria-hidden />
        <div>
          <h2 className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-slate-100">
            {selectedNode ? "Selected Node" : "Convergence Structure"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {selectedNode
              ? "Telemetry for a value inside the bounded transition graph."
              : "Computed merge structure from recent analyzed trajectories."}
          </p>
        </div>
      </div>

      {!graph ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-500">
          Waiting for analyzed trajectory data from the engine.
        </div>
      ) : selectedNode ? (
        <div className="divide-y divide-slate-800/80">
          <TelemetryRow
            Icon={Hash}
            label="Node Value"
            value={selectedNode.valueLabel}
            valueClassName={selectedNode.isRoot ? "text-cyan-200" : "text-amber-300"}
          />
          <TelemetryRow
            Icon={GitMerge}
            label="Visit Count"
            value={selectedNode.visitCount.toLocaleString("en-US")}
            valueClassName="text-cyan-300"
          />
          <TelemetryRow
            Icon={RadioTower}
            label="Incoming Paths"
            value={selectedNode.incomingCount.toLocaleString("en-US")}
            valueClassName="text-violet-300"
          />
          <TelemetryRow
            Icon={Binary}
            label="Outgoing Transition"
            value={selectedNode.outgoingLabel}
          />
          <TelemetryRow
            Icon={Activity}
            label="Approximate Depth"
            value={selectedNode.approxDepth.toLocaleString("en-US")}
          />
          <TelemetryRow
            Icon={Activity}
            label="Latest Path Involvement"
            value={selectedNode.isLatest ? "Included" : "Not in latest path"}
            valueClassName={selectedNode.isLatest ? "text-amber-300" : "text-slate-300"}
          />
          {hasRecordData && (
            <TelemetryRow
              Icon={Award}
              label="Record Involvement"
              value={selectedNode.isRecord ? "Included in record path" : "Not indicated"}
              valueClassName={selectedNode.isRecord ? "text-orange-300" : "text-slate-300"}
            />
          )}
          <TelemetryRow
            Icon={Network}
            label="Rendered Graph"
            value={`${graph.nodes.length.toLocaleString("en-US")} nodes / ${graph.edges.length.toLocaleString("en-US")} edges`}
          />
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80">
          <TelemetryRow
            Icon={Activity}
            label="Trajectories Included"
            value={graph.trajectoriesIncluded.toLocaleString("en-US")}
            valueClassName="text-cyan-300"
          />
          <TelemetryRow
            Icon={Network}
            label="Rendered Nodes"
            value={graph.nodes.length.toLocaleString("en-US")}
            valueClassName="text-violet-300"
          />
          <TelemetryRow
            Icon={GitMerge}
            label="Rendered Edges"
            value={graph.edges.length.toLocaleString("en-US")}
            valueClassName="text-blue-300"
          />
          <TelemetryRow Icon={Hash} label="Root Value" value="1" valueClassName="text-cyan-200" />
          <TelemetryRow
            Icon={RadioTower}
            label="Most Visited Node"
            value={
              graph.mostVisitedNode
                ? `${graph.mostVisitedNode.valueLabel} (${graph.mostVisitedNode.visitCount.toLocaleString("en-US")} visits)`
                : "Not available"
            }
          />
          <TelemetryRow
            Icon={Binary}
            label="Latest Starting Number"
            value={
              graph.latestStartingNumber
                ? graph.latestStartingNumber.toLocaleString("en-US")
                : "Not available"
            }
            valueClassName="text-amber-300"
          />
          {graph.capped && (
            <div className="pt-4 text-xs leading-relaxed text-amber-300/80">
              Graph capped for performance.
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
