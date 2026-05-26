import { computeCollatzSummary } from "./engine";
import {
  getEngineState,
  insertBatchResults,
  updateEngineState,
  type CollatzResultRow,
} from "./store";

export interface AutonomousRunnerOptions {
  batchSize?: number;
  maxSteps?: number;
}

const DEFAULT_BATCH_SIZE = 100;

/**
 * Runs one persistent autonomous batch.
 *
 * This processes the next batch, writes results to Supabase,
 * updates engine state, and exits.
 *
 * Resume behavior:
 * - Reads last_checked_number from Supabase
 * - Starts from last_checked_number + 1
 * - Updates state after the batch completes
 *
 * Runtime behavior:
 * - If started_at is empty, it sets started_at once
 * - It does not reset started_at on later batches
 */
export async function runAutonomousBatch(
  options: AutonomousRunnerOptions = {},
): Promise<{
  batchStart: number;
  batchEnd: number;
  numbersProcessed: number;
}> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const maxSteps = options.maxSteps;

  const state = await getEngineState();

  if (!state) {
    throw new Error("Engine state not found");
  }

  const batchStart = Number(state.last_checked_number) + 1;
  const batchEnd = batchStart + batchSize - 1;

  const rows: CollatzResultRow[] = [];

  let highestPeak = Number(state.highest_peak ?? 0);
  let longestSteps = Number(state.longest_steps ?? 0);

  for (let n = batchStart; n <= batchEnd; n++) {
    const summary = computeCollatzSummary(n, {
      maxSteps,
    });

    const peak = Number(summary.peak_value);
    const steps = summary.steps_to_1;

    rows.push({
      n,
      steps,
      peak,
      reached_one: summary.reached_one,
    });

    if (peak > highestPeak) {
      highestPeak = peak;
    }

    if (steps > longestSteps) {
      longestSteps = steps;
    }
  }

  await insertBatchResults(rows);

  await updateEngineState({
    started_at: state.started_at ?? new Date().toISOString(),
    last_checked_number: batchEnd,
    total_numbers_checked: Number(state.total_numbers_checked ?? 0) + rows.length,
    highest_peak: highestPeak,
    longest_steps: longestSteps,
    current_status: "running",
  });

  return {
    batchStart,
    batchEnd,
    numbersProcessed: rows.length,
  };
}