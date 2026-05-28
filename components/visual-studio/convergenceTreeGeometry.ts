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
  points: Vector3[];
  traversalCount: number;
  isLatest: boolean;
  isSelected: boolean;
  isRecord: boolean;
  tone: VisualPathTone;
}

export interface ConvergenceGraph {
  nodes: ConvergenceNode[];
  edges: ConvergenceEdge[];
  branchGuides: ConvergenceBranchGuide[];
  branchDots: ConvergenceBranchDot[];
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

export interface ConvergenceBranchGuide {
  id: string;
  points: Vector3[];
  tone: VisualPathTone;
  isLatest: boolean;
  isRecord: boolean;
  density: number;
}

export interface ConvergenceBranchDot {
  id: string;
  nodeId: string;
  valueLabel: string;
  position: Vector3;
  tone: VisualPathTone;
  isLatest: boolean;
  isRecord: boolean;
  nodeType: ConvergenceNode["nodeType"];
  visitCount: number;
  approxDepth: number;
  upstreamPathCount: number;
  childrenCount: number;
}

interface NodeDraft {
  value: bigint;
  visitCount: number;
  incomingCount: number;
  childrenCount: number;
  laneTotal: number;
  laneWeight: number;
  xTotal: number;
  yTotal: number;
  zTotal: number;
  positionWeight: number;
  outgoingValue: bigint | null;
  approxDepth: number;
  firstSeenOrder: number;
  isLatest: boolean;
  isSelected: boolean;
  isRecord: boolean;
  isBranchSample: boolean;
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

const MAX_RENDERED_NODES = 1_700;
const MAX_RENDERED_EDGES = 2_200;
const SCENE_HEIGHT = 17.6;
const FAN_WIDTH = 35.5;
const FAN_DEPTH = 8.4;

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
    const maxTrajectoryDepth = Math.max(1, sequence.length - 1);
    const lane = laneForTrajectory(trajectoryIndex, trajectories.length);
    const trajectoryCurve = stableSigned(`${trajectory.id}:curve`) * 0.16;
    const isLatest = trajectoryIndex === 0;
    const isSelected = trajectory.id === selectedPathId;
    const isRecord = highlightRecords && trajectory.isRecord;
    const sampleInterval = Math.max(2, Math.floor(sequence.length / 26));

    sequence.forEach((value, sequenceIndex) => {
      const id = value.toString();
      const nextValue = sequence[sequenceIndex + 1] ?? null;
      const depthToRoot = Math.max(0, sequence.length - sequenceIndex - 1);
      const trajectoryDepthRatio = depthToRoot / maxTrajectoryDepth;
      const laneWeight = 0.16 + Math.pow(trajectoryDepthRatio, 1.35) * 1.85;
      const visualPosition = visualPositionForOccurrence({
        depthRatio: trajectoryDepthRatio,
        lane,
        trajectoryCurve,
        isLatest,
        value,
      });
      const draft =
        nodeDrafts.get(id) ??
        ({
          value,
          visitCount: 0,
          incomingCount: 0,
          childrenCount: 0,
          laneTotal: 0,
          laneWeight: 0,
          xTotal: 0,
          yTotal: 0,
          zTotal: 0,
          positionWeight: 0,
          outgoingValue: nextValue,
          approxDepth: depthToRoot,
          firstSeenOrder: seenOrder++,
          isLatest: false,
          isSelected: false,
          isRecord: false,
          isBranchSample: false,
        } satisfies NodeDraft);

      draft.visitCount += 1;
      draft.laneTotal += lane * laneWeight;
      draft.laneWeight += laneWeight;
      draft.xTotal += visualPosition.x * laneWeight;
      draft.yTotal += visualPosition.y * laneWeight;
      draft.zTotal += visualPosition.z * laneWeight;
      draft.positionWeight += laneWeight;
      draft.outgoingValue = draft.outgoingValue ?? nextValue;
      draft.approxDepth = Math.min(
        draft.approxDepth,
        depthToRoot,
      );
      draft.isLatest ||= isLatest;
      draft.isSelected ||= isSelected;
      draft.isRecord ||= isRecord;
      draft.isBranchSample ||=
        isLatest ||
        trajectoryDepthRatio > 0.42 ||
        sequenceIndex % sampleInterval === 0 ||
        sequenceIndex === sequence.length - 1;
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
    maxDepth,
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
  const visualBranches = buildVisualBranches({
    trajectories,
    nodeDrafts,
    nodeById,
    maxVisitCount,
    highlightRecords,
  });

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
        points: curvedEdgePoints(from.position, to.position, edge),
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
    branchGuides: visualBranches.guides,
    branchDots: visualBranches.dots,
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

function laneForTrajectory(index: number, total: number): number {
  if (index === 0) return 0.82;          // latest: right side
  if (total <= 1) return 0;
  const pos = index - 1;                 // 0-indexed among non-latest
  const half = Math.ceil((total - 1) / 2);
  const side = pos % 2 === 0 ? -1 : 1;  // alternate: L, R, L, R...
  const rank = Math.floor(pos / 2);
  const spread = half <= 1 ? 0.18 : 0.18 + (rank / (half - 1)) * 0.82;
  return side * spread;
}

function visualPositionForOccurrence({
  depthRatio,
  lane,
  trajectoryCurve,
  isLatest,
  value,
}: {
  depthRatio: number;
  lane: number;
  trajectoryCurve: number;
  isLatest: boolean;
  value: bigint;
}): Vector3 {
  void log10BigInt; // kept for potential future use
  const growth = Math.pow(depthRatio, 0.74);
  const branchBend = trajectoryCurve * Math.sin(depthRatio * Math.PI * 1.35);
  const latestRight = isLatest ? 0.22 + Math.pow(depthRatio, 0.7) * 0.76 : 0;
  const laneWithLatest = isLatest ? Math.max(lane, latestRight) : lane + branchBend;
  const x = laneWithLatest * FAN_WIDTH * growth * 0.5;
  const y = Math.max(0, Math.pow(depthRatio, 0.78) * SCENE_HEIGHT);
  const z = -2.4 + laneWithLatest * FAN_DEPTH * 0.22 * growth * 0.4 + stableSigned(`${value.toString()}:z`) * 0.25;

  return new Vector3(
    clamp(x, -FAN_WIDTH / 2, FAN_WIDTH / 2),
    y,
    clamp(z, -FAN_DEPTH * 0.55, FAN_DEPTH * 0.45),
  );
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
  maxDepth,
  maxVisitCount,
}: {
  selectedNodeIds: string[];
  nodeDrafts: Map<string, NodeDraft>;
  maxDepth: number;
  maxVisitCount: number;
}): Map<string, Vector3> {
  const positions = new Map<string, Vector3>([["1", new Vector3(0, 0, 0)]]);
  selectedNodeIds.forEach((id) => {
    if (id === "1") return;
    const draft = nodeDrafts.get(id);
    if (!draft) return;
    const depthRatio = draft.approxDepth / Math.max(maxDepth, 1);
    const densityRatio = Math.log1p(draft.visitCount) / Math.log1p(maxVisitCount);
    const centerPull = Math.min(0.96, densityRatio * 1.18);
    const base =
      draft.positionWeight > 0
        ? new Vector3(
            draft.xTotal / draft.positionWeight,
            draft.yTotal / draft.positionWeight,
            draft.zTotal / draft.positionWeight,
          )
        : visualPositionForOccurrence({
            depthRatio,
            lane: stableSigned(`${id}:fallback`),
            trajectoryCurve: 0,
            isLatest: draft.isLatest,
            value: draft.value,
          });
    const trunk = new Vector3(
      stableSigned(`${id}:trunk`) * 0.18 * Math.pow(depthRatio, 0.5),
      Math.pow(depthRatio, 0.82) * SCENE_HEIGHT,
      -2.4 + stableSigned(`${id}:trunkZ`) * 0.28 + Math.sin(depthRatio * Math.PI) * 0.8,
    );
    const latestOuterPull =
      draft.isLatest && draft.visitCount <= 2 ? Math.min(0.72, Math.pow(depthRatio, 0.7)) : 0;
    const latestOuter = new Vector3(
      4.8 + Math.pow(depthRatio, 0.68) * 11.8,
      Math.pow(depthRatio, 0.78) * SCENE_HEIGHT + 1.2,
      -1.8 + Math.pow(depthRatio, 0.8) * 3.8,
    );
    const merged = base.lerp(trunk, centerPull).lerp(latestOuter, latestOuterPull);

    positions.set(
      id,
      new Vector3(
        clamp(merged.x, -FAN_WIDTH / 2, FAN_WIDTH / 2),
        merged.y,
        clamp(merged.z, -FAN_DEPTH, FAN_DEPTH),
      ),
    );
  });

  return positions;
}

function buildVisualBranches({
  trajectories,
  nodeDrafts,
  nodeById,
  maxVisitCount,
  highlightRecords,
}: {
  trajectories: VisualTrajectory[];
  nodeDrafts: Map<string, NodeDraft>;
  nodeById: Map<string, ConvergenceNode>;
  maxVisitCount: number;
  highlightRecords: boolean;
}): { guides: ConvergenceBranchGuide[]; dots: ConvergenceBranchDot[] } {
  const guides: ConvergenceBranchGuide[] = [];
  const dots: ConvergenceBranchDot[] = [];
  const maxDots = 1_400;
  let dotCount = 0;

  trajectories.forEach((trajectory, trajectoryIndex) => {
    const sequence = sequenceForTrajectory(trajectory);
    if (sequence.length < 2) return;

    const isLatest = trajectoryIndex === 0;
    const isRecord = highlightRecords && trajectory.isRecord;
    const lane = laneForTrajectory(trajectoryIndex, trajectories.length);
    const trajectoryCurve = stableSigned(`${trajectory.id}:curve`) * 0.16;
    const maxTrajectoryDepth = Math.max(1, sequence.length - 1);
    const sampleEvery = isLatest
      ? Math.max(1, Math.floor(sequence.length / 56))
      : Math.max(1, Math.floor(sequence.length / 38));
    const points: Vector3[] = [];
    const sampled: {
      nodeId: string;
      value: bigint;
      position: Vector3;
      depth: number;
    }[] = [];

    for (let sequenceIndex = sequence.length - 1; sequenceIndex >= 0; sequenceIndex--) {
      const depthToRoot = Math.max(0, sequence.length - sequenceIndex - 1);
      const include =
        sequenceIndex === sequence.length - 1 ||
        sequenceIndex === 0 ||
        depthToRoot < 14 ||
        sequenceIndex % sampleEvery === 0;
      if (!include) continue;

      const value = sequence[sequenceIndex];
      const nodeId = value.toString();
      const draft = nodeDrafts.get(nodeId);
      const densityRatio = draft ? Math.log1p(draft.visitCount) / Math.log1p(maxVisitCount) : 0;
      const occurrence = visualPositionForOccurrence({
        depthRatio: depthToRoot / maxTrajectoryDepth,
        lane,
        trajectoryCurve,
        isLatest,
        value,
      });
      const trunk = new Vector3(
        stableSigned(`${nodeId}:trunk`) * 0.55 * Math.pow(depthToRoot / maxTrajectoryDepth, 0.6),
        Math.pow(depthToRoot / maxTrajectoryDepth, 0.82) * SCENE_HEIGHT,
        -2.8 + Math.sin((depthToRoot / maxTrajectoryDepth) * Math.PI) * 1.35,
      );
      const point = occurrence.lerp(trunk, Math.min(0.74, densityRatio * 0.78));

      points.push(point);
      sampled.push({ nodeId, value, position: point, depth: depthToRoot });
    }

    if (points.length < 2) return;

    const maxSampledVisits = Math.max(1, ...sampled.map(s => nodeDrafts.get(s.nodeId)?.visitCount ?? 1));
    const densityCutoff = Math.max(3, Math.ceil(trajectories.length * 0.06));
    const isSharedBranch = maxSampledVisits >= densityCutoff;
    const tone: VisualPathTone = isLatest ? "latest" : isRecord ? "record" : isSharedBranch ? "recent" : "older";
    guides.push({
      id: `guide-${trajectory.id}`,
      points: smoothGuide(points, isLatest),
      tone,
      isLatest,
      isRecord,
      density: Math.max(
        1,
        ...sampled.map((sample) => nodeDrafts.get(sample.nodeId)?.visitCount ?? 1),
      ),
    });

    sampled.forEach((sample, sampleIndex) => {
      if (dotCount >= maxDots) return;
      const draft = nodeDrafts.get(sample.nodeId);
      const selectedNode = nodeById.get(sample.nodeId);
      const keepDot =
        isLatest ||
        sampleIndex % 2 === 0 ||
        (draft?.visitCount ?? 0) > 1 ||
        sample.depth < 20;
      if (!keepDot) return;

      dots.push({
        id: `dot-${trajectory.id}-${sample.nodeId}-${sampleIndex}`,
        nodeId: sample.nodeId,
        valueLabel: formatLargeNumber(sample.value),
        position: sample.position,
        tone,
        isLatest,
        isRecord,
        nodeType: selectedNode?.nodeType ?? nodeTypeFor(draft ?? fallbackDraft(sample.value), false),
        visitCount: draft?.visitCount ?? 1,
        approxDepth: selectedNode?.approxDepth ?? sample.depth,
        upstreamPathCount: selectedNode?.upstreamPathCount ?? draft?.visitCount ?? 1,
        childrenCount: selectedNode?.childrenCount ?? draft?.childrenCount ?? 0,
      });
      dotCount += 1;
    });
  });

  return { guides, dots };
}

function smoothGuide(points: Vector3[], isLatest: boolean): Vector3[] {
  const smoothed: Vector3[] = [];
  for (let index = 0; index < points.length - 1; index++) {
    const from = points[index];
    const to = points[index + 1];
    const steps = isLatest ? 4 : 3;
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      const eased = t * t * (3 - 2 * t);
      const point = new Vector3().lerpVectors(from, to, eased);
      point.y += Math.sin(Math.PI * t) * 0.08;
      smoothed.push(point);
    }
  }
  smoothed.push(points[points.length - 1]);
  return smoothed;
}

function fallbackDraft(value: bigint): NodeDraft {
  return {
    value,
    visitCount: 1,
    incomingCount: 0,
    childrenCount: 0,
    laneTotal: 0,
    laneWeight: 0,
    xTotal: 0,
    yTotal: 0,
    zTotal: 0,
    positionWeight: 0,
    outgoingValue: null,
    approxDepth: 0,
    firstSeenOrder: 0,
    isLatest: false,
    isSelected: false,
    isRecord: false,
    isBranchSample: false,
  };
}

function curvedEdgePoints(from: Vector3, to: Vector3, edge: EdgeDraft): Vector3[] {
  const steps = edge.isLatest || edge.traversalCount > 1 ? 8 : 5;
  const points: Vector3[] = [];
  const arc = Math.min(2.8, 0.45 + Math.abs(to.x - from.x) * 0.08 + Math.abs(to.y - from.y) * 0.05);
  const side = stableSigned(`${edge.from}->${edge.to}:curve`) * 0.22;

  for (let index = 0; index <= steps; index++) {
    const t = index / steps;
    const eased = t * t * (3 - 2 * t);
    const point = new Vector3().lerpVectors(from, to, eased);
    const lift = Math.sin(Math.PI * t) * arc;
    point.y += lift * 0.12;
    point.x += side * Math.sin(Math.PI * t);
    point.z += Math.sin(Math.PI * t) * 0.16;
    points.push(point);
  }

  return points;
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
    (draft.isLatest ? 45_000 : 0) +
    (draft.isSelected ? 30_000 : 0) +
    (draft.isRecord ? 22_000 : 0) +
    (draft.isBranchSample ? 15_000 : 0) +
    draft.approxDepth * 2 -
    draft.firstSeenOrder * 0.03
  );
}

function scoreEdge(edge: EdgeDraft): number {
  return (
    edge.traversalCount * 160 +
    (edge.isLatest ? 45_000 : 0) +
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
