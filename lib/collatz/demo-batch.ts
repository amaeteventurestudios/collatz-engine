import { runBatch } from "./batch-runner";
import type { BatchSummary } from "./batch-types";

export const DEMO_BATCH_START = 1;
export const DEMO_BATCH_END = 1_000;

let _cache: BatchSummary | null = null;

/** Returns the pre-computed demo batch summary for range 1–1,000.
 *  Result is cached after the first call (module-level singleton). */
export function getDemoBatch(): BatchSummary {
  if (!_cache) {
    _cache = runBatch({
      batch_start: DEMO_BATCH_START,
      batch_end: DEMO_BATCH_END,
    });
  }
  return _cache;
}
