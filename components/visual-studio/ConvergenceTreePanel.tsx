import {
  Activity,
  Award,
  GitBranch,
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
          <h2 className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-cyan-100">
            Convergence Structure
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Telemetry for the computed tree.
          </p>
        </div>
      </div>

      {!graph ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-500">
          Waiting for analyzed trajectory data from the engine.
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">
              Tree Summary
            </h3>
            <div className="mt-3 divide-y divide-slate-800/80">
              <TelemetryRow Icon={Hash} label="Root value" value="1" valueClassName="text-cyan-200" />
              <TelemetryRow
                Icon={Activity}
                label="Trajectories included"
                value={graph.trajectoriesIncluded.toLocaleString("en-US")}
                valueClassName="text-cyan-300"
              />
              <TelemetryRow
                Icon={Network}
                label="Rendered nodes"
                value={graph.nodes.length.toLocaleString("en-US")}
                valueClassName="text-violet-300"
              />
              <TelemetryRow
                Icon={GitMerge}
                label="Rendered edges"
                value={graph.edges.length.toLocaleString("en-US")}
                valueClassName="text-blue-300"
              />
              <TelemetryRow
                Icon={RadioTower}
                label="Latest starting number"
                value={
                  graph.latestStartingNumber
                    ? graph.latestStartingNumber.toLocaleString("en-US")
                    : "Not available"
                }
                valueClassName="text-amber-300"
              />
            </div>
          </section>

          <section className="border-t border-slate-800/80 pt-5">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">
              Selected Node
            </h3>
            {!selectedNode ? (
              <p className="mt-3 rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-500">
                Click a node to inspect metrics.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-slate-800/80">
                <TelemetryRow
                  Icon={Hash}
                  label="Value"
                  value={selectedNode.valueLabel}
                  valueClassName={selectedNode.isRoot ? "text-cyan-200" : "text-amber-300"}
                />
                <TelemetryRow
                  Icon={GitBranch}
                  label="Depth (steps to root)"
                  value={selectedNode.approxDepth.toLocaleString("en-US")}
                />
                <TelemetryRow
                  Icon={RadioTower}
                  label="Upstream paths"
                  value={selectedNode.upstreamPathCount.toLocaleString("en-US")}
                  valueClassName="text-cyan-300"
                />
                <TelemetryRow
                  Icon={GitMerge}
                  label="Children"
                  value={selectedNode.childrenCount.toLocaleString("en-US")}
                  valueClassName="text-violet-300"
                />
                <TelemetryRow
                  Icon={Activity}
                  label="Visit count"
                  value={selectedNode.visitCount.toLocaleString("en-US")}
                />
                <TelemetryRow
                  Icon={Network}
                  label="Type"
                  value={selectedNode.nodeType}
                  valueClassName={selectedNode.isLatest ? "text-amber-300" : "text-slate-100"}
                />
                <TelemetryRow
                  Icon={Activity}
                  label="Latest path involvement"
                  value={selectedNode.isLatest ? "Included" : "Not in latest path"}
                  valueClassName={selectedNode.isLatest ? "text-amber-300" : "text-slate-300"}
                />
                {hasRecordData && (
                  <TelemetryRow
                    Icon={Award}
                    label="Record involvement"
                    value={selectedNode.isRecord ? "Included in record path" : "Not indicated"}
                    valueClassName={selectedNode.isRecord ? "text-orange-300" : "text-slate-300"}
                  />
                )}
              </div>
            )}
          </section>

          {graph.capped && (
            <p className="border-t border-slate-800/80 pt-4 text-xs leading-relaxed text-amber-300/80">
              Tree simplified for readability.
            </p>
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
    <div className="flex gap-3 py-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-700/70 bg-slate-900/70 text-slate-500">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p
          className={`mt-1 break-words font-mono text-base font-semibold tabular-nums ${valueClassName}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
