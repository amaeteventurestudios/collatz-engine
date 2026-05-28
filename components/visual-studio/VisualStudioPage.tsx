"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Radio, ShieldCheck } from "lucide-react";
import { ConvergenceTreeControls } from "./ConvergenceTreeControls";
import { ConvergenceTreePanel } from "./ConvergenceTreePanel";
import { LegendPanel } from "./LegendPanel";
import { RangeControls } from "./RangeControls";
import { SceneHUD } from "./SceneHUD";
import { SceneTooltip } from "./SceneTooltip";
import { SelectedPathPanel } from "./SelectedPathPanel";
import { ThreeSceneShell } from "./ThreeSceneShell";
import { VisualStudioTabs } from "./VisualStudioTabs";
import { useVisualStudioData } from "./useVisualStudioData";
import { ComingSoonMode } from "./modes/ComingSoonMode";
import {
  ConvergenceTree3D,
  type ConvergenceTreeVisualLayers,
} from "./modes/ConvergenceTree3D";
import { LiveSequenceStack3D } from "./modes/LiveSequenceStack3D";
import {
  buildConvergenceGraph,
  type ConvergenceGraph,
  type ConvergenceNode,
} from "./convergenceTreeGeometry";
import type {
  CameraCommand,
  ConvergenceLayoutMode,
  ScaleMode,
  VisualStudioDataSource,
  VisualStudioEngineSnapshot,
  VisualStudioTabId,
  VisualTrajectory,
} from "./visualStudioTypes";

const DEFAULT_VISIBLE_PATHS = 100;
const DEFAULT_TREE_PATHS = 50;
const MOBILE_PATH_CAP = 250;

export function VisualStudioPage() {
  const [activeTab, setActiveTab] =
    useState<VisualStudioTabId>("live-sequence-stack");
  const [visiblePathCount, setVisiblePathCount] = useState(DEFAULT_VISIBLE_PATHS);
  const [treePathCount, setTreePathCount] = useState(DEFAULT_TREE_PATHS);
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [scaleMode, setScaleMode] = useState<ScaleMode>("log");
  const [treeLayoutMode, setTreeLayoutMode] =
    useState<ConvergenceLayoutMode>("radial");
  const [highlightRecords, setHighlightRecords] = useState(true);
  const [showLatestPath, setShowLatestPath] = useState(true);
  const [showMergeDensity, setShowMergeDensity] = useState(true);
  const [showOlderBranches, setShowOlderBranches] = useState(true);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredPath, setHoveredPath] = useState<VisualTrajectory | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ConvergenceNode | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand | null>(null);

  const isConvergenceTree = activeTab === "convergence-tree";
  const requestedPathCount = isConvergenceTree ? treePathCount : visiblePathCount;
  const effectiveVisiblePathCount = useEffectivePathCount(requestedPathCount);
  const data = useVisualStudioData({
    visiblePathCount: effectiveVisiblePathCount,
    liveUpdates,
    includeFullValues: isConvergenceTree,
  });

  const visibleTrajectories = useMemo(
    () => data.trajectories.slice(0, effectiveVisiblePathCount),
    [data.trajectories, effectiveVisiblePathCount],
  );

  const selectedTrajectory = useMemo(() => {
    return (
      visibleTrajectories.find((trajectory) => trajectory.id === selectedPathId) ??
      visibleTrajectories[0] ??
      null
    );
  }, [selectedPathId, visibleTrajectories]);

  const treeFullValuesReady =
    !isConvergenceTree ||
    visibleTrajectories.length === 0 ||
    visibleTrajectories.every((trajectory) => (trajectory.fullValues?.length ?? 0) > 0);

  const convergenceBuild = useMemo<{
    graph: ConvergenceGraph | null;
    error: string | null;
  }>(() => {
    if (!isConvergenceTree || visibleTrajectories.length === 0 || !treeFullValuesReady) {
      return { graph: null, error: null };
    }

    try {
      return {
        graph: buildConvergenceGraph({
          trajectories: visibleTrajectories,
          selectedPathId: selectedTrajectory?.id ?? null,
          highlightRecords,
          layoutMode: treeLayoutMode,
        }),
        error: null,
      };
    } catch {
      return {
        graph: null,
        error: "Unable to build convergence graph from the available trajectory data.",
      };
    }
  }, [
    highlightRecords,
    isConvergenceTree,
    selectedTrajectory?.id,
    treeLayoutMode,
    treeFullValuesReady,
    visibleTrajectories,
  ]);
  const convergenceGraph = convergenceBuild.graph;

  const selectedNode = useMemo(() => {
    if (!convergenceGraph || !selectedNodeId) return null;
    return convergenceGraph.nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [convergenceGraph, selectedNodeId]);

  const performanceCapNote =
    effectiveVisiblePathCount < requestedPathCount
      ? `Mobile rendering is capped at ${effectiveVisiblePathCount.toLocaleString("en-US")} paths for responsiveness.`
      : null;

  const hasRenderableData = visibleTrajectories.length > 0;
  const treeSceneLoading =
    isConvergenceTree && hasRenderableData && !treeFullValuesReady && !data.error;
  const treeSceneError = data.error ?? convergenceBuild.error;
  const treeVisualLayers = useMemo<ConvergenceTreeVisualLayers>(
    () => ({
      latest: showLatestPath,
      density: showMergeDensity,
      older: showOlderBranches,
    }),
    [showLatestPath, showMergeDensity, showOlderBranches],
  );
  const showRecordLegend =
    data.hasRecordData &&
    highlightRecords &&
    visibleTrajectories.some((trajectory) => trajectory.isRecord);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#02040a] text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_4%,rgba(34,211,238,0.18),transparent_24%),radial-gradient(circle_at_86%_12%,rgba(124,58,237,0.14),transparent_27%),linear-gradient(180deg,#02040a_0%,#020617_48%,#02040a_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12] [mask-image:linear-gradient(to_bottom,black,transparent_76%)] bg-[linear-gradient(rgba(125,211,252,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.16)_1px,transparent_1px)] [background-size:48px_48px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(56,189,248,0.8)_1px,transparent_1px)] [background-size:44px_44px]"
      />

      <div className="relative mx-auto flex w-full max-w-[1680px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <OrbitLogo />
            <div>
              <p className="font-mono text-2xl font-semibold uppercase tracking-[0.22em] text-slate-50 sm:text-3xl">
                Collatz Visual Studio
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
                Interactive 3D views of computed Collatz trajectory behavior from
                the public engine.
              </p>
            </div>
          </div>

          <EngineStatusCard
            engine={data.engine}
            dataSource={data.dataSource}
            loading={data.loading}
          />
        </header>

        <VisualStudioTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "live-sequence-stack" ? (
          <>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,4fr)_minmax(280px,1fr)]">
              <ThreeSceneShell
                title="Live Sequence Stack 3D"
                subtitle="Every analyzed number leaves a trace."
                loading={data.loading}
                empty={!data.loading && !data.error && !hasRenderableData}
                error={data.error}
                onRetry={data.retry}
                resetSignal={resetSignal}
                cameraCommand={cameraCommand}
                onCameraCommand={setCameraCommand}
                hud={
                  <SceneHUD
                    trajectoryCount={visibleTrajectories.length}
                    scaleMode={scaleMode}
                    selectedTrajectory={selectedTrajectory}
                  />
                }
                legend={<LegendPanel showRecord={showRecordLegend} />}
                tooltip={<SceneTooltip trajectory={hoveredPath} />}
              >
                {hasRenderableData && (
                  <LiveSequenceStack3D
                    trajectories={visibleTrajectories}
                    selectedPathId={selectedTrajectory?.id ?? null}
                    scaleMode={scaleMode}
                    highlightRecords={highlightRecords}
                    onSelectPath={setSelectedPathId}
                    onHoverPath={setHoveredPath}
                  />
                )}
              </ThreeSceneShell>

              <SelectedPathPanel trajectory={selectedTrajectory} />
            </div>

            <RangeControls
              visiblePathCount={visiblePathCount}
              renderedPathCount={visibleTrajectories.length}
              requestedPathCount={visiblePathCount}
              liveUpdates={liveUpdates}
              scaleMode={scaleMode}
              hasRecordData={data.hasRecordData}
              highlightRecords={highlightRecords}
              performanceCapNote={performanceCapNote}
              onVisiblePathCountChange={setVisiblePathCount}
              onLiveUpdatesChange={setLiveUpdates}
              onScaleModeChange={setScaleMode}
              onHighlightRecordsChange={setHighlightRecords}
              onResetCamera={() => {
                setResetSignal((value) => value + 1);
                setCameraCommand({ action: "reset", key: Date.now() });
              }}
            />
          </>
        ) : activeTab === "convergence-tree" ? (
          <>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,4fr)_minmax(280px,1fr)]">
              <ThreeSceneShell
                title="Convergence Tree 3D"
                subtitle="Computed paths merge into shared downstream structure."
                loading={data.loading || treeSceneLoading}
                empty={!data.loading && !data.error && !hasRenderableData}
                error={treeSceneError}
                errorTitle={
                  convergenceBuild.error
                    ? "Unable to build convergence graph from the available trajectory data."
                    : undefined
                }
                onRetry={data.retry}
                resetSignal={resetSignal}
                cameraCommand={cameraCommand}
                onCameraCommand={setCameraCommand}
                hud={
                  convergenceGraph ? (
                    <TreeSceneHUD
                      trajectories={convergenceGraph.trajectoriesIncluded}
                      nodes={convergenceGraph.nodes.length}
                      edges={convergenceGraph.edges.length}
                      capped={convergenceGraph.capped}
                      latestStartingNumber={convergenceGraph.latestStartingNumber}
                    />
                  ) : null
                }
                legend={<TreeLegend showRecord={showRecordLegend} />}
                tooltip={<ConvergenceNodeTooltip node={hoveredNode} hasRecordData={data.hasRecordData} />}
              >
                {hasRenderableData && convergenceGraph && (
                  <ConvergenceTree3D
                    graph={convergenceGraph}
                    selectedNodeId={selectedNodeId}
                    visualLayers={treeVisualLayers}
                    onSelectNode={setSelectedNodeId}
                    onHoverNode={setHoveredNode}
                  />
                )}
              </ThreeSceneShell>

              <ConvergenceTreePanel
                graph={convergenceGraph}
                selectedNode={selectedNode}
                hasRecordData={data.hasRecordData}
              />
            </div>

            <ConvergenceTreeControls
              treePathCount={treePathCount}
              renderedPathCount={visibleTrajectories.length}
              requestedPathCount={treePathCount}
              liveUpdates={liveUpdates}
              layoutMode={treeLayoutMode}
              hasRecordData={data.hasRecordData}
              highlightRecords={highlightRecords}
              showLatestPath={showLatestPath}
              showMergeDensity={showMergeDensity}
              showOlderBranches={showOlderBranches}
              capped={Boolean(convergenceGraph?.capped)}
              performanceCapNote={performanceCapNote}
              onTreePathCountChange={setTreePathCount}
              onLiveUpdatesChange={setLiveUpdates}
              onLayoutModeChange={setTreeLayoutMode}
              onHighlightRecordsChange={setHighlightRecords}
              onShowLatestPathChange={setShowLatestPath}
              onShowMergeDensityChange={setShowMergeDensity}
              onShowOlderBranchesChange={setShowOlderBranches}
              onResetCamera={() => {
                setResetSignal((value) => value + 1);
                setCameraCommand({ action: "reset", key: Date.now() });
              }}
            />
          </>
        ) : (
          <ComingSoonMode tabId={activeTab} />
        )}

        <footer className="flex flex-col gap-3 rounded-lg border border-slate-700/70 bg-slate-950/72 px-5 py-4 text-xs text-slate-400 shadow-2xl shadow-cyan-950/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            <p>
              The Collatz Conjecture remains unsolved. This studio visualizes
              computed trajectory behavior from the engine; it is not a proof.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
          >
            Return to engine dashboard
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </footer>
      </div>
    </main>
  );
}

function useEffectivePathCount(requested: number): number {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isCompact ? Math.min(requested, MOBILE_PATH_CAP) : requested;
}

function TreeSceneHUD({
  trajectories,
  nodes,
  edges,
  capped,
  latestStartingNumber,
}: {
  trajectories: number;
  nodes: number;
  edges: number;
  capped: boolean;
  latestStartingNumber: number | null;
}) {
  return (
    <>
      <div className="absolute left-4 top-4 z-20 rounded-lg border border-cyan-300/15 bg-slate-950/72 p-3 shadow-2xl shadow-black/30 backdrop-blur">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">
          Computed Convergence Structure
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs tabular-nums text-slate-300">
          <span>{trajectories.toLocaleString("en-US")} paths</span>
          <span>{nodes.toLocaleString("en-US")} nodes</span>
          <span>{edges.toLocaleString("en-US")} edges</span>
        </div>
        {capped && (
          <p className="mt-2 text-[11px] text-amber-300/80">
            Tree simplified for readability.
          </p>
        )}
      </div>
      {latestStartingNumber && (
        <div className="absolute right-4 top-20 z-20 hidden w-36 rounded-lg border border-slate-700/80 bg-slate-950/72 p-3 shadow-2xl shadow-black/30 backdrop-blur sm:block">
          <div className="h-px w-12 bg-amber-300" />
          <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
            Latest Path
          </p>
          <p className="mt-2 text-[11px] text-slate-500">Starting number</p>
          <p className="font-mono text-sm font-bold text-amber-300">
            {latestStartingNumber.toLocaleString("en-US")}
          </p>
        </div>
      )}
    </>
  );
}

function TreeLegend({ showRecord }: { showRecord: boolean }) {
  const items = [
    { label: "Root 1", color: "bg-slate-50" },
    { label: "Latest path", color: "bg-amber-300" },
    { label: "Merge density", color: "bg-cyan-300" },
    { label: "Older branches", color: "bg-violet-400" },
    ...(showRecord ? [{ label: "Record path", color: "bg-orange-400" }] : []),
  ];

  return (
    <div className="absolute bottom-4 left-4 z-20 rounded-lg border border-slate-700/70 bg-slate-950/72 p-3 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-400">
        {items.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${item.color}`} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ConvergenceNodeTooltip({
  node,
  hasRecordData,
}: {
  node: ConvergenceNode | null;
  hasRecordData: boolean;
}) {
  if (!node) return null;

  return (
    <div className="pointer-events-none absolute right-4 top-20 z-20 w-64 rounded-lg border border-cyan-300/20 bg-slate-950/82 p-3 text-xs shadow-2xl shadow-black/40 backdrop-blur">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">
        Node Hover
      </p>
      <div className="mt-2 space-y-1.5 text-slate-400">
        <TooltipMetric label="Value" value={node.valueLabel} valueClassName="text-slate-100" />
        <TooltipMetric label="Depth" value={node.approxDepth.toLocaleString("en-US")} />
        <TooltipMetric label="Visit count" value={node.visitCount.toLocaleString("en-US")} />
        <TooltipMetric
          label="Upstream paths"
          value={node.upstreamPathCount.toLocaleString("en-US")}
        />
        <TooltipMetric label="Children" value={node.childrenCount.toLocaleString("en-US")} />
        <TooltipMetric label="Type" value={node.nodeType} />
        <TooltipMetric label="Latest path" value={node.isLatest ? "Included" : "No"} />
        {hasRecordData && (
          <TooltipMetric label="Record" value={node.isRecord ? "Included" : "Not indicated"} />
        )}
      </div>
    </div>
  );
}

function TooltipMetric({
  label,
  value,
  valueClassName = "text-cyan-200",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className={`font-mono font-semibold tabular-nums ${valueClassName}`}>
        {value}
      </span>
    </div>
  );
}

function OrbitLogo() {
  const dots = Array.from({ length: 18 }, (_, index) => {
    const angle = (index / 18) * Math.PI * 2;
    const radius = index % 3 === 0 ? 21 : index % 3 === 1 ? 15 : 9;
    return {
      left: Number((24 + Math.cos(angle) * radius).toFixed(5)),
      top: Number((24 + Math.sin(angle) * radius).toFixed(5)),
      size: index % 4 === 0 ? 3 : 2,
    };
  });

  return (
    <div className="relative h-12 w-12 shrink-0">
      <div className="absolute inset-0 rounded-full border border-cyan-300/25" />
      <div className="absolute inset-2 rounded-full border border-violet-300/15" />
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.9)]" />
      {dots.map((dot, index) => (
        <span
          key={index}
          className="absolute rounded-full bg-slate-100 shadow-[0_0_10px_rgba(125,211,252,0.8)]"
          style={{
            height: `${dot.size}px`,
            width: `${dot.size}px`,
            left: `${dot.left}px`,
            top: `${dot.top}px`,
          }}
        />
      ))}
    </div>
  );
}

function EngineStatusCard({
  engine,
  dataSource,
  loading,
}: {
  engine: VisualStudioEngineSnapshot | null;
  dataSource: VisualStudioDataSource;
  loading: boolean;
}) {
  const label = engine
    ? engine.statusLabel
    : dataSource === "unconfigured"
      ? "DATA NOT CONFIGURED"
      : dataSource === "error"
        ? "DATA UNAVAILABLE"
        : "DATA SYNC ACTIVE";
  const range = engine?.rangeLabel ?? "Range unavailable";
  const lastSync = engine?.lastSyncLabel ?? (loading ? "Loading" : "Pending");
  const dotClass = engine?.isLive
    ? "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]"
    : dataSource === "error"
      ? "bg-red-300"
      : "bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.7)]";

  return (
    <section className="w-full rounded-lg border border-slate-700/70 bg-slate-950/72 px-5 py-4 shadow-2xl shadow-cyan-950/10 backdrop-blur lg:w-[260px]">
      <div className="flex items-center gap-2">
        <Radio
          className={engine?.isLive ? "h-4 w-4 text-emerald-300" : "h-4 w-4 text-cyan-300"}
          aria-hidden
        />
        <p
          className={`font-mono text-sm font-bold uppercase tracking-[0.12em] ${
            engine?.isLive ? "text-emerald-300" : "text-cyan-300"
          }`}
        >
          {label}
        </p>
        <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
      </div>
      <div className="mt-2 space-y-1 text-xs text-slate-400">
        <p>Last sync: {lastSync}</p>
        <p>Range: {range}</p>
      </div>
    </section>
  );
}
