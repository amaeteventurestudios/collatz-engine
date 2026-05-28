"use client";

import { computeCollatz } from "@/lib/collatz/engine";
import { formatLargeNumber } from "@/lib/collatz/format";
import type { VisualTrajectory, VisualTrajectoryPoint } from "./visualStudioTypes";

export interface CollatzVisualSourceRow {
  n: number;
  steps: number;
  peak: number | string | bigint;
  reached_one?: boolean | null;
  created_at?: string | null;
}

export interface VisualRecordContext {
  longestSteps?: number | null;
  highestPeak?: number | null;
}

export interface VisualTrajectoryOptions {
  includeFullValues?: boolean;
}

const MAX_DERIVED_STEPS = 5_000;
const MAX_POINTS_PER_TRAJECTORY = 180;

function toBigIntValue(value: number | string | bigint | null | undefined): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0n;
    return BigInt(Math.max(0, Math.trunc(value)));
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return BigInt(value.trim());
  }
  return 0n;
}

function downsampleSequence(sequence: bigint[]): VisualTrajectoryPoint[] {
  if (sequence.length <= MAX_POINTS_PER_TRAJECTORY) {
    return sequence.map((value, step) => ({ step, value }));
  }

  const lastIndex = sequence.length - 1;
  const points: VisualTrajectoryPoint[] = [];
  const seenSteps = new Set<number>();

  for (let i = 0; i < MAX_POINTS_PER_TRAJECTORY; i++) {
    const step = Math.round((i / (MAX_POINTS_PER_TRAJECTORY - 1)) * lastIndex);
    if (seenSteps.has(step)) continue;
    seenSteps.add(step);
    points.push({ step, value: sequence[step] });
  }

  return points;
}

function recordLabelFor(
  row: CollatzVisualSourceRow,
  peak: bigint,
  context: VisualRecordContext,
): string | undefined {
  if (context.longestSteps && row.steps === context.longestSteps) {
    return "Current longest trajectory record";
  }

  if (context.highestPeak) {
    const highestPeak = BigInt(Math.trunc(context.highestPeak));
    if (peak === highestPeak) return "Current highest peak record";
  }

  return undefined;
}

export function deriveVisualTrajectory(
  row: CollatzVisualSourceRow,
  context: VisualRecordContext,
  options: VisualTrajectoryOptions = {},
): VisualTrajectory | null {
  if (!Number.isSafeInteger(row.n) || row.n < 1) return null;

  const expectedSteps = Number.isFinite(row.steps) ? Math.max(0, row.steps) : 0;
  const maxSteps = Math.min(
    MAX_DERIVED_STEPS,
    Math.max(64, expectedSteps + 2),
  );

  const computed = computeCollatz(row.n, { maxSteps });
  if (computed.full_sequence.length === 0) return null;

  const peak = toBigIntValue(row.peak) || computed.peak_value;
  const recordLabel = recordLabelFor(row, peak, context);
  const reachedOne = row.reached_one ?? computed.reached_one;

  return {
    id: `n-${row.n}`,
    start: row.n,
    startLabel: row.n.toLocaleString("en-US"),
    values: downsampleSequence(computed.full_sequence),
    fullValues: options.includeFullValues ? computed.full_sequence : undefined,
    steps: expectedSteps || computed.steps_to_1,
    peak,
    peakLabel: formatLargeNumber(peak),
    oddCount: computed.odd_steps,
    evenCount: computed.even_steps,
    descentStep: computed.first_descent_step,
    checkedAt: row.created_at ?? null,
    isRecord: Boolean(recordLabel),
    recordLabel,
    reachedOne,
    partial: !computed.reached_one,
  };
}

export function formatVisualTimestamp(iso: string | null | undefined): string {
  if (!iso) return "Not available";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNullableMetric(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Not available";
  return Math.trunc(value).toLocaleString("en-US");
}
