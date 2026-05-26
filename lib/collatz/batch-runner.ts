import type { BatchInput, BatchSummary, NearEscapeThresholds, TrajectorySample } from "./batch-types";
import {
  createEmptyRecords,
  updateRecords,
  getFinalRecords,
  getRecordNumbers,
  type RunningRecords,
} from "./batch-records";
import {
  DEFAULT_NEAR_ESCAPE_THRESHOLDS,
  evaluateNearEscape,
  buildNearEscapeCandidate,
} from "./near-escape";
import {
  DEFAULT_RESIDUE_MODULI,
  createResidueAccumulators,
  accumulateResidue,
  finalizeResidueStats,
} from "./residue-stats";

const DEFAULT_MAX_STEPS = 10_000_000;
const DEFAULT_SAMPLE_LIMIT = 50;

export function runBatch(input: BatchInput): BatchSummary {
  const {
    batch_start,
    batch_end,
    max_steps = DEFAULT_MAX_STEPS,
    sample_limit = DEFAULT_SAMPLE_LIMIT,
    near_escape_thresholds,
    residue_moduli = DEFAULT_RESIDUE_MODULI,
  } = input;

  if (
    !Number.isInteger(batch_start) ||
    !Number.isInteger(batch_end) ||
    batch_start < 1 ||
    batch_end < batch_start
  ) {
    return makeErrorSummary(input);
  }

  const thresholds: Required<NearEscapeThresholds> = {
    ...DEFAULT_NEAR_ESCAPE_THRESHOLDS,
    ...near_escape_thresholds,
  };

  const startTime = Date.now();

  let records: RunningRecords = createEmptyRecords();
  const residueAccs = createResidueAccumulators(residue_moduli);
  const pendingCandidates: ReturnType<typeof buildNearEscapeCandidate>[] = [];
  const samples: TrajectorySample[] = [];

  let sumSteps = 0;
  let count = 0;
  let errorsCount = 0;

  for (let i = batch_start; i <= batch_end; i++) {
    const item = computeInline(BigInt(i), max_steps);

    if (!item.reachedOne) {
      errorsCount++;
      continue;
    }

    const stats = {
      stepsTo1: item.stepsTo1,
      peakValue: item.peakValue,
      peakRatio: item.peakRatio,
      firstDescentStep: item.firstDescentStep,
      oddStepDensity: item.oddStepDensity,
    };

    const { records: updated } = updateRecords(i, stats, records);
    records = updated;

    sumSteps += item.stepsTo1;
    count++;

    const { isCandidate, flags } = evaluateNearEscape(
      {
        n: i,
        stepsTo1: item.stepsTo1,
        peakValue: item.peakValue,
        peakRatio: item.peakRatio,
        firstDescentStep: item.firstDescentStep,
        oddStepDensity: item.oddStepDensity,
      },
      thresholds,
    );

    if (isCandidate) {
      pendingCandidates.push(
        buildNearEscapeCandidate(
          {
            n: i,
            stepsTo1: item.stepsTo1,
            peakValue: item.peakValue,
            peakRatio: item.peakRatio,
            firstDescentStep: item.firstDescentStep,
            oddStepDensity: item.oddStepDensity,
          },
          flags,
        ),
      );
    }

    accumulateResidue(residueAccs, i, item.stepsTo1, item.peakRatio, item.firstDescentStep);
  }

  // Post-pass: tag near-escape candidates that hold a batch record
  const recordNums = getRecordNumbers(records);
  const near_escape_candidates = pendingCandidates.map((c) => {
    if (recordNums.has(c.start_number) && !c.flags.includes("batch_record")) {
      return { ...c, flags: [...c.flags, "batch_record" as const] };
    }
    return c;
  });

  // Build trajectory samples from record holders + top near-escape candidates
  const sampleSet = new Set<number>();
  for (const num of recordNums) {
    if (samples.length < sample_limit) {
      sampleSet.add(num);
    }
  }
  for (const c of near_escape_candidates) {
    if (sampleSet.size >= sample_limit) break;
    sampleSet.add(c.start_number);
  }
  for (const num of sampleSet) {
    const item = computeInline(BigInt(num), max_steps);
    const isRecord = recordNums.has(num);
    samples.push({
      start_number: num,
      reason: isRecord ? "record_breaker" : "near_escape",
      steps_to_1: item.stepsTo1,
      peak_value_string: item.peakValue.toString(),
      peak_ratio: item.peakRatio,
      first_descent_step: item.firstDescentStep,
      odd_step_density: item.oddStepDensity,
    });
  }

  const duration = Date.now() - startTime;

  return {
    batch_start,
    batch_end,
    numbers_tested: count,
    completed_at: new Date().toISOString(),
    duration_ms: duration,
    max_steps: records.max_steps?.value ?? 0,
    max_steps_number: records.max_steps?.number ?? 0,
    max_peak: records.max_peak ? records.max_peak.value.toString() : "0",
    max_peak_number: records.max_peak?.number ?? 0,
    max_peak_ratio: records.max_peak_ratio?.value ?? 0,
    max_peak_ratio_number: records.max_peak_ratio?.number ?? 0,
    longest_first_descent_delay: records.longest_first_descent?.value ?? null,
    longest_first_descent_number: records.longest_first_descent?.number ?? null,
    highest_odd_step_density: records.highest_odd_density?.value ?? 0,
    highest_odd_density_number: records.highest_odd_density?.number ?? 0,
    avg_steps: count > 0 ? sumSteps / count : 0,
    record_breakers: getFinalRecords(records),
    near_escape_candidates,
    residue_class_summary: finalizeResidueStats(residueAccs),
    trajectory_samples: samples,
    stopped_reason: "completed",
    errors_count: errorsCount,
  };
}

// ── Inline computation (no sequence stored) ────────────────────────────────

interface InlineResult {
  stepsTo1: number;
  peakValue: bigint;
  peakRatio: number;
  firstDescentStep: number | null;
  oddStepDensity: number;
  reachedOne: boolean;
}

function computeInline(start: bigint, maxSteps: number): InlineResult {
  let n = start;
  let peakValue = n;
  let steps = 0;
  let oddSteps = 0;
  let firstDescentStep: number | null = null;

  while (n !== 1n && steps < maxSteps) {
    if (n % 2n === 0n) {
      n = n / 2n;
    } else {
      n = 3n * n + 1n;
      oddSteps++;
    }
    steps++;
    if (n > peakValue) peakValue = n;
    if (firstDescentStep === null && n < start) firstDescentStep = steps;
  }

  return {
    stepsTo1: steps,
    peakValue,
    peakRatio: steps === 0 && start === peakValue ? 1 : Number(peakValue) / Number(start),
    firstDescentStep,
    oddStepDensity: steps > 0 ? oddSteps / steps : 0,
    reachedOne: n === 1n,
  };
}

function makeErrorSummary(input: BatchInput): BatchSummary {
  return {
    batch_start: input.batch_start,
    batch_end: input.batch_end,
    numbers_tested: 0,
    completed_at: new Date().toISOString(),
    duration_ms: 0,
    max_steps: 0,
    max_steps_number: 0,
    max_peak: "0",
    max_peak_number: 0,
    max_peak_ratio: 0,
    max_peak_ratio_number: 0,
    longest_first_descent_delay: null,
    longest_first_descent_number: null,
    highest_odd_step_density: 0,
    highest_odd_density_number: 0,
    avg_steps: 0,
    record_breakers: [],
    near_escape_candidates: [],
    residue_class_summary: [],
    trajectory_samples: [],
    stopped_reason: "error",
    errors_count: 1,
  };
}
