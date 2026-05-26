import type { RecordBreaker, RecordType } from "./batch-types";

export interface RunningRecords {
  max_steps: { value: number; number: number } | null;
  max_peak: { value: bigint; number: number } | null;
  max_peak_ratio: { value: number; number: number } | null;
  longest_first_descent: { value: number; number: number } | null;
  highest_odd_density: { value: number; number: number } | null;
}

export interface ItemStats {
  stepsTo1: number;
  peakValue: bigint;
  peakRatio: number;
  firstDescentStep: number | null;
  oddStepDensity: number;
}

export function createEmptyRecords(): RunningRecords {
  return {
    max_steps: null,
    max_peak: null,
    max_peak_ratio: null,
    longest_first_descent: null,
    highest_odd_density: null,
  };
}

/** Update running records. Returns the updated records and whether n set any new record
 *  (beating a previously established record, not just initializing). */
export function updateRecords(
  n: number,
  stats: ItemStats,
  current: RunningRecords,
): { records: RunningRecords; isNewRecord: boolean } {
  let isNewRecord = false;
  const next: RunningRecords = { ...current };

  if (!next.max_steps || stats.stepsTo1 > next.max_steps.value) {
    if (next.max_steps !== null) isNewRecord = true;
    next.max_steps = { value: stats.stepsTo1, number: n };
  }

  if (!next.max_peak || stats.peakValue > next.max_peak.value) {
    if (next.max_peak !== null) isNewRecord = true;
    next.max_peak = { value: stats.peakValue, number: n };
  }

  if (!next.max_peak_ratio || stats.peakRatio > next.max_peak_ratio.value) {
    if (next.max_peak_ratio !== null) isNewRecord = true;
    next.max_peak_ratio = { value: stats.peakRatio, number: n };
  }

  if (
    stats.firstDescentStep !== null &&
    (!next.longest_first_descent || stats.firstDescentStep > next.longest_first_descent.value)
  ) {
    if (next.longest_first_descent !== null) isNewRecord = true;
    next.longest_first_descent = { value: stats.firstDescentStep, number: n };
  }

  if (!next.highest_odd_density || stats.oddStepDensity > next.highest_odd_density.value) {
    if (next.highest_odd_density !== null) isNewRecord = true;
    next.highest_odd_density = { value: stats.oddStepDensity, number: n };
  }

  return { records: next, isNewRecord };
}

/** Emit one RecordBreaker entry per record type using the final record holders. */
export function getFinalRecords(records: RunningRecords): RecordBreaker[] {
  const breakers: RecordBreaker[] = [];

  if (records.max_steps) {
    breakers.push(makeBreaker("longest_path", records.max_steps.number, records.max_steps.value));
  }
  if (records.max_peak) {
    const v = Number(records.max_peak.value);
    breakers.push({
      record_type: "highest_peak",
      start_number: records.max_peak.number,
      value: v,
      value_string: records.max_peak.value.toString(),
    });
  }
  if (records.max_peak_ratio) {
    breakers.push(
      makeBreaker("highest_peak_ratio", records.max_peak_ratio.number, records.max_peak_ratio.value),
    );
  }
  if (records.longest_first_descent) {
    breakers.push(
      makeBreaker(
        "longest_first_descent",
        records.longest_first_descent.number,
        records.longest_first_descent.value,
      ),
    );
  }
  if (records.highest_odd_density) {
    breakers.push(
      makeBreaker(
        "highest_odd_step_density",
        records.highest_odd_density.number,
        records.highest_odd_density.value,
      ),
    );
  }

  return breakers;
}

/** Set of start_numbers that hold a batch record (used for near-escape flagging). */
export function getRecordNumbers(records: RunningRecords): Set<number> {
  return new Set(
    [
      records.max_steps?.number,
      records.max_peak?.number,
      records.max_peak_ratio?.number,
      records.longest_first_descent?.number,
      records.highest_odd_density?.number,
    ].filter((v): v is number => v !== undefined),
  );
}

function makeBreaker(type: RecordType, n: number, value: number): RecordBreaker {
  return {
    record_type: type,
    start_number: n,
    value,
    value_string: value.toLocaleString("en-US"),
  };
}
