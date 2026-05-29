/** Calculator-specific Collatz logic — educational page only, no engine writes. */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalcStep {
  step: number;
  value: bigint;
  parity: "odd" | "even";
  operation: string;
  nextValue: bigint;
}

export interface CalcResult {
  startNumber: bigint;
  steps: CalcStep[];
  totalSteps: number;         // including start (steps.length)
  stoppingTime: number;       // steps taken to reach 1
  highestPeak: bigint;
  oddSteps: number;
  evenSteps: number;
  oddPercent: number;
  evenPercent: number;
  finalValue: bigint;
  averageValue: number;
  reachedOne: boolean;
  maxStepsHit: boolean;
  // Numeric sequence for graph rendering (clamped to MAX_GRAPH_POINTS)
  graphPoints: { x: number; y: number }[];
  isShortcut: boolean;
}

export interface CustomRuleConfig {
  evenDivisor: number;
  oddMultiplier: number;
  oddAdder: number;
}

export const CLASSIC_PRESET: CustomRuleConfig = { evenDivisor: 2, oddMultiplier: 3, oddAdder: 1 };
export const SYRACUSE_PRESET: CustomRuleConfig = { evenDivisor: 2, oddMultiplier: 3, oddAdder: 1 };
export const KNUTH_PRESET: CustomRuleConfig = { evenDivisor: 2, oddMultiplier: 3, oddAdder: -1 };

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_GRAPH_POINTS = 500;
const SAFE_NUMBER_MAX = BigInt(Number.MAX_SAFE_INTEGER);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toGraphNumber(val: bigint): number {
  return val > SAFE_NUMBER_MAX ? Number.MAX_SAFE_INTEGER : Number(val);
}

function operationString(val: bigint, isOdd: boolean, shortcut: boolean): string {
  if (isOdd) {
    if (shortcut) return `(3n + 1) / 2 = (3 × ${val} + 1) / 2`;
    return `3n + 1 = 3 × ${val} + 1`;
  }
  return `n / 2 = ${val} / 2`;
}

// ─── Classic calculator ───────────────────────────────────────────────────────

export function runCalculator(
  inputStr: string,
  maxSteps: number,
  shortcutMode: boolean,
): CalcResult | { error: string } {
  const trimmed = inputStr.trim();
  if (!/^\d+$/.test(trimmed)) return { error: "Please enter a positive integer." };

  let start: bigint;
  try {
    start = BigInt(trimmed);
  } catch {
    return { error: "Value is too large to parse." };
  }
  if (start < 1n) return { error: "Please enter a positive integer greater than 0." };

  const steps: CalcStep[] = [];
  let n = start;
  let peakValue = n;
  let oddCount = 0;
  let evenCount = 0;
  let sum = toGraphNumber(n);
  let reachedOne = n === 1n;
  let maxStepsHit = false;

  // Add step 0 (start value)
  if (n === 1n) {
    steps.push({ step: 0, value: n, parity: "odd", operation: "Start", nextValue: n });
    return buildResult(start, steps, peakValue, oddCount, evenCount, sum, true, false, shortcutMode);
  }

  let stepIdx = 0;
  while (n !== 1n && stepIdx < maxSteps) {
    const isOdd = n % 2n !== 0n;
    const op = operationString(n, isOdd, shortcutMode);
    let next: bigint;

    if (isOdd) {
      next = shortcutMode ? (3n * n + 1n) / 2n : 3n * n + 1n;
      oddCount++;
    } else {
      next = n / 2n;
      evenCount++;
    }

    steps.push({
      step: stepIdx,
      value: n,
      parity: isOdd ? "odd" : "even",
      operation: op,
      nextValue: next,
    });

    n = next;
    if (n > peakValue) peakValue = n;
    sum += toGraphNumber(n);
    stepIdx++;

    if (n === 1n) {
      steps.push({ step: stepIdx, value: n, parity: "odd", operation: "Converged", nextValue: 1n });
      reachedOne = true;
      break;
    }
  }

  if (!reachedOne && n !== 1n) {
    maxStepsHit = true;
    if (steps.length < stepIdx + 1) {
      steps.push({ step: stepIdx, value: n, parity: n % 2n !== 0n ? "odd" : "even", operation: "Max steps reached", nextValue: n });
    }
  }

  return buildResult(start, steps, peakValue, oddCount, evenCount, sum, reachedOne, maxStepsHit, shortcutMode);
}

function buildResult(
  start: bigint,
  steps: CalcStep[],
  peakValue: bigint,
  oddCount: number,
  evenCount: number,
  sum: number,
  reachedOne: boolean,
  maxStepsHit: boolean,
  shortcutMode: boolean,
): CalcResult {
  const totalSteps = steps.length;
  const movingSteps = oddCount + evenCount;
  const avg = totalSteps > 0 ? sum / totalSteps : 0;

  // Build graph points with sampling
  const seqLen = steps.length;
  const sampleRate = seqLen > MAX_GRAPH_POINTS ? Math.ceil(seqLen / MAX_GRAPH_POINTS) : 1;
  const graphPoints: { x: number; y: number }[] = [];
  for (let i = 0; i < seqLen; i += sampleRate) {
    graphPoints.push({ x: steps[i].step, y: toGraphNumber(steps[i].value) });
  }
  // Always include the last point
  const last = steps[seqLen - 1];
  if (last && (graphPoints.length === 0 || graphPoints[graphPoints.length - 1].x !== last.step)) {
    graphPoints.push({ x: last.step, y: toGraphNumber(last.value) });
  }

  return {
    startNumber: start,
    steps,
    totalSteps,
    stoppingTime: movingSteps,
    highestPeak: peakValue,
    oddSteps: oddCount,
    evenSteps: evenCount,
    oddPercent: movingSteps > 0 ? (oddCount / movingSteps) * 100 : 0,
    evenPercent: movingSteps > 0 ? (evenCount / movingSteps) * 100 : 0,
    finalValue: steps[steps.length - 1]?.value ?? start,
    averageValue: avg,
    reachedOne,
    maxStepsHit,
    graphPoints,
    isShortcut: shortcutMode,
  };
}

// ─── Custom rule calculator ───────────────────────────────────────────────────

export interface CustomCalcResult {
  steps: number;
  reachedOne: boolean;
  maxStepsHit: boolean;
  peak: bigint;
  finalValue: bigint;
  graphPoints: { x: number; y: number }[];
  warning?: string;
}

export function runCustomCalculator(
  inputStr: string,
  maxSteps: number,
  cfg: CustomRuleConfig,
): CustomCalcResult | { error: string } {
  const trimmed = inputStr.trim();
  if (!/^\d+$/.test(trimmed)) return { error: "Please enter a positive integer." };

  let start: bigint;
  try {
    start = BigInt(trimmed);
  } catch {
    return { error: "Value is too large to parse." };
  }
  if (start < 1n) return { error: "Please enter a positive integer greater than 0." };

  const evenDiv = BigInt(Math.max(cfg.evenDivisor, 1));
  const oddMul = BigInt(cfg.oddMultiplier);
  const oddAdd = BigInt(cfg.oddAdder);

  let n = start;
  let peak = n;
  let stepCount = 0;
  let reachedOne = n === 1n;
  let maxStepsHit = false;
  const seqNums: number[] = [toGraphNumber(n)];

  while (n !== 1n && stepCount < maxSteps) {
    if (n % 2n === 0n) {
      n = n / evenDiv;
    } else {
      n = oddMul * n + oddAdd;
    }
    if (n > peak) peak = n;
    stepCount++;
    seqNums.push(toGraphNumber(n));

    if (n === 1n) { reachedOne = true; break; }
    // Prevent runaway for non-converging sequences
    if (n <= 0n) { maxStepsHit = true; break; }
  }

  if (!reachedOne && n !== 1n && !maxStepsHit) maxStepsHit = true;

  const sampleRate = seqNums.length > MAX_GRAPH_POINTS ? Math.ceil(seqNums.length / MAX_GRAPH_POINTS) : 1;
  const graphPoints: { x: number; y: number }[] = [];
  for (let i = 0; i < seqNums.length; i += sampleRate) {
    graphPoints.push({ x: i, y: seqNums[i] });
  }

  return {
    steps: stepCount,
    reachedOne,
    maxStepsHit,
    peak,
    finalValue: n,
    graphPoints,
    warning: maxStepsHit ? `Sequence did not reach 1 within ${maxSteps.toLocaleString()} steps.` : undefined,
  };
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function fmtBig(n: bigint): string {
  if (n > SAFE_NUMBER_MAX) return n.toLocaleString();
  return Number(n).toLocaleString("en-US");
}

export function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

export function fmtPct(n: number): string {
  return n.toFixed(1) + "%";
}
