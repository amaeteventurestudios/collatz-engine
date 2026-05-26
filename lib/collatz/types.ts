export type StoppedReason =
  | "reached_one"
  | "cycle_detected"
  | "max_steps_exceeded"
  | "invalid_input";

export interface CollatzResult {
  start_number: bigint;
  full_sequence: bigint[];
  steps_to_1: number;
  peak_value: bigint;
  peak_ratio: number;
  first_descent_step: number | null;
  odd_steps: number;
  even_steps: number;
  odd_step_density: number;
  even_step_density: number;
  compressed_odd_only_path: bigint[];
  reached_one: boolean;
  cycle_detected: boolean;
  cycle_at: number | null;
  stopped_reason: StoppedReason;
}

/** Lightweight variant of CollatzResult — no full_sequence or compressed_odd_only_path stored.
 *  Use this for batch processing where sequence storage is not needed. */
export interface CollatzSummary {
  start_number: bigint;
  steps_to_1: number;
  peak_value: bigint;
  peak_ratio: number;
  first_descent_step: number | null;
  odd_steps: number;
  even_steps: number;
  odd_step_density: number;
  even_step_density: number;
  reached_one: boolean;
  cycle_detected: boolean;
  cycle_at: number | null;
  stopped_reason: StoppedReason;
}

export interface CollatzOptions {
  maxSteps?: number;
}
