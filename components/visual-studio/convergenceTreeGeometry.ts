"use client";

import { Vector3 } from "three";
import { formatLargeNumber } from "@/lib/collatz/format";
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
const FAN_WIDTH = 36;
const FAN_DEPTH_Z = 11;  // genuine volumetric Z spread for a real 3D tree

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
    const xLane = xLaneForTrajectory(trajectoryIndex, trajectories.length);
    const zLane = zLaneForTrajectory(trajectoryIndex, trajectories.length);
    const trajectoryCurve = stableSigned(`${trajectory.id}:curve`) * 0.14;
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
        xLane,
        zLane,
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
      draft.laneTotal += xLane * laneWeight;
      draft.laneWeight += laneWeight;
      draft.xTotal += visualPosition.x * laneWeight;
      draft.yTotal += visualPosition.y * laneWeight;
      draft.zTotal += visualPosition.z * laneWeight;
      draft.positionWeight += laneWeight;
      draft.outgoingValue = draft.outgoingValue ?? nextValue;
      draft.approxDepth = Math.min(draft.approxDepth, depthToRoot);
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

// X lane: symmetric alternating left/right spread
function xLaneForTrajectory(index: number, total: number): number {
  if (index === 0) return 0.82;         // latest: right side
  if (total <= 1) return 0;
  const pos = index - 1;               // 0-indexed among non-latest
  const half = Math.ceil((total - 1) / 2);
  const side = pos % 2 === 0 ? -1 : 1; // alternate: L, R, L, R...
  const rank = Math.floor(pos / 2);
  const spread = half <= 1 ? 0.18 : 0.18 + (rank / (half - 1)) * 0.82;
  return side * spread;
}

// Z lane: genuine depth spread for volumetric 3D canopy
// Trajectories get different depth positions so the tree has real 3D form.
function zLaneForTrajectory(index: number, total: number): number {
  if (index === 0) return 0.12;         // latest: slightly front-facing
  if (total <= 1) return 0;
  const pos = index - 1;
  const half = Math.ceil((total - 1) / 2);
  const rank = Math.floor(pos / 2);
  // Outer trajectories (higher rank) get more Z spread
  const maxSpread = half <= 1 ? 0.55 : 0.22 + (rank / Math.max(1, half - 1)) * 0.78;
  // Stable pseudo-random Z position using trajectory index as seed
  return stableSigned(`zL:${index}`) * maxSpread;
}

// True 3D position: X = lateral spread, Y = height, Z = genuine depth
function visualPositionForOccurrence({
  depthRatio,
  xLane,
  zLane,
  trajectoryCurve,
  isLatest,
  value,
}: {
  depthRatio: number;
  xLane: number;
  zLane: number;
  trajectoryCurve: number;
  isLatest: boolean;
  value: bigint;
}): Vector3 {
  const growth = Math.pow(depthRatio, 0.72);

  // X: lateral spread — mirrors the reference image's left/right canopy
  const xBend = trajectoryCurve * Math.sin(depthRatio * Math.PI * 1.2);
  const xBulge = Math.sin(depthRatio * Math.PI) * 0.14 * Math.sign(xLane || 0.01);
  const effectiveX = isLatest
    ? Math.max(xLane, 0.22 + Math.pow(depthRatio, 0.68) * 0.60)
    : xLane + xBend + xBulge;
  const x = effectiveX * FAN_WIDTH * 0.5 * growth;

  // Y: height rising from root
  const y = Math.pow(depthRatio, 0.78) * SCENE_HEIGHT;

  // Z: real volumetric depth — makes the tree 3D, not a flat fan
  const zJitter = stableSigned(`${value.toString()}:zj`) * 0.65 * growth;
  const z = zLane * FAN_DEPTH_Z * growth + zJitter;

  return new Vector3(
    clamp(x, -FAN_WIDTH / 2, FAN_WIDTH / 2),
    y,
    clamp(z, -FAN_DEPTH_Z, FAN_DEPTH_Z),
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

    // Highly-visited nodes (trunk/merge) pull very strongly toward center
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
            xLane: stableSigned(`${id}:fallback:x`),
            zLane: stableSigned(`${id}:fallback:z`) * 0.7,
            trajectoryCurve: 0,
            isLatest: draft.isLatest,
            value: draft.value,
          });

    // Trunk: tight central column at x≈0, z≈0 for high-density nodes
    const trunk = new Vector3(
      stableSigned(`${id}:trunk`) * 0.18 * Math.pow(depthRatio, 0.5),
      Math.pow(depthRatio, 0.82) * SCENE_HEIGHT,
      stableSigned(`${id}:trunkZ`) * 0.45,
    );

    // Latest path: pull toward right/front of canopy so it reads like the image
    const latestOuterPull =
      draft.isLatest && draft.visitCount <= 2 ? Math.min(0.72, Math.pow(depthRatio, 0.7)) : 0;
    const latestOuter = new Vector3(
      4.8 + Math.pow(depthRatio, 0.68) * 11.8,
      Math.pow(depthRatio, 0.78) * SCENE_HEIGHT + 1.2,
      2.0 + Math.pow(depthRatio, 0.80) * 3.8, // positive Z = toward camera, front-facing
    );

    const merged = base.lerp(trunk, centerPull).lerp(latestOuter, latestOuterPull);

    positions.set(
      id,
      new Vector3(
        clamp(merged.x, -FAN_WIDTH / 2, FAN_WIDTH / 2),
        merged.y,
        clamp(merged.z, -FAN_DEPTH_Z, FAN_DEPTH_Z),
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
    const xLane = xLaneForTrajectory(trajectoryIndex, trajectories.length);
    const zLane = zLaneForTrajectory(trajectoryIndex, trajectories.length);
    const trajectoryCurve = stableSigned(`${trajectory.id}:curve`) * 0.14;
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
      const tr = depthToRoot / maxTrajectoryDepth;

      const occurrence = visualPositionForOccurrence({
        depthRatio: tr,
        xLane,
        zLane,
        trajectoryCurve,
        isLatest,
        value,
      });

      // Trunk position: tight at center in X and Z for high-density nodes
      const trunk = new Vector3(
        stableSigned(`${nodeId}:trunk`) * 0.18 * Math.pow(tr, 0.5),
        Math.pow(tr, 0.82) * SCENE_HEIGHT,
        stableSigned(`${nodeId}:trunkZ`) * 0.45,
      );

      const point = occurrence.lerp(trunk, Math.min(0.74, densityRatio * 0.78));
      points.push(point);
      sampled.push({ nodeId, value, position: point, depth: depthToRoot });
    }

    if (points.length < 2) return;

    // Tone based on density: high-traffic paths = cyan trunk, sparse = purple outer branches
    const maxSampledVisits = Math.max(
      1,
      ...sampled.map((s) => nodeDrafts.get(s.nodeId)?.visitCount ?? 1),
    );
    const densityCutoff = Math.max(3, Math.ceil(trajectories.length * 0.06));
    const isSharedBranch = maxSampledVisits >= densityCutoff;
    const tone: VisualPathTone =
      isLatest ? "latest" : isRecord ? "record" : isSharedBranch ? "recent" : "older";

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

// Smooth guide with real 3D curve arcs — branches bow outward from trunk in XZ
function smoothGuide(points: Vector3[], isLatest: boolean): Vector3[] {
  const smoothed: Vector3[] = [];
  for (let index = 0; index < points.length - 1; index++) {
    const from = points[index];
    const to = points[index + 1];
    const steps = isLatest ? 5 : 4;

    const midX = (from.x + to.x) * 0.5;
    const midZ = (from.z + to.z) * 0.5;
    const radialDist = Math.sqrt(midX * midX + midZ * midZ);
    const bowMag = radialDist * 0.07;

    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      const eased = t * t * (3 - 2 * t);
      const point = new Vector3().lerpVectors(from, to, eased);
      const bell = Math.sin(Math.PI * t);
      point.y += bell * 0.12;
      if (radialDist > 0.1) {
        point.x += (midX / radialDist) * bowMag * bell;
        point.z += (midZ / radialDist) * bowMag * bell * 0.6;
      }
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

// Curved edges with real 3D bowing in both X and Z
function curvedEdgePoints(from: Vector3, to: Vector3, edge: EdgeDraft): Vector3[] {
  const steps = edge.isLatest || edge.traversalCount > 1 ? 8 : 5;
  const points: Vector3[] = [];
  const arc = Math.min(2.8, 0.45 + Math.abs(to.x - from.x) * 0.08 + Math.abs(to.y - from.y) * 0.05);
  const xBow = stableSigned(`${edge.from}->${edge.to}:curve`) * 0.22;
  const zBow = stableSigned(`${edge.from}->${edge.to}:zcurve`) * 0.48;

  for (let index = 0; index <= steps; index++) {
    const t = index / steps;
    const eased = t * t * (3 - 2 * t);
    const point = new Vector3().lerpVectors(from, to, eased);
    const bell = Math.sin(Math.PI * t);
    point.y += bell * arc * 0.12;
    point.x += xBow * bell;
    point.z += zBow * bell;
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
