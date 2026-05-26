import type { CollatzOptions, CollatzResult, CollatzSummary, StoppedReason } from "./types";

const DEFAULT_MAX_STEPS = 10_000_000;

// ── Shared inner loop ──────────────────────────────────────────────────────

interface LoopResult {
  sequence: bigint[] | null;
  steps: number;
  peakValue: bigint;
  firstDescentStep: number | null;
  oddSteps: number;
  evenSteps: number;
  reachedOne: boolean;
  cycleDetected: boolean;
  cycleAt: number | null;
  stoppedReason: StoppedReason;
}

function runLoop(start: bigint, maxSteps: number, storeSequence: boolean): LoopResult {
  let n = start;
  const sequence = storeSequence ? [n] : null;
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
    if (sequence) sequence.push(n);

    if (n > peakValue) peakValue = n;
    if (firstDescentStep === null && n < start) firstDescentStep = step;

    if (n !== 1n) {
      if (seen.has(n)) {
        return {
          sequence,
          steps: step,
          peakValue,
          firstDescentStep,
          oddSteps,
          evenSteps,
          reachedOne: false,
          cycleDetected: true,
          cycleAt: seen.get(n)!,
          stoppedReason: "cycle_detected",
        };
      }
      seen.set(n, step);
    }
  }

  return {
    sequence,
    steps: step,
    peakValue,
    firstDescentStep,
    oddSteps,
    evenSteps,
    reachedOne: n === 1n,
    cycleDetected: false,
    cycleAt: null,
    stoppedReason: n === 1n ? "reached_one" : "max_steps_exceeded",
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export function computeCollatz(
  input: bigint | number | string,
  options: CollatzOptions = {},
): CollatzResult {
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
  const parsed = parseInput(input);
  if (parsed === null) return invalidResult();

  const loop = runLoop(parsed, maxSteps, true);
  const seq = loop.sequence!;
  const total = loop.steps;

  return {
    start_number: parsed,
    full_sequence: seq,
    steps_to_1: total,
    peak_value: loop.peakValue,
    peak_ratio: computeRatio(loop.peakValue, parsed, total),
    first_descent_step: loop.firstDescentStep,
    odd_steps: loop.oddSteps,
    even_steps: loop.evenSteps,
    odd_step_density: total > 0 ? loop.oddSteps / total : 0,
    even_step_density: total > 0 ? loop.evenSteps / total : 0,
    compressed_odd_only_path: seq.filter((v) => v % 2n !== 0n),
    reached_one: loop.reachedOne,
    cycle_detected: loop.cycleDetected,
    cycle_at: loop.cycleAt,
    stopped_reason: loop.stoppedReason,
  };
}

/** Memory-efficient variant — no full_sequence or compressed path stored.
 *  Recommended for batch processing. */
export function computeCollatzSummary(
  input: bigint | number | string,
  options: CollatzOptions = {},
): CollatzSummary {
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
  const parsed = parseInput(input);
  if (parsed === null) return invalidSummary();

  const loop = runLoop(parsed, maxSteps, false);
  const total = loop.steps;

  return {
    start_number: parsed,
    steps_to_1: total,
    peak_value: loop.peakValue,
    peak_ratio: computeRatio(loop.peakValue, parsed, total),
    first_descent_step: loop.firstDescentStep,
    odd_steps: loop.oddSteps,
    even_steps: loop.evenSteps,
    odd_step_density: total > 0 ? loop.oddSteps / total : 0,
    even_step_density: total > 0 ? loop.evenSteps / total : 0,
    reached_one: loop.reachedOne,
    cycle_detected: loop.cycleDetected,
    cycle_at: loop.cycleAt,
    stopped_reason: loop.stoppedReason,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function computeRatio(peakValue: bigint, start: bigint, steps: number): number {
  if (steps === 0 && start === peakValue) return 1;
  return Number(peakValue) / Number(start);
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

function invalidSummary(): CollatzSummary {
  return {
    start_number: 0n,
    steps_to_1: 0,
    peak_value: 0n,
    peak_ratio: 0,
    first_descent_step: null,
    odd_steps: 0,
    even_steps: 0,
    odd_step_density: 0,
    even_step_density: 0,
    reached_one: false,
    cycle_detected: false,
    cycle_at: null,
    stopped_reason: "invalid_input",
  };
}
