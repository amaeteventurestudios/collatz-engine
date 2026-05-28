"use client";

import { useMemo } from "react";
import { Line, Stars, Text } from "@react-three/drei";
import { DoubleSide } from "three";
import { buildTrajectoryGeometry } from "../collatzGeometry";
import {
  opacityForTone,
  VISUAL_STUDIO_COLORS,
  VISUAL_STUDIO_GLOW,
} from "../collatzColorMaps";
import type { ScaleMode, VisualTrajectory } from "../visualStudioTypes";

interface LiveSequenceStack3DProps {
  trajectories: VisualTrajectory[];
  selectedPathId: string | null;
  scaleMode: ScaleMode;
  highlightRecords: boolean;
  onSelectPath: (trajectoryId: string) => void;
  onHoverPath: (trajectory: VisualTrajectory | null) => void;
}

export function LiveSequenceStack3D({
  trajectories,
  selectedPathId,
  scaleMode,
  highlightRecords,
  onSelectPath,
  onHoverPath,
}: LiveSequenceStack3DProps) {
  const geometry = useMemo(
    () => buildTrajectoryGeometry(trajectories, scaleMode, highlightRecords),
    [highlightRecords, scaleMode, trajectories],
  );

  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 18, 16]} intensity={30} color="#22d3ee" />
      <pointLight position={[18, 13, -6]} intensity={18} color="#8b5cf6" />
      <Stars
        radius={52}
        depth={28}
        count={520}
        factor={2.2}
        saturation={0}
        fade
        speed={0.18}
      />

      <GridField width={geometry.width} depth={geometry.depth} />
      <AxisLabels
        width={geometry.width}
        depth={geometry.depth}
        height={geometry.height}
        maxStep={geometry.maxStep}
        maxLogValue={geometry.maxLogValue}
        scaleMode={scaleMode}
      />

      <group>
        {geometry.paths.map((path, index) => {
          const selected = path.trajectory.id === selectedPathId;
          const color = VISUAL_STUDIO_COLORS[path.tone];
          const opacity = opacityForTone(path.tone, selected);
          const lineWidth = selected || index === 0 ? 2.6 : path.tone === "older" ? 1.15 : 1.55;
          const lastPoint = path.points[path.points.length - 1];

          return (
            <group key={path.trajectory.id}>
              {(selected || index === 0 || path.tone === "record") && (
                <Line
                  points={path.points}
                  color={color}
                  lineWidth={lineWidth + 4}
                  transparent
                  opacity={0.14}
                  depthWrite={false}
                />
              )}
              <Line
                points={path.points}
                color={color}
                lineWidth={lineWidth}
                transparent
                opacity={opacity}
                depthWrite={false}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectPath(path.trajectory.id);
                }}
                onPointerOver={(event) => {
                  event.stopPropagation();
                  onHoverPath(path.trajectory);
                }}
                onPointerOut={(event) => {
                  event.stopPropagation();
                  onHoverPath(null);
                }}
              />
              {(selected || index === 0) && lastPoint && (
                <mesh position={lastPoint}>
                  <sphereGeometry args={[selected ? 0.18 : 0.13, 18, 18]} />
                  <meshBasicMaterial color={color} transparent opacity={0.95} />
                </mesh>
              )}
              {(selected || index === 0) && lastPoint && (
                <mesh position={lastPoint}>
                  <sphereGeometry args={[selected ? 0.42 : 0.34, 24, 24]} />
                  <meshBasicMaterial
                    color={VISUAL_STUDIO_GLOW[path.tone]}
                    transparent
                    opacity={0.16}
                    side={DoubleSide}
                    depthWrite={false}
                  />
                </mesh>
              )}
            </group>
          );
        })}
      </group>
    </>
  );
}

function GridField({ width, depth }: { width: number; depth: number }) {
  const gridLines = useMemo(() => {
    const y = -0.02;
    const lines: { key: string; points: [number, number, number][]; major: boolean }[] = [];
    const xMin = -width / 2;
    const xMax = width / 2;
    const zMin = -depth / 2;
    const zMax = depth / 2;

    for (let i = 0; i <= 12; i++) {
      const z = zMin + (i / 12) * depth;
      lines.push({
        key: `z-${i}`,
        points: [
          [xMin, y, z],
          [xMax, y, z],
        ],
        major: i % 3 === 0,
      });
    }

    for (let i = 0; i <= 16; i++) {
      const x = xMin + (i / 16) * width;
      lines.push({
        key: `x-${i}`,
        points: [
          [x, y, zMin],
          [x, y, zMax],
        ],
        major: i % 4 === 0,
      });
    }

    return lines;
  }, [depth, width]);

  return (
    <group>
      {gridLines.map((line) => (
        <Line
          key={line.key}
          points={line.points}
          color={line.major ? "#14506e" : "#08263b"}
          lineWidth={line.major ? 0.8 : 0.45}
          transparent
          opacity={line.major ? 0.38 : 0.2}
          depthWrite={false}
        />
      ))}
    </group>
  );
}

function AxisLabels({
  width,
  depth,
  height,
  maxStep,
  maxLogValue,
  scaleMode,
}: {
  width: number;
  depth: number;
  height: number;
  maxStep: number;
  maxLogValue: number;
  scaleMode: ScaleMode;
}) {
  const xMin = -width / 2;
  const xMax = width / 2;
  const zMin = -depth / 2;
  const zMax = depth / 2;
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <group>
      <Line
        points={[
          [xMin, 0, zMin],
          [xMax, 0, zMin],
        ]}
        color="#7dd3fc"
        lineWidth={1}
        transparent
        opacity={0.58}
      />
      <Line
        points={[
          [xMin, 0, zMin],
          [xMin, height, zMin],
        ]}
        color="#c4b5fd"
        lineWidth={1}
        transparent
        opacity={0.52}
      />
      <Line
        points={[
          [xMax, 0, zMin],
          [xMax, 0, zMax],
        ]}
        color="#38bdf8"
        lineWidth={1}
        transparent
        opacity={0.48}
      />

      <Text
        position={[0, -0.8, zMin - 1.6]}
        rotation={[-Math.PI / 3.2, 0, 0]}
        fontSize={0.72}
        color="#dbeafe"
        anchorX="center"
        anchorY="middle"
      >
        Step (n)
      </Text>
      <Text
        position={[xMax + 1.8, -0.45, 0]}
        rotation={[-Math.PI / 3.4, 0, -Math.PI / 2]}
        fontSize={0.58}
        color="#bfdbfe"
        anchorX="center"
        anchorY="middle"
      >
        Trajectory order
      </Text>
      <Text
        position={[xMin - 1.4, height / 2, zMin]}
        rotation={[0, Math.PI / 2.8, 0]}
        fontSize={0.58}
        color="#c4b5fd"
        anchorX="center"
        anchorY="middle"
      >
        {scaleMode === "log" ? "log(value)" : "value"}
      </Text>

      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
        const stepLabel = Math.round(maxStep * fraction).toLocaleString("en-US");
        const x = xMin + fraction * width;
        return (
          <Text
            key={fraction}
            position={[x, -0.55, zMin - 0.45]}
            rotation={[-Math.PI / 3.2, 0, 0]}
            fontSize={0.42}
            color="#94a3b8"
            anchorX="center"
            anchorY="middle"
          >
            {stepLabel}
          </Text>
        );
      })}

      {yTicks.map((fraction) => {
        const value = scaleMode === "log"
          ? Math.round(maxLogValue * fraction)
          : Math.round(100 * fraction);
        const label = scaleMode === "log" ? `10^${value}` : `${value}%`;
        return (
          <Text
            key={fraction}
            position={[xMin - 0.85, height * fraction, zMin - 0.15]}
            rotation={[0, Math.PI / 2.6, 0]}
            fontSize={0.38}
            color="#cbd5e1"
            anchorX="right"
            anchorY="middle"
          >
            {label}
          </Text>
        );
      })}
    </group>
  );
}
