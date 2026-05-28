"use client";

import { useMemo } from "react";
import { Line, Stars, Text } from "@react-three/drei";
import { BufferGeometry, Float32BufferAttribute } from "three";
import {
  opacityForTone,
  VISUAL_STUDIO_COLORS,
} from "../collatzColorMaps";
import type { ConvergenceGraph, ConvergenceNode } from "../convergenceTreeGeometry";
import type { VisualPathTone } from "../visualStudioTypes";

interface ConvergenceTree3DProps {
  graph: ConvergenceGraph;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

const NODE_COLORS: Record<VisualPathTone | "root", string> = {
  latest: "#f8c44f",
  recent: "#22d3ee",
  older: "#8b5cf6",
  record: "#fb923c",
  root: "#f8fafc",
};

export function ConvergenceTree3D({
  graph,
  selectedNodeId,
  onSelectNode,
}: ConvergenceTree3DProps) {
  const pointGroups = useMemo(() => buildPointGroups(graph.nodes), [graph.nodes]);
  const interactiveNodes = useMemo(
    () =>
      graph.nodes
        .filter(
          (node) =>
            node.isRoot ||
            node.isLatest ||
            node.isSelected ||
            node.isRecord ||
            node.visitCount > 1,
        )
        .sort((left, right) => right.visitCount - left.visitCount)
        .slice(0, 180),
    [graph.nodes],
  );

  return (
    <>
      <ambientLight intensity={0.42} />
      <pointLight position={[0, 15, 8]} intensity={34} color="#22d3ee" />
      <pointLight position={[-18, 20, 22]} intensity={18} color="#8b5cf6" />
      <pointLight position={[18, 11, -10]} intensity={14} color="#f8c44f" />
      <Stars
        radius={62}
        depth={34}
        count={620}
        factor={2.1}
        saturation={0}
        fade
        speed={0.14}
      />

      <ConvergenceGrid />

      <group position={[0, 0, -8]}>
        {graph.edges.map((edge) => {
          const selected = edge.fromId === selectedNodeId || edge.toId === selectedNodeId;
          const isDense = edge.traversalCount > 1;
          const color = VISUAL_STUDIO_COLORS[edge.tone];
          const opacity = selected
            ? 0.98
            : isDense
              ? Math.min(0.92, 0.35 + edge.traversalCount / graph.maxVisitCount)
              : opacityForTone(edge.tone, false) * 0.72;
          const lineWidth = selected
            ? 2.7
            : edge.isLatest
              ? 2.2
              : isDense
                ? 1.15 + Math.min(1.15, edge.traversalCount / graph.maxVisitCount)
                : 0.72;

          return (
            <Line
              key={edge.id}
              points={edge.points}
              color={color}
              lineWidth={lineWidth}
              transparent
              opacity={opacity}
              depthWrite={false}
            />
          );
        })}

        {pointGroups.map((group) => (
          <points key={group.key} geometry={group.geometry}>
            <pointsMaterial
              color={group.color}
              size={group.size}
              transparent
              opacity={group.opacity}
              depthWrite={false}
              sizeAttenuation
            />
          </points>
        ))}

        {interactiveNodes.map((node) => {
          const selected = node.id === selectedNodeId;
          const color = node.isRoot ? NODE_COLORS.root : NODE_COLORS[node.tone];
          const radius = node.isRoot
            ? 0.22
            : selected
              ? 0.2
              : 0.08 + Math.min(0.12, node.visitCount / graph.maxVisitCount / 6);

          return (
            <group key={node.id} position={node.position}>
              <mesh
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectNode(node.id);
                }}
              >
                <sphereGeometry args={[radius, 18, 18]} />
                <meshBasicMaterial color={color} transparent opacity={selected ? 1 : 0.86} />
              </mesh>
              {(selected || node.isRoot || node.isLatest) && (
                <mesh>
                  <sphereGeometry args={[radius * 3.2, 24, 24]} />
                  <meshBasicMaterial
                    color={node.isRoot ? "#e0f2fe" : color}
                    transparent
                    opacity={selected ? 0.16 : 0.11}
                    depthWrite={false}
                  />
                </mesh>
              )}
              {(selected || node.isRoot) && (
                <Text
                  position={[0, radius + 0.45, 0]}
                  fontSize={node.isRoot ? 0.48 : 0.36}
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
        geometry,
        color: NODE_COLORS[tone],
        opacity: tone === "older" ? 0.52 : tone === "recent" ? 0.68 : 0.82,
        size: tone === "older" ? 0.075 : tone === "recent" ? 0.095 : 0.12,
      },
    ];
  });
}

function ConvergenceGrid() {
  const lines = useMemo(() => {
    const grid: { key: string; points: [number, number, number][]; major: boolean }[] = [];
    for (let index = 0; index <= 12; index++) {
      const offset = -18 + index * 3;
      grid.push({
        key: `x-${index}`,
        points: [
          [-20, -0.04, offset - 8],
          [20, -0.04, offset - 8],
        ],
        major: index % 3 === 0,
      });
      grid.push({
        key: `z-${index}`,
        points: [
          [offset, -0.04, -26],
          [offset, -0.04, 10],
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
          color={line.major ? "#14506e" : "#08263b"}
          lineWidth={line.major ? 0.75 : 0.42}
          transparent
          opacity={line.major ? 0.32 : 0.17}
          depthWrite={false}
        />
      ))}
      <Line
        points={[
          [0, 0, -8],
          [0, 10, -8],
        ]}
        color="#f8fafc"
        lineWidth={1}
        transparent
        opacity={0.34}
      />
      <Text
        position={[0, -0.75, -8]}
        rotation={[-Math.PI / 2.6, 0, 0]}
        fontSize={0.54}
        color="#dbeafe"
        anchorX="center"
        anchorY="middle"
      >
        convergence root
      </Text>
    </group>
  );
}
