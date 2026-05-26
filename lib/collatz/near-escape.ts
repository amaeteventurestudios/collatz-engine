import type { NearEscapeCandidate, NearEscapeFlag, NearEscapeThresholds } from "./batch-types";

export const DEFAULT_NEAR_ESCAPE_THRESHOLDS: Required<NearEscapeThresholds> = {
  min_peak_ratio: 200,
  min_first_descent_step: 70,
  min_odd_step_density: 0.47,
  min_steps_to_1: 100,
};

interface ItemSummary {
  n: number;
  stepsTo1: number;
  peakValue: bigint;
  peakRatio: number;
  firstDescentStep: number | null;
  oddStepDensity: number;
}

export function evaluateNearEscape(
  item: ItemSummary,
  thresholds: Required<NearEscapeThresholds>,
): { isCandidate: boolean; flags: NearEscapeFlag[] } {
  const flags: NearEscapeFlag[] = [];

  if (item.peakRatio >= thresholds.min_peak_ratio) {
    flags.push("high_peak_ratio");
  }
  if (
    item.firstDescentStep !== null &&
    item.firstDescentStep >= thresholds.min_first_descent_step
  ) {
    flags.push("long_first_descent");
  }
  if (item.oddStepDensity >= thresholds.min_odd_step_density) {
    flags.push("high_odd_step_density");
  }
  if (item.stepsTo1 >= thresholds.min_steps_to_1) {
    flags.push("long_path");
  }

  return { isCandidate: flags.length > 0, flags };
}

export function buildNearEscapeCandidate(
  item: ItemSummary,
  flags: NearEscapeFlag[],
): NearEscapeCandidate {
  return {
    start_number: item.n,
    steps_to_1: item.stepsTo1,
    peak_value_string: item.peakValue.toLocaleString("en-US"),
    peak_ratio: item.peakRatio,
    first_descent_step: item.firstDescentStep,
    odd_step_density: item.oddStepDensity,
    flags,
  };
}
