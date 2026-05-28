"use client";

import { useMemo } from "react";
import { Line, Stars, Text } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
} from "three";
import type {
  ConvergenceBranchDot,
  ConvergenceGraph,
  ConvergenceNode,
} from "../convergenceTreeGeometry";
import type { VisualPathTone } from "../visualStudioTypes";

export interface ConvergenceTreeVisualLayers {
  latest: boolean;
  density: boolean;
  older: boolean;
}

interface ConvergenceTree3DProps {
  graph: ConvergenceGraph;
  selectedNodeId: string | null;
  visualLayers: ConvergenceTreeVisualLayers;
  onSelectNode: (nodeId: string) => void;
  onHoverNode: (node: ConvergenceNode | null) => void;
}

const NODE_COLORS: Record<VisualPathTone | "root", string> = {
  latest: "#f8c44f",
  recent: "#22f4ff",
  older: "#a855f7",
  record: "#fb923c",
  root: "#ffffff",
};

export function ConvergenceTree3D({
  graph,
  selectedNodeId,
  visualLayers,
  onSelectNode,
  onHoverNode,
}: ConvergenceTree3DProps) {
  const pointGroups = useMemo(() => buildPointGroups(graph.nodes), [graph.nodes]);
  const branchDotGroups = useMemo(
    () => buildBranchDotGroups(graph.branchDots),
    [graph.branchDots],
  );
  const edgeGroups = useMemo(
    () => buildEdgeGroups(graph, selectedNodeId, visualLayers),
    [graph, selectedNodeId, visualLayers],
  );
  const nodeLookup = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  );
  const accentNodes = useMemo(
    () =>
      graph.nodes
        .filter(
          (node) =>
            node.isRoot ||
            node.isLatest ||
            node.isSelected ||
            node.isRecord ||
            node.nodeType === "merge",
        )
        .sort((left, right) => right.upstreamPathCount - left.upstreamPathCount)
        .slice(0, 260),
    [graph.nodes],
  );

  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[0, 5, 2]} intensity={52} color="#67e8f9" />
      <pointLight position={[-18, 16, -4]} intensity={22} color="#a855f7" />
      <pointLight position={[18, 18, 4]} intensity={24} color="#f8c44f" />
      <Stars
        radius={62}
        depth={36}
        count={720}
        factor={2.3}
        saturation={0}
        fade
        speed={0.12}
      />

      <ConvergenceGrid />

      <group position={[0, -0.9, -5]}>
        {edgeGroups.map((group) => (
          <lineSegments key={group.key} geometry={group.geometry}>
            <primitive object={group.material} attach="material" />
          </lineSegments>
        ))}

        {pointGroups.map((group) => {
          if (!visualLayers.latest && group.tone === "latest") return null;
          if (!visualLayers.older && group.tone === "older") return null;
          if (!visualLayers.density && group.tone === "recent") return null;

          return (
            <points
              key={group.key}
              geometry={group.geometry}
              onClick={(event) => handlePointEvent(event, group.nodes, onSelectNode)}
              onPointerOver={(event) => handlePointHover(event, group.nodes, onHoverNode)}
              onPointerMove={(event) => handlePointHover(event, group.nodes, onHoverNode)}
              onPointerOut={() => onHoverNode(null)}
            >
              <pointsMaterial
                color={group.color}
                size={group.size}
                transparent
                opacity={group.opacity}
                depthWrite={false}
                sizeAttenuation
                blending={AdditiveBlending}
              />
            </points>
          );
        })}

        {branchDotGroups.map((group) => {
          if (!visualLayers.latest && group.tone === "latest") return null;
          if (!visualLayers.older && group.tone === "older") return null;
          if (!visualLayers.density && group.tone === "recent") return null;

          return (
            <points
              key={group.key}
              geometry={group.geometry}
              onClick={(event) => handleBranchDotClick(event, group.dots, onSelectNode)}
              onPointerOver={(event) =>
                handleBranchDotHover(event, group.dots, nodeLookup, onHoverNode)
              }
              onPointerMove={(event) =>
                handleBranchDotHover(event, group.dots, nodeLookup, onHoverNode)
              }
              onPointerOut={() => onHoverNode(null)}
            >
              <pointsMaterial
                color={group.color}
                size={group.size}
                transparent
                opacity={group.opacity}
                depthWrite={false}
                sizeAttenuation
                blending={AdditiveBlending}
              />
            </points>
          );
        })}

        {accentNodes.map((node) => {
          const selected = node.id === selectedNodeId;
          const color = node.isRoot ? NODE_COLORS.root : NODE_COLORS[node.tone];
          const radius = node.isRoot
            ? 0.34
            : selected
              ? 0.24
              : node.nodeType === "merge"
                ? 0.11 + Math.min(0.16, node.upstreamPathCount / graph.maxVisitCount / 2.8)
                : 0.09;

          return (
            <group key={node.id} position={node.position}>
              <mesh
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectNode(node.id);
                }}
                onPointerOver={(event) => {
                  event.stopPropagation();
                  onHoverNode(node);
                }}
                onPointerOut={(event) => {
                  event.stopPropagation();
                  onHoverNode(null);
                }}
              >
                <sphereGeometry args={[radius, 20, 20]} />
                <meshBasicMaterial color={color} transparent opacity={selected ? 1 : 0.92} />
              </mesh>
              <mesh>
                <sphereGeometry args={[radius * (node.isRoot ? 6 : selected ? 4.2 : 3.4), 24, 24]} />
                <meshBasicMaterial
                  color={node.isRoot ? "#e0faff" : color}
                  transparent
                  opacity={node.isRoot ? 0.2 : selected ? 0.18 : 0.1}
                  depthWrite={false}
                  blending={AdditiveBlending}
                />
              </mesh>
              {(selected || node.isRoot) && (
                <Text
                  position={[0, -0.52, 0]}
                  fontSize={node.isRoot ? 0.48 : 0.34}
                  color={node.isRoot ? "#f8fafc" : "#fef3c7"}
                  anchorX="center"
                  anchorY="middle"
                >
                  {node.isRoot ? "1" : node.valueLabel}
                </Text>
              )}
            </group>
          );
        })}
      </group>
    </>
  );
}

function buildPointGroups(nodes: ConvergenceNode[]) {
  return (["older", "recent", "record", "latest"] as VisualPathTone[]).flatMap((tone) => {
    const matching = nodes.filter((node) => !node.isRoot && node.tone === tone);
    if (matching.length === 0) return [];

    const geometry = new BufferGeometry();
    const positions = new Float32Array(matching.length * 3);
    matching.forEach((node, index) => {
      positions[index * 3] = node.position.x;
      positions[index * 3 + 1] = node.position.y;
      positions[index * 3 + 2] = node.position.z;
    });
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));

    return [
      {
        key: tone,
        tone,
        nodes: matching,
        geometry,
        color: NODE_COLORS[tone],
        opacity: tone === "older" ? 0.78 : tone === "recent" ? 0.88 : 0.95,
        size: tone === "older" ? 0.13 : tone === "recent" ? 0.17 : 0.2,
      },
    ];
  });
}

function buildBranchDotGroups(dots: ConvergenceBranchDot[]) {
  return (["older", "recent", "record", "latest"] as VisualPathTone[]).flatMap((tone) => {
    const matching = dots.filter((dot) => dot.tone === tone);
    if (matching.length === 0) return [];

    const geometry = new BufferGeometry();
    const positions = new Float32Array(matching.length * 3);
    matching.forEach((dot, index) => {
      positions[index * 3] = dot.position.x;
      positions[index * 3 + 1] = dot.position.y;
      positions[index * 3 + 2] = dot.position.z;
    });
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));

    return [
      {
        key: `branch-${tone}`,
        tone,
        dots: matching,
        geometry,
        color: NODE_COLORS[tone],
        opacity: tone === "older" ? 0.88 : 0.95,
        size: tone === "latest" ? 0.24 : tone === "recent" ? 0.18 : 0.15,
      },
    ];
  });
}

function buildEdgeGroups(
  graph: ConvergenceGraph,
  selectedNodeId: string | null,
  visualLayers: ConvergenceTreeVisualLayers,
) {
  const buckets = new Map<
    string,
    {
      color: string;
      opacity: number;
      positions: number[];
      priority: number;
    }
  >();

  function addPolyline(
    key: string,
    color: string,
    opacity: number,
    priority: number,
    points: Vector3Like[],
  ) {
    const bucket = buckets.get(key) ?? { color, opacity, positions: [], priority };
    for (let index = 0; index < points.length - 1; index++) {
      bucket.positions.push(
        points[index].x,
        points[index].y,
        points[index].z,
        points[index + 1].x,
        points[index + 1].y,
        points[index + 1].z,
      );
    }
    buckets.set(key, bucket);
  }

  graph.branchGuides.forEach((guide) => {
    if (!visualLayers.latest && guide.isLatest) return;
    if (!visualLayers.older && guide.tone === "older") return;
    if (!visualLayers.density && guide.tone === "recent" && !guide.isLatest) return;

    const selected = Boolean(
      selectedNodeId &&
        graph.branchDots.some((dot) => dot.nodeId === selectedNodeId && dot.tone === guide.tone),
    );
    const denseRatio = guide.density / Math.max(graph.maxVisitCount, 1);
    const dense = guide.density > 1;
    const key = selected
      ? "selected"
      : guide.isLatest
        ? "latest"
        : guide.isRecord
          ? "record"
          : dense
            ? "density"
            : guide.tone;

    const color =
      key === "selected"
        ? "#fef9c3"
        : key === "latest"
          ? "#f8c44f"
          : key === "density"
            ? "#22f4ff"
            : key === "record"
              ? "#fb923c"
              : "#a855f7";
    const opacity =
      key === "selected"
        ? 0.98
        : key === "latest"
          ? 0.96
          : key === "density"
            ? Math.min(0.9, 0.5 + denseRatio * 0.85)
            : key === "record"
              ? 0.8
              : 0.42;

    addPolyline(key, color, opacity, selected ? 5 : guide.isLatest ? 4 : dense ? 3 : 1, guide.points);

    if (selected || guide.isLatest || denseRatio > 0.18) {
      addPolyline(
        `${key}-glow`,
        color,
        selected ? 0.18 : guide.isLatest ? 0.14 : 0.08,
        selected ? 6 : 2,
        guide.points,
      );
    }
  });

  return Array.from(buckets.entries())
    .sort((left, right) => left[1].priority - right[1].priority)
    .map(([key, bucket]) => {
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        "position",
        new Float32BufferAttribute(new Float32Array(bucket.positions), 3),
      );
      const material = new LineBasicMaterial({
        color: bucket.color,
        transparent: true,
        opacity: bucket.opacity,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      return { key, geometry, material };
    });
}

function handleBranchDotClick(
  event: ThreeEvent<MouseEvent>,
  dots: ConvergenceBranchDot[],
  onSelectNode: (nodeId: string) => void,
) {
  event.stopPropagation();
  const index = event.index;
  if (typeof index !== "number") return;
  const dot = dots[index];
  if (dot) onSelectNode(dot.nodeId);
}

function handleBranchDotHover(
  event: ThreeEvent<PointerEvent>,
  dots: ConvergenceBranchDot[],
  nodeLookup: Map<string, ConvergenceNode>,
  onHoverNode: (node: ConvergenceNode | null) => void,
) {
  event.stopPropagation();
  const index = event.index;
  if (typeof index !== "number") return;
  const dot = dots[index];
  if (!dot) return;
  onHoverNode(nodeLookup.get(dot.nodeId) ?? branchDotAsNode(dot));
}

function branchDotAsNode(dot: ConvergenceBranchDot): ConvergenceNode {
  return {
    id: dot.nodeId,
    valueLabel: dot.valueLabel,
    position: dot.position,
    visitCount: dot.visitCount,
    incomingCount: dot.upstreamPathCount,
    upstreamPathCount: dot.upstreamPathCount,
    childrenCount: dot.childrenCount,
    outgoingLabel: "Not available",
    approxDepth: dot.approxDepth,
    depthRatio: 0,
    isRoot: false,
    isLatest: dot.isLatest,
    isSelected: false,
    isRecord: dot.isRecord,
    tone: dot.tone,
    nodeType: dot.nodeType,
  };
}

interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

function handlePointEvent(
  event: ThreeEvent<MouseEvent>,
  nodes: ConvergenceNode[],
  onSelectNode: (nodeId: string) => void,
) {
  event.stopPropagation();
  const index = event.index;
  if (typeof index !== "number") return;
  const node = nodes[index];
  if (node) onSelectNode(node.id);
}

function handlePointHover(
  event: ThreeEvent<PointerEvent>,
  nodes: ConvergenceNode[],
  onHoverNode: (node: ConvergenceNode | null) => void,
) {
  event.stopPropagation();
  const index = event.index;
  if (typeof index !== "number") return;
  onHoverNode(nodes[index] ?? null);
}

function ConvergenceGrid() {
  const lines = useMemo(() => {
    const grid: { key: string; points: [number, number, number][]; major: boolean }[] = [];
    for (let index = 0; index <= 18; index++) {
      const offset = -24 + index * 3;
      grid.push({
        key: `x-${index}`,
        points: [
          [-24, -0.08, offset - 5],
          [24, -0.08, offset - 5],
        ],
        major: index % 3 === 0,
      });
      grid.push({
        key: `z-${index}`,
        points: [
          [offset, -0.08, -29],
          [offset, -0.08, 19],
        ],
        major: index % 3 === 0,
      });
    }
    return grid;
  }, []);

  return (
    <group>
      {lines.map((line) => (
        <Line
          key={line.key}
          points={line.points}
          color={line.major ? "#0e7490" : "#08344c"}
          lineWidth={line.major ? 0.82 : 0.5}
          transparent
          opacity={line.major ? 0.42 : 0.24}
          depthWrite={false}
        />
      ))}
      <Line
        points={[
          [0, -0.04, -5],
          [0, 18, -5],
        ]}
        color="#67e8f9"
        lineWidth={1.2}
        transparent
        opacity={0.36}
      />
      <Line
        points={[
          [-1.2, -0.03, -5],
          [1.2, -0.03, -5],
        ]}
        color="#e0faff"
        lineWidth={2.2}
        transparent
        opacity={0.6}
      />
    </group>
  );
}
