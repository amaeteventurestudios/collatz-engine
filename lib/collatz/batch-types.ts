export type RecordType =
  | "longest_path"
  | "highest_peak"
  | "highest_peak_ratio"
  | "longest_first_descent"
  | "highest_odd_step_density";

export type NearEscapeFlag =
  | "high_peak_ratio"
  | "long_first_descent"
  | "high_odd_step_density"
  | "long_path"
  | "batch_record";

export interface NearEscapeThresholds {
  /** Flag if peak_value / start_number exceeds this. Default: 200. */
  min_peak_ratio: number;
  /** Flag if first descent step count exceeds this. Default: 70. */
  min_first_descent_step: number;
  /** Flag if odd_step_density exceeds this. Default: 0.47. */
  min_odd_step_density: number;
  /** Flag if steps_to_1 exceeds this. Default: 100. */
  min_steps_to_1: number;
}

export interface RecordBreaker {
  record_type: RecordType;
  start_number: number;
  /** Numeric value (accurate for all numbers within Number.MAX_SAFE_INTEGER). */
  value: number;
  /** String representation, used for display of very large peak values. */
  value_string: string;
}

export interface NearEscapeCandidate {
  start_number: number;
  steps_to_1: number;
  /** Peak value as a BigInt-safe string (locale formatted). */
  peak_value_string: string;
  peak_ratio: number;
  first_descent_step: number | null;
  odd_step_density: number;
  flags: NearEscapeFlag[];
}

export interface ResidueClassStats {
  modulus: number;
  residue: number;
  count: number;
  avg_steps: number;
  max_steps: number;
  avg_peak_ratio: number;
  max_peak_ratio: number;
  /** null if no numbers in this class had a measurable first descent. */
  avg_first_descent_delay: number | null;
}

export interface TrajectorySample {
  start_number: number;
  reason: "record_breaker" | "near_escape" | "demo";
  steps_to_1: number;
  /** Raw BigInt string (no locale formatting) for precision. */
  peak_value_string: string;
  peak_ratio: number;
  first_descent_step: number | null;
  odd_step_density: number;
}

export interface BatchInput {
  batch_start: number;
  batch_end: number;
  max_steps?: number;
  sample_limit?: number;
  near_escape_thresholds?: Partial<NearEscapeThresholds>;
  residue_moduli?: number[];
}

export interface BatchSummary {
  batch_start: number;
  batch_end: number;
  numbers_tested: number;
  completed_at: string;
  duration_ms: number;
  max_steps: number;
  max_steps_number: number;
  /** Raw BigInt string (digits only, no commas). */
  max_peak: string;
  max_peak_number: number;
  max_peak_ratio: number;
  max_peak_ratio_number: number;
  longest_first_descent_delay: number | null;
  longest_first_descent_number: number | null;
  highest_odd_step_density: number;
  highest_odd_density_number: number;
  avg_steps: number;
  record_breakers: RecordBreaker[];
  near_escape_candidates: NearEscapeCandidate[];
  residue_class_summary: ResidueClassStats[];
  trajectory_samples: TrajectorySample[];
  stopped_reason: "completed" | "error";
  errors_count: number;
}
