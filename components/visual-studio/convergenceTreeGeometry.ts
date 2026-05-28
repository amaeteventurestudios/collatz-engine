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
  upstreamPathCount: number;
  childrenCount: number;
  outgoingLabel: string;
  approxDepth: number;
  depthRatio: number;
  isRoot: boolean;
  isLatest: boolean;
  isSelected: boolean;
  isRecord: boolean;
  tone: VisualPathTone;
  nodeType: "root" | "merge" | "latest path" | "record" | "branch";
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
  maxDepth: number;
}

interface NodeDraft {
  value: bigint;
  visitCount: number;
  incomingCount: number;
  childrenCount: number;
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

const MAX_RENDERED_NODES = 2_500;
const MAX_RENDERED_EDGES = 4_000;
const SCENE_HEIGHT = 18;
const FAN_WIDTH = 36;
const FAN_DEPTH = 12;

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
  void layoutMode;
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
          childrenCount: 0,
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
    if (target) {
      target.incomingCount += edge.traversalCount;
      target.childrenCount += 1;
    }
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
  const layoutPositions = buildHierarchicalPositions({
    selectedNodeIds,
    nodeDrafts,
    edgeDrafts,
    maxDepth,
    maxLogValue,
    maxVisitCount,
  });

  const nodes = selectedNodeIds.map((id) => {
    const draft = nodeDrafts.get(id);
    if (!draft) throw new Error("Missing convergence node draft.");
    return nodeFromDraft(
      draft,
      layoutPositions.get(id) ?? new Vector3(0, 0, 0),
      maxDepth,
      maxVisitCount,
    );
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
    maxDepth,
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

function buildHierarchicalPositions({
  selectedNodeIds,
  nodeDrafts,
  edgeDrafts,
  maxDepth,
  maxLogValue,
  maxVisitCount,
}: {
  selectedNodeIds: string[];
  nodeDrafts: Map<string, NodeDraft>;
  edgeDrafts: Map<string, EdgeDraft>;
  maxDepth: number;
  maxLogValue: number;
  maxVisitCount: number;
}): Map<string, Vector3> {
  const selectedNodeIdSet = new Set(selectedNodeIds);
  const childIdsByParentId = new Map<string, string[]>();

  edgeDrafts.forEach((edge) => {
    if (!selectedNodeIdSet.has(edge.from) || !selectedNodeIdSet.has(edge.to)) return;
    const children = childIdsByParentId.get(edge.to) ?? [];
    children.push(edge.from);
    childIdsByParentId.set(edge.to, children);
  });

  childIdsByParentId.forEach((children) => {
    children.sort((left, right) => {
      const leftDraft = nodeDrafts.get(left);
      const rightDraft = nodeDrafts.get(right);
      if (!leftDraft || !rightDraft) return left.localeCompare(right);
      const densityDelta = rightDraft.visitCount - leftDraft.visitCount;
      if (densityDelta !== 0) return densityDelta;
      return stableSigned(`${left}:sort`) - stableSigned(`${right}:sort`);
    });
  });

  const depthGroups = new Map<number, string[]>();
  selectedNodeIds.forEach((id) => {
    const draft = nodeDrafts.get(id);
    if (!draft) return;
    const group = depthGroups.get(draft.approxDepth) ?? [];
    group.push(id);
    depthGroups.set(draft.approxDepth, group);
  });

  const positions = new Map<string, Vector3>([["1", new Vector3(0, 0, 0)]]);
  const sortedDepths = Array.from(depthGroups.keys()).sort((left, right) => left - right);

  sortedDepths.forEach((depth) => {
    if (depth === 0) return;
    const group = depthGroups.get(depth) ?? [];
    const depthRatio = depth / Math.max(maxDepth, 1);
    const levelFan = Math.pow(depthRatio, 0.78);

    group.forEach((id) => {
      const draft = nodeDrafts.get(id);
      if (!draft) return;
      const parentId = draft.outgoingValue?.toString() ?? "1";
      const parent = positions.get(parentId) ?? new Vector3(0, 0, 0);
      const siblings = childIdsByParentId.get(parentId) ?? group;
      const siblingIndex = Math.max(0, siblings.indexOf(id));
      const siblingCenter = (siblings.length - 1) / 2;
      const siblingOffset = (siblingIndex - siblingCenter) * Math.min(1.4, 0.34 + depth * 0.03);
      const branchSide = stableSigned(`${id}:x`);
      const densityRatio = Math.log1p(draft.visitCount) / Math.log1p(maxVisitCount);
      const centerPull = 1 - densityRatio * 0.72;
      const globalFan = branchSide * FAN_WIDTH * levelFan * centerPull * 0.5;
      const valueLift = log10BigInt(draft.value + 1n) / Math.max(maxLogValue, 1);
      const inheritedX = parent.x * (0.9 - densityRatio * 0.22);
      const x = clamp(inheritedX + globalFan * 0.42 + siblingOffset, -FAN_WIDTH / 2, FAN_WIDTH / 2);
      const y = Math.max(0.18, depthRatio * SCENE_HEIGHT + valueLift * 2.8);
      const z =
        parent.z * 0.6 +
        stableSigned(`${id}:z`) * FAN_DEPTH * levelFan * (0.24 + centerPull * 0.42) +
        valueLift * 2.2 -
        2.4;

      positions.set(id, new Vector3(x, y, clamp(z, -FAN_DEPTH, FAN_DEPTH)));
    });

    group.forEach((id, index) => {
      if (positions.has(id)) return;
      const rowRatio = group.length > 1 ? index / (group.length - 1) : 0.5;
      positions.set(
        id,
        new Vector3(
          (rowRatio - 0.5) * FAN_WIDTH,
          depthRatio * SCENE_HEIGHT,
          stableSigned(`${id}:fallback`) * FAN_DEPTH * levelFan,
        ),
      );
    });
  });

  return positions;
}

function nodeFromDraft(
  draft: NodeDraft,
  position: Vector3,
  maxDepth: number,
  maxVisitCount: number,
): ConvergenceNode {
  const id = draft.value.toString();
  const isRoot = draft.value === 1n;
  const depthRatio = draft.approxDepth / Math.max(maxDepth, 1);
  const densityRatio = draft.visitCount / Math.max(maxVisitCount, 1);
  const nodeType = nodeTypeFor(draft, isRoot);

  return {
    id,
    valueLabel: formatLargeNumber(draft.value),
    position,
    visitCount: draft.visitCount,
    incomingCount: draft.incomingCount,
    upstreamPathCount: Math.max(draft.visitCount, draft.incomingCount),
    childrenCount: draft.childrenCount,
    outgoingLabel: draft.outgoingValue ? formatLargeNumber(draft.outgoingValue) : "None",
    approxDepth: draft.approxDepth,
    depthRatio,
    isRoot,
    isLatest: draft.isLatest,
    isSelected: draft.isSelected,
    isRecord: draft.isRecord,
    tone: toneForGraphItem({ ...draft, visitCount: densityRatio > 0.28 ? 2 : draft.visitCount }),
    nodeType,
  };
}

function scoreNode(draft: NodeDraft): number {
  if (draft.value === 1n) return Number.MAX_SAFE_INTEGER;
  return (
    draft.visitCount * 120 +
    draft.incomingCount * 35 +
    draft.childrenCount * 30 +
    (draft.isLatest ? 28_000 : 0) +
    (draft.isSelected ? 30_000 : 0) +
    (draft.isRecord ? 22_000 : 0) -
    draft.firstSeenOrder * 0.02
  );
}

function scoreEdge(edge: EdgeDraft): number {
  return (
    edge.traversalCount * 160 +
    (edge.isLatest ? 28_000 : 0) +
    (edge.isSelected ? 30_000 : 0) +
    (edge.isRecord ? 22_000 : 0) -
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

function nodeTypeFor(draft: NodeDraft, isRoot: boolean): ConvergenceNode["nodeType"] {
  if (isRoot) return "root";
  if (draft.isLatest) return "latest path";
  if (draft.isRecord) return "record";
  if (draft.visitCount > 1 || draft.incomingCount > 1 || draft.childrenCount > 1) {
    return "merge";
  }
  return "branch";
}

function stableSigned(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) / 4294967295) * 2 - 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
