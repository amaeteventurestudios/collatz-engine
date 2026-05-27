import { computeCollatzSummary } from "./engine";
import {
  getEngineState,
  insertBatchResults,
  readCommittedMaxN,
  updateEngineState,
  insertActivityLog,
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
 * updates engine state (including throughput metrics), writes
 * activity log entries, and returns.
 *
 * Resume behavior:
 * - Reads last_checked_number from Supabase
 * - Starts from last_checked_number + 1
 * - Updates state after the batch completes
 *
 * Runtime behavior:
 * - If started_at is empty, it sets started_at once
 * - It does not reset started_at on later batches
 *
 * Logging behavior:
 * - Inserts batch_started before computation
 * - Inserts batch_completed (with timing) after successful persistence
 * - Inserts batch_failed on any unhandled error
 * - Activity log failures are caught and warned — they never block computation
 */
export async function runAutonomousBatch(
  options: AutonomousRunnerOptions = {},
): Promise<{
  batchStart: number;
  batchEnd: number;
  numbersProcessed: number;
  durationMs: number;
  numbersPerSecond: number;
}> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const maxSteps = options.maxSteps;

  const state = await getEngineState();

  if (!state) {
    throw new Error("Engine state not found");
  }

  const batchStart = Number(state.last_checked_number) + 1;
  const batchEnd = batchStart + batchSize - 1;

  // ── Log: batch_started ────────────────────────────────────────────────────
  await insertActivityLog({
    event_type: "batch_started",
    message: `Batch started: n = ${batchStart.toLocaleString("en-US")} – ${batchEnd.toLocaleString("en-US")}`,
    batch_start: batchStart,
    batch_end: batchEnd,
    numbers_processed: batchSize,
  }).catch((err: unknown) => {
    console.warn("[Collatz Engine] batch_started log failed (non-fatal):", err);
  });

  const wallStart = Date.now();

  try {
    // ── Compute ───────────────────────────────────────────────────────────────
    const rows: CollatzResultRow[] = [];

    let highestPeak = Number(state.highest_peak ?? 0);
    let longestSteps = Number(state.longest_steps ?? 0);

    for (let n = batchStart; n <= batchEnd; n++) {
      const summary = computeCollatzSummary(n, { maxSteps });

      const peak = Number(summary.peak_value);
      const steps = summary.steps_to_1;

      rows.push({
        n,
        steps,
        peak,
        reached_one: summary.reached_one,
      });

      if (peak > highestPeak) highestPeak = peak;
      if (steps > longestSteps) longestSteps = steps;
    }

    // ── Persist results ────────────────────────────────────────────────────────
    await insertBatchResults(rows);

    // ── Verify inserted rows are visible before advancing state ────────────────
    // A read-back confirms the upsert is committed and readable. If the max
    // visible n is below batchEnd, state is NOT advanced and a failure event
    // is logged so the batch can be retried on the next iteration.
    const verifiedMaxN = await readCommittedMaxN(batchStart, batchEnd);
    if (verifiedMaxN < batchEnd) {
      const verifyMsg =
        `Batch insert verification failed: batch ${batchStart.toLocaleString("en-US")}` +
        `–${batchEnd.toLocaleString("en-US")}, ` +
        `highest visible n=${verifiedMaxN.toLocaleString("en-US")}. ` +
        `Engine state not advanced.`;
      await insertActivityLog({
        event_type: "batch_insert_verification_failed",
        message: verifyMsg,
        batch_start: batchStart,
        batch_end: batchEnd,
        metadata: { expected_max_n: batchEnd, confirmed_max_n: verifiedMaxN },
      }).catch((logErr: unknown) => {
        console.warn(
          "[Collatz Engine] batch_insert_verification_failed log failed (non-fatal):",
          logErr,
        );
      });
      throw new Error(verifyMsg);
    }

    const durationMs = Date.now() - wallStart;
    const numbersPerSecond =
      durationMs > 0 ? rows.length / (durationMs / 1000) : 0;
    const now = new Date().toISOString();

    // ── Update engine state ───────────────────────────────────────────────────
    await updateEngineState({
      started_at: state.started_at ?? now,
      last_checked_number: batchEnd,
      total_numbers_checked:
        Number(state.total_numbers_checked ?? 0) + rows.length,
      highest_peak: highestPeak,
      longest_steps: longestSteps,
      current_status: "running",
      // Phase 6 throughput fields
      last_batch_size: rows.length,
      last_batch_duration_ms: durationMs,
      numbers_per_second: numbersPerSecond,
      last_run_at: now,
      worker_heartbeat_at: now,
      last_error: null,
    });

    // ── Log: batch_completed ──────────────────────────────────────────────────
    await insertActivityLog({
      event_type: "batch_completed",
      message: `Batch completed: ${rows.length.toLocaleString("en-US")} numbers in ${durationMs}ms (${numbersPerSecond.toFixed(1)}/sec)`,
      batch_start: batchStart,
      batch_end: batchEnd,
      numbers_processed: rows.length,
      duration_ms: durationMs,
      numbers_per_second: numbersPerSecond,
      metadata: {
        highest_peak_in_batch: highestPeak,
        longest_steps_in_batch: longestSteps,
      },
    }).catch((err: unknown) => {
      console.warn("[Collatz Engine] batch_completed log failed (non-fatal):", err);
    });

    return {
      batchStart,
      batchEnd,
      numbersProcessed: rows.length,
      durationMs,
      numbersPerSecond,
    };
  } catch (err: unknown) {
    const durationMs = Date.now() - wallStart;
    const errorMessage =
      err instanceof Error ? err.message : String(err);

    // ── Update state with last_error ──────────────────────────────────────────
    await updateEngineState({
      worker_heartbeat_at: new Date().toISOString(),
      last_error: errorMessage,
    }).catch((stateErr: unknown) => {
      console.warn("[Collatz Engine] Failed to persist error state:", stateErr);
    });

    // ── Log: batch_failed ─────────────────────────────────────────────────────
    await insertActivityLog({
      event_type: "batch_failed",
      message: `Batch failed after ${durationMs}ms: ${errorMessage}`,
      batch_start: batchStart,
      batch_end: batchEnd,
      duration_ms: durationMs,
      metadata: { error: errorMessage },
    }).catch((logErr: unknown) => {
      console.warn("[Collatz Engine] batch_failed log failed (non-fatal):", logErr);
    });

    throw err;
  }
}
