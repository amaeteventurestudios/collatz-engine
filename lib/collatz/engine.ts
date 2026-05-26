import type { CollatzOptions, CollatzResult, StoppedReason } from "./types";

const DEFAULT_MAX_STEPS = 10_000_000;

export function computeCollatz(
  input: bigint | number | string,
  options: CollatzOptions = {},
): CollatzResult {
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;

  const parsed = parseInput(input);
  if (parsed === null) return invalidResult();

  const start = parsed;
  let n = start;

  const sequence: bigint[] = [n];
  // Track seen values for defensive cycle detection (value → step index)
  const seen = new Map<bigint, number>();
  seen.set(n, 0);

  let peakValue = n;
  let firstDescentStep: number | null = null;
  let oddSteps = 0;
  let evenSteps = 0;
  let step = 0;

  while (n !== 1n && step < maxSteps) {
    if (n % 2n === 0n) {
      n = n / 2n;
      evenSteps++;
    } else {
      n = 3n * n + 1n;
      oddSteps++;
    }
    step++;
    sequence.push(n);

    if (n > peakValue) peakValue = n;
    if (firstDescentStep === null && n < start) firstDescentStep = step;

    if (n !== 1n) {
      if (seen.has(n)) {
        return buildResult(
          start, sequence, step, peakValue, firstDescentStep,
          oddSteps, evenSteps, false, true, seen.get(n)!, "cycle_detected",
        );
      }
      seen.set(n, step);
    }
  }

  if (n !== 1n) {
    return buildResult(
      start, sequence, step, peakValue, firstDescentStep,
      oddSteps, evenSteps, false, false, null, "max_steps_exceeded",
    );
  }

  return buildResult(
    start, sequence, step, peakValue, firstDescentStep,
    oddSteps, evenSteps, true, false, null, "reached_one",
  );
}

function buildResult(
  start: bigint,
  sequence: bigint[],
  steps: number,
  peakValue: bigint,
  firstDescentStep: number | null,
  oddSteps: number,
  evenSteps: number,
  reachedOne: boolean,
  cycleDetected: boolean,
  cycleAt: number | null,
  stoppedReason: StoppedReason,
): CollatzResult {
  const total = steps;
  return {
    start_number: start,
    full_sequence: sequence,
    steps_to_1: total,
    peak_value: peakValue,
    peak_ratio: total === 0 && start === peakValue ? 1 : Number(peakValue) / Number(start),
    first_descent_step: firstDescentStep,
    odd_steps: oddSteps,
    even_steps: evenSteps,
    odd_step_density: total > 0 ? oddSteps / total : 0,
    even_step_density: total > 0 ? evenSteps / total : 0,
    compressed_odd_only_path: sequence.filter((v) => v % 2n !== 0n),
    reached_one: reachedOne,
    cycle_detected: cycleDetected,
    cycle_at: cycleAt,
    stopped_reason: stoppedReason,
  };
}

function parseInput(input: bigint | number | string): bigint | null {
  try {
    let n: bigint;
    if (typeof input === "bigint") {
      n = input;
    } else if (typeof input === "number") {
      if (!Number.isInteger(input) || !Number.isFinite(input)) return null;
      n = BigInt(input);
    } else {
      const s = String(input).trim();
      if (!/^\d+$/.test(s)) return null;
      n = BigInt(s);
    }
    return n > 0n ? n : null;
  } catch {
    return null;
  }
}

function invalidResult(): CollatzResult {
  return {
    start_number: 0n,
    full_sequence: [],
    steps_to_1: 0,
    peak_value: 0n,
    peak_ratio: 0,
    first_descent_step: null,
    odd_steps: 0,
    even_steps: 0,
    odd_step_density: 0,
    even_step_density: 0,
    compressed_odd_only_path: [],
    reached_one: false,
    cycle_detected: false,
    cycle_at: null,
    stopped_reason: "invalid_input",
  };
}
