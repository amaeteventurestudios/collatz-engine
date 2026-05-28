"use client";

import { Vector3 } from "three";
import { formatLargeNumber } from "@/lib/collatz/format";
import { log10BigInt } from "./collatzGeometry";
import type {
  ConvergenceLayoutMode,
  VisualPathTone,
  VisualTrajectory,
} from "./visualStudioTypes";

export interface ConvergenceNode {
  id: string;
  valueLabel: string;
  position: Vector3;
  visitCount: number;
  incomingCount: number;
  outgoingLabel: string;
  approxDepth: number;
  isRoot: boolean;
  isLatest: boolean;
  isSelected: boolean;
  isRecord: boolean;
  tone: VisualPathTone;
}

export interface ConvergenceEdge {
  id: string;
  fromId: string;
  toId: string;
  points: [Vector3, Vector3];
  traversalCount: number;
  isLatest: boolean;
  isSelected: boolean;
  isRecord: boolean;
  tone: VisualPathTone;
}

export interface ConvergenceGraph {
  nodes: ConvergenceNode[];
  edges: ConvergenceEdge[];
  trajectoriesIncluded: number;
  latestStartingNumber: number | null;
  rootNode: ConvergenceNode | null;
  mostVisitedNode: ConvergenceNode | null;
  capped: boolean;
  totalNodeCount: number;
  totalEdgeCount: number;
  maxVisitCount: number;
}

interface NodeDraft {
  value: bigint;
  visitCount: number;
  incomingCount: number;
  outgoingValue: bigint | null;
  approxDepth: number;
  firstSeenOrder: number;
  isLatest: boolean;
  isSelected: boolean;
  isRecord: boolean;
}

interface EdgeDraft {
  from: string;
  to: string;
  traversalCount: number;
  firstSeenOrder: number;
  isLatest: boolean;
  isSelected: boolean;
  isRecord: boolean;
}

const MAX_RENDERED_NODES = 2_000;
const MAX_RENDERED_EDGES = 3_000;

export function buildConvergenceGraph({
  trajectories,
  selectedPathId,
  highlightRecords,
  layoutMode,
}: {
  trajectories: VisualTrajectory[];
  selectedPathId: string | null;
  highlightRecords: boolean;
  layoutMode: ConvergenceLayoutMode;
}): ConvergenceGraph {
  const nodeDrafts = new Map<string, NodeDraft>();
  const edgeDrafts = new Map<string, EdgeDraft>();
  let seenOrder = 0;

  trajectories.forEach((trajectory, trajectoryIndex) => {
    const sequence = sequenceForTrajectory(trajectory);
    const isLatest = trajectoryIndex === 0;
    const isSelected = trajectory.id === selectedPathId;
    const isRecord = highlightRecords && trajectory.isRecord;

    sequence.forEach((value, sequenceIndex) => {
      const id = value.toString();
      const nextValue = sequence[sequenceIndex + 1] ?? null;
      const draft =
        nodeDrafts.get(id) ??
        ({
          value,
          visitCount: 0,
          incomingCount: 0,
          outgoingValue: nextValue,
          approxDepth: Math.max(0, sequence.length - sequenceIndex - 1),
          firstSeenOrder: seenOrder++,
          isLatest: false,
          isSelected: false,
          isRecord: false,
        } satisfies NodeDraft);

      draft.visitCount += 1;
      draft.outgoingValue = draft.outgoingValue ?? nextValue;
      draft.approxDepth = Math.min(
        draft.approxDepth,
        Math.max(0, sequence.length - sequenceIndex - 1),
      );
      draft.isLatest ||= isLatest;
      draft.isSelected ||= isSelected;
      draft.isRecord ||= isRecord;
      nodeDrafts.set(id, draft);

      if (nextValue == null) return;

      const nextId = nextValue.toString();
      const edgeId = `${id}->${nextId}`;
      const edge =
        edgeDrafts.get(edgeId) ??
        ({
          from: id,
          to: nextId,
          traversalCount: 0,
          firstSeenOrder: seenOrder++,
          isLatest: false,
          isSelected: false,
          isRecord: false,
        } satisfies EdgeDraft);

      edge.traversalCount += 1;
      edge.isLatest ||= isLatest;
      edge.isSelected ||= isSelected;
      edge.isRecord ||= isRecord;
      edgeDrafts.set(edgeId, edge);
    });
  });

  edgeDrafts.forEach((edge) => {
    const target = nodeDrafts.get(edge.to);
    if (target) target.incomingCount += edge.traversalCount;
  });

  const allNodeIds = Array.from(nodeDrafts.keys());
  const selectedNodeIds = capNodeIds(allNodeIds, nodeDrafts);
  const selectedNodeIdSet = new Set(selectedNodeIds);
  const maxLogValue = Math.max(
    1,
    ...selectedNodeIds.map((id) => log10BigInt((nodeDrafts.get(id)?.value ?? 1n) + 1n)),
  );
  const maxDepth = Math.max(
    1,
    ...selectedNodeIds.map((id) => nodeDrafts.get(id)?.approxDepth ?? 0),
  );
  const maxVisitCount = Math.max(
    1,
    ...selectedNodeIds.map((id) => nodeDrafts.get(id)?.visitCount ?? 1),
  );

  const nodes = selectedNodeIds.map((id) => {
    const draft = nodeDrafts.get(id);
    if (!draft) throw new Error("Missing convergence node draft.");
    return nodeFromDraft(draft, maxLogValue, maxDepth, maxVisitCount, layoutMode);
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const selectedEdges = Array.from(edgeDrafts.entries())
    .filter(([, edge]) => selectedNodeIdSet.has(edge.from) && selectedNodeIdSet.has(edge.to))
    .sort((left, right) => scoreEdge(right[1]) - scoreEdge(left[1]))
    .slice(0, MAX_RENDERED_EDGES);

  const edges = selectedEdges.flatMap(([id, edge]) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) return [];
    return [
      {
        id,
        fromId: edge.from,
        toId: edge.to,
        points: [from.position, to.position] as [Vector3, Vector3],
        traversalCount: edge.traversalCount,
        isLatest: edge.isLatest,
        isSelected: edge.isSelected,
        isRecord: edge.isRecord,
        tone: toneForGraphItem(edge),
      },
    ];
  });

  const mostVisitedNode =
    nodes.reduce<ConvergenceNode | null>((best, node) => {
      if (!best || node.visitCount > best.visitCount) return node;
      return best;
    }, null) ?? null;

  return {
    nodes,
    edges,
    trajectoriesIncluded: trajectories.length,
    latestStartingNumber: trajectories[0]?.start ?? null,
    rootNode: nodeById.get("1") ?? null,
    mostVisitedNode,
    capped:
      allNodeIds.length > MAX_RENDERED_NODES ||
      edgeDrafts.size > MAX_RENDERED_EDGES ||
      edges.length < edgeDrafts.size,
    totalNodeCount: allNodeIds.length,
    totalEdgeCount: edgeDrafts.size,
    maxVisitCount,
  };
}

function sequenceForTrajectory(trajectory: VisualTrajectory): bigint[] {
  if (trajectory.fullValues && trajectory.fullValues.length > 0) {
    return trajectory.fullValues;
  }

  return trajectory.values.map((point) => point.value);
}

function capNodeIds(ids: string[], drafts: Map<string, NodeDraft>): string[] {
  return ids
    .sort((left, right) => {
      const leftDraft = drafts.get(left);
      const rightDraft = drafts.get(right);
      if (!leftDraft || !rightDraft) return 0;
      return scoreNode(rightDraft) - scoreNode(leftDraft);
    })
    .slice(0, MAX_RENDERED_NODES);
}

function nodeFromDraft(
  draft: NodeDraft,
  maxLogValue: number,
  maxDepth: number,
  maxVisitCount: number,
  layoutMode: ConvergenceLayoutMode,
): ConvergenceNode {
  const id = draft.value.toString();
  const isRoot = draft.value === 1n;
  const depthRatio = draft.approxDepth / Math.max(maxDepth, 1);
  const logRatio = log10BigInt(draft.value + 1n) / Math.max(maxLogValue, 1);
  const densityRatio = Math.log1p(draft.visitCount) / Math.log1p(maxVisitCount);
  const angle = stableAngle(id);
  const baseRadius = Math.sqrt(Math.max(0.02, depthRatio)) * 17;
  const densityPull = layoutMode === "density" ? 1 - densityRatio * 0.5 : 1;
  const peakLift = layoutMode === "peaks" ? logRatio * 15 : logRatio * 9;
  const densityLift = layoutMode === "density" ? densityRatio * 5 : 0;
  const branchRadius = isRoot ? 0 : baseRadius * densityPull + logRatio * 3.5;

  return {
    id,
    valueLabel: formatLargeNumber(draft.value),
    position: new Vector3(
      Math.cos(angle) * branchRadius,
      isRoot ? 0 : peakLift + densityLift,
      isRoot ? 0 : depthRatio * 24 + Math.sin(angle) * branchRadius * 0.42,
    ),
    visitCount: draft.visitCount,
    incomingCount: draft.incomingCount,
    outgoingLabel: draft.outgoingValue ? formatLargeNumber(draft.outgoingValue) : "None",
    approxDepth: draft.approxDepth,
    isRoot,
    isLatest: draft.isLatest,
    isSelected: draft.isSelected,
    isRecord: draft.isRecord,
    tone: toneForGraphItem(draft),
  };
}

function scoreNode(draft: NodeDraft): number {
  if (draft.value === 1n) return Number.MAX_SAFE_INTEGER;
  return (
    draft.visitCount * 120 +
    draft.incomingCount * 35 +
    (draft.isLatest ? 20_000 : 0) +
    (draft.isSelected ? 24_000 : 0) +
    (draft.isRecord ? 18_000 : 0) -
    draft.firstSeenOrder * 0.02
  );
}

function scoreEdge(edge: EdgeDraft): number {
  return (
    edge.traversalCount * 160 +
    (edge.isLatest ? 20_000 : 0) +
    (edge.isSelected ? 24_000 : 0) +
    (edge.isRecord ? 18_000 : 0) -
    edge.firstSeenOrder * 0.02
  );
}

function toneForGraphItem(item: {
  isLatest: boolean;
  isSelected: boolean;
  isRecord: boolean;
  visitCount?: number;
  traversalCount?: number;
}): VisualPathTone {
  if (item.isSelected || item.isLatest) return "latest";
  if (item.isRecord) return "record";
  if ((item.visitCount ?? item.traversalCount ?? 0) > 1) return "recent";
  return "older";
}

function stableAngle(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) / 4294967295) * Math.PI * 2;
}
