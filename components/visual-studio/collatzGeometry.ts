"use client";

import { Vector3 } from "three";
import type { ScaleMode, VisualPathTone, VisualTrajectory } from "./visualStudioTypes";
import { toneForTrajectory } from "./collatzColorMaps";

export interface VisualScenePath {
  trajectory: VisualTrajectory;
  points: Vector3[];
  tone: VisualPathTone;
}

export interface VisualSceneGeometry {
  paths: VisualScenePath[];
  maxStep: number;
  maxLogValue: number;
  width: number;
  depth: number;
  height: number;
}

const SCENE_WIDTH = 38;
const SCENE_DEPTH = 24;
const SCENE_HEIGHT = 16;

export function log10BigInt(value: bigint): number {
  if (value <= 0n) return 0;
  const raw = value.toString();
  if (raw.length <= 15) return Math.log10(Number(value));
  const head = Number(raw.slice(0, 15));
  return Math.log10(head) + raw.length - 15;
}

function valueHeight(value: bigint, maxLogValue: number, scaleMode: ScaleMode): number {
  const logValue = log10BigInt(value + 1n);
  if (scaleMode === "linear") {
    const ratio = Math.pow(10, logValue - Math.max(maxLogValue, 1));
    return Math.min(SCENE_HEIGHT, ratio * SCENE_HEIGHT);
  }

  return (logValue / Math.max(maxLogValue, 1)) * SCENE_HEIGHT;
}

export function buildTrajectoryGeometry(
  trajectories: VisualTrajectory[],
  scaleMode: ScaleMode,
  highlightRecords: boolean,
): VisualSceneGeometry {
  const maxStep = Math.max(
    1,
    ...trajectories.map((trajectory) => Math.max(trajectory.steps, 1)),
  );
  const maxLogValue = Math.max(
    1,
    ...trajectories.map((trajectory) => log10BigInt(trajectory.peak + 1n)),
  );
  const zSpacing =
    trajectories.length > 1 ? SCENE_DEPTH / Math.max(1, trajectories.length - 1) : 0;

  const paths = trajectories.map((trajectory, index) => {
    const z = trajectories.length > 1 ? SCENE_DEPTH / 2 - index * zSpacing : 0;
    const tone = toneForTrajectory(
      index,
      trajectories.length,
      trajectory.isRecord,
      highlightRecords,
    );

    const points = trajectory.values.map((point) => {
      const x = (point.step / maxStep) * SCENE_WIDTH - SCENE_WIDTH / 2;
      const y = valueHeight(point.value, maxLogValue, scaleMode);
      return new Vector3(x, y, z);
    });

    return { trajectory, points, tone };
  });

  return {
    paths,
    maxStep,
    maxLogValue,
    width: SCENE_WIDTH,
    depth: SCENE_DEPTH,
    height: SCENE_HEIGHT,
  };
}
