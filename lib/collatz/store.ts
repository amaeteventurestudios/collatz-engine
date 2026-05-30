import { supabase } from "@/lib/supabase";

export interface EngineState {
  id: string;
  started_at: string | null;
  last_checked_number: number;
  current_number: number;
  total_numbers_checked: number;
  highest_peak: number;
  longest_steps: number;
  current_status: string;
  updated_at: string;
  // Phase 6 — throughput tracking (added by supabase/phase-6-activity-logs.sql)
  last_batch_size?: number;
  last_batch_duration_ms?: number;
  numbers_per_second?: number;
  last_run_at?: string | null;
  worker_heartbeat_at?: string | null;
  last_error?: string | null;
}

export interface ActivityLogRow {
  id?: string;
  event_type: string;
  message: string;
  batch_start?: number | null;
  batch_end?: number | null;
  numbers_processed?: number | null;
  duration_ms?: number | null;
  numbers_per_second?: number | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface CollatzResultRow {
  n: number;
  steps: number;
  peak: number;
  reached_one?: boolean;
  created_at?: string | null;
}

export type AllTimeRecordCategory = "longest_trajectory" | "highest_peak";

export interface CollatzAllTimeRecordRow {
  id?: string;
  record_category: AllTimeRecordCategory;
  starting_number: number;
  steps: number;
  peak_value: number;
  rank_scope?: string;
  source?: string;
  source_batch_start?: number | null;
  source_batch_end?: number | null;
  discovered_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const ENGINE_ID = "main";
const ALL_TIME_RECORD_LIMIT = 1000;
const reportedMissingAllTimeRecordCategories = new Set<AllTimeRecordCategory>();
const reportedPreserveFailures = new Set<AllTimeRecordCategory>();

/**
 * Fetch persistent engine state
 */
export async function getEngineState(): Promise<EngineState | null> {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await supabase
    .from("collatz_engine_state")
    .select("*")
    .eq("id", ENGINE_ID)
    .single();

  if (error) {
    console.error("[Collatz Engine] Failed to fetch engine state", error);
    return null;
  }

  return data;
}

/**
 * Update engine state
 */
export async function updateEngineState(
  updates: Partial<EngineState>,
): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const { error } = await supabase
    .from("collatz_engine_state")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ENGINE_ID);

  if (error) {
    console.error("[Collatz Engine] Failed to update engine state", error);
    throw error;
  }
}

/**
 * Start engine
 */
export async function startEngine(): Promise<void> {
  await updateEngineState({
    current_status: "running",
    started_at: new Date().toISOString(),
  });
}

/**
 * Stop engine
 */
export async function stopEngine(): Promise<void> {
  await updateEngineState({
    current_status: "stopped",
  });
}

/**
 * Pause engine — worker respects this on its next iteration
 */
export async function pauseEngine(): Promise<void> {
  await updateEngineState({
    current_status: "paused",
    worker_heartbeat_at: new Date().toISOString(),
  });
}

/**
 * Resume engine from paused state
 */
export async function resumeEngine(): Promise<void> {
  await updateEngineState({
    current_status: "running",
    worker_heartbeat_at: new Date().toISOString(),
    last_error: null,
  });
}

/**
 * Insert one Collatz result
 */
export async function insertCollatzResult(
  result: CollatzResultRow,
): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const { error } = await supabase
    .from("collatz_results")
    .upsert({
      n: result.n,
      steps: result.steps,
      peak: result.peak,
      reached_one: result.reached_one ?? true,
    });

  if (error) {
    console.error("[Collatz Engine] Failed to insert result", error);
    throw error;
  }
}

/**
 * Batch insert results
 */
export async function insertBatchResults(
  results: CollatzResultRow[],
): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const payload = results.map((r) => ({
    n: r.n,
    steps: r.steps,
    peak: r.peak,
    reached_one: r.reached_one ?? true,
  }));

  const { error } = await supabase
    .from("collatz_results")
    .upsert(payload);

  if (error) {
    console.error("[Collatz Engine] Failed batch insert", error);
    throw error;
  }
}

// ─── Live dashboard read helpers ────────────────────────────────────────────

/**
 * Top N rows by trajectory length (longest paths first).
 * Uses the steps column index for fast ordered scans.
 */
export async function getTopLongestTrajectories(
  limit = 10,
): Promise<CollatzResultRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("collatz_results")
    .select("n, steps, peak, reached_one, created_at")
    .order("steps", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[Collatz Engine] getTopLongestTrajectories failed", error);
    return [];
  }
  return (data ?? []) as CollatzResultRow[];
}

/**
 * Top N rows by peak value (highest peaks first).
 * Uses the peak column index for fast ordered scans.
 */
export async function getTopHighestPeaks(limit = 10): Promise<CollatzResultRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("collatz_results")
    .select("n, steps, peak, reached_one, created_at")
    .order("peak", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[Collatz Engine] getTopHighestPeaks failed", error);
    return [];
  }
  return (data ?? []) as CollatzResultRow[];
}

function coerceAllTimeRecord(row: Record<string, unknown>): CollatzAllTimeRecordRow {
  return {
    id: typeof row.id === "string" ? row.id : undefined,
    record_category: row.record_category as AllTimeRecordCategory,
    starting_number: Number(row.starting_number),
    steps: Number(row.steps),
    peak_value: Number(row.peak_value),
    rank_scope: typeof row.rank_scope === "string" ? row.rank_scope : undefined,
    source: typeof row.source === "string" ? row.source : undefined,
    source_batch_start:
      row.source_batch_start == null ? null : Number(row.source_batch_start),
    source_batch_end:
      row.source_batch_end == null ? null : Number(row.source_batch_end),
    discovered_at: typeof row.discovered_at === "string" ? row.discovered_at : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

/**
 * Permanent all-time records by category. Unlike collatz_results, these rows
 * are not part of the retained recent buffer.
 */
export async function getAllTimeRecords(
  category: AllTimeRecordCategory,
  limit = 10,
): Promise<CollatzAllTimeRecordRow[]> {
  if (!supabase) return [];

  const orderColumn = category === "longest_trajectory" ? "steps" : "peak_value";
  const { data, error } = await supabase
    .from("collatz_all_time_records")
    .select(
      "id, record_category, starting_number, steps, peak_value, rank_scope, source, source_batch_start, source_batch_end, discovered_at, created_at, updated_at",
    )
    .eq("record_category", category)
    .order(orderColumn, { ascending: false })
    .order("starting_number", { ascending: true })
    .limit(limit);

  if (error) {
    const maybeCode = "code" in error ? error.code : undefined;
    if (maybeCode === "PGRST205") {
      if (!reportedMissingAllTimeRecordCategories.has(category)) {
        reportedMissingAllTimeRecordCategories.add(category);
        console.warn(
          `[Collatz Engine] collatz_all_time_records is not available yet; run supabase/phase-3g-all-time-records.sql to enable permanent ${category} records.`,
        );
      }
      return [];
    }
    console.error(`[Collatz Engine] getAllTimeRecords(${category}) failed`, error);
    return [];
  }

  return ((data ?? []) as Record<string, unknown>[]).map(coerceAllTimeRecord);
}

function topRecordCandidates(
  rows: CollatzResultRow[],
  category: AllTimeRecordCategory,
): CollatzResultRow[] {
  const sorted = [...rows].sort((a, b) => {
    const diff =
      category === "longest_trajectory"
        ? b.steps - a.steps
        : b.peak - a.peak;
    return diff !== 0 ? diff : a.n - b.n;
  });
  return sorted.slice(0, ALL_TIME_RECORD_LIMIT);
}

/**
 * Preserve future all-time leaderboard candidates outside the retained buffer.
 * This is best-effort and intentionally independent of engine state progression.
 */
export async function preserveAllTimeRecordCandidates(
  rows: CollatzResultRow[],
  batchStart?: number,
  batchEnd?: number,
): Promise<void> {
  if (!supabase || rows.length === 0) return;

  const preserveCategory = async (category: AllTimeRecordCategory) => {
    const candidates = topRecordCandidates(rows, category).map((row) => ({
      starting_number: row.n,
      steps: row.steps,
      peak_value: row.peak,
    }));

    if (candidates.length === 0) return;

    const { error } = await supabase.rpc(
      "preserve_collatz_all_time_record_candidates",
      {
        p_record_category: category,
        p_candidates: candidates,
        p_source: "live_worker",
        p_source_batch_start: batchStart ?? null,
        p_source_batch_end: batchEnd ?? null,
        p_keep: ALL_TIME_RECORD_LIMIT,
      },
    );

    if (error) {
      if (!reportedPreserveFailures.has(category)) {
        reportedPreserveFailures.add(category);
        console.warn(
          `[Collatz Engine] preserveAllTimeRecordCandidates(${category}) failed (non-fatal):`,
          error,
        );
      }
    }
  };

  await Promise.all([
    preserveCategory("longest_trajectory"),
    preserveCategory("highest_peak"),
  ]);
}

/**
 * A representative sample of results ordered by n ascending.
 * Used for heatmap / pattern views. Limit to avoid large payloads.
 */
export async function getSampleResults(limit = 500): Promise<CollatzResultRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("collatz_results")
    .select("n, steps, peak, reached_one")
    .order("n", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[Collatz Engine] getSampleResults failed", error);
    return [];
  }
  return (data ?? []) as CollatzResultRow[];
}

/**
 * Latest N verified results by n, returned in ascending order for charting.
 */
export async function getLatestResults(limit = 500): Promise<CollatzResultRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("collatz_results")
    .select("n, steps, peak, reached_one")
    .order("n", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[Collatz Engine] getLatestResults failed", error);
    return [];
  }
  return [...((data ?? []) as CollatzResultRow[])].sort((a, b) => a.n - b.n);
}

// ─── Activity logs ────────────────────────────────────────────────────────────

/**
 * Insert one activity log entry.
 * Throws on Supabase error so callers can catch and continue.
 * Returns silently when Supabase is not configured.
 */
export async function insertActivityLog(
  input: Omit<ActivityLogRow, "id" | "created_at">,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("collatz_activity_logs").insert({
    event_type: input.event_type,
    message: input.message,
    batch_start: input.batch_start ?? null,
    batch_end: input.batch_end ?? null,
    numbers_processed: input.numbers_processed ?? null,
    duration_ms: input.duration_ms ?? null,
    numbers_per_second: input.numbers_per_second ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) {
    console.error("[Collatz Engine] Failed to insert activity log", error);
    throw error;
  }
}

/**
 * Fetch the most recent activity log entries, newest first.
 */
export async function getRecentActivityLogs(limit = 20): Promise<ActivityLogRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("collatz_activity_logs")
    .select(
      "id, event_type, message, batch_start, batch_end, numbers_processed, duration_ms, numbers_per_second, metadata, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[Collatz Engine] getRecentActivityLogs failed", error);
    return [];
  }
  return (data ?? []) as ActivityLogRow[];
}

/**
 * Read the highest committed n within [rangeStart, rangeEnd].
 *
 * Used by the autonomous runner to verify that a batch upsert is visible
 * to subsequent reads before the engine state counter is advanced.
 * Returns 0 if no rows exist in the range or Supabase is not configured.
 */
export async function readCommittedMaxN(
  rangeStart: number,
  rangeEnd: number,
): Promise<number> {
  if (!supabase) return 0;
  const { data, error } = await supabase
    .from("collatz_results")
    .select("n")
    .gte("n", rangeStart)
    .lte("n", rangeEnd)
    .order("n", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return 0;
  return (data[0] as { n: number }).n;
}

/**
 * Fetch batch_completed activity log entries whose batch_start falls within
 * [batchStartFrom, batchEndTo]. Used by the incident repair script to
 * inspect the exact logs around a known incident range.
 *
 * Returns entries sorted ascending by batch_start, then batch_end.
 */
export async function getBatchCompletedLogsInRange(
  batchStartFrom: number,
  batchEndTo: number,
  limit = 500,
): Promise<ActivityLogRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("collatz_activity_logs")
    .select(
      "id, event_type, message, batch_start, batch_end, numbers_processed, duration_ms, numbers_per_second, metadata, created_at",
    )
    .eq("event_type", "batch_completed")
    .gte("batch_start", batchStartFrom)
    .lte("batch_start", batchEndTo)
    .order("batch_start", { ascending: true })
    .order("batch_end", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[Collatz Engine] getBatchCompletedLogsInRange failed", error);
    return [];
  }
  return (data ?? []) as ActivityLogRow[];
}

/**
 * Fetch all activity log entries of a given event_type, newest first.
 * Used by the verifier to find documented incident repairs.
 */
export async function getActivityLogsByEventType(
  eventType: string,
  limit = 50,
): Promise<ActivityLogRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("collatz_activity_logs")
    .select(
      "id, event_type, message, batch_start, batch_end, numbers_processed, duration_ms, numbers_per_second, metadata, created_at",
    )
    .eq("event_type", eventType)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error(`[Collatz Engine] getActivityLogsByEventType(${eventType}) failed`, error);
    return [];
  }
  return (data ?? []) as ActivityLogRow[];
}

/**
 * Convenience wrapper to update throughput-tracking columns on engine state.
 */
export async function updateThroughputState(updates: {
  last_batch_size?: number;
  last_batch_duration_ms?: number;
  numbers_per_second?: number;
  last_run_at?: string | null;
  worker_heartbeat_at?: string | null;
  last_error?: string | null;
}): Promise<void> {
  return updateEngineState(updates);
}
