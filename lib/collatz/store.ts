import { supabase } from "@/lib/supabase";

export interface EngineState {
  id: string;
  started_at: string | null;
  last_checked_number: number;
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
}

const ENGINE_ID = "main";

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
    .select("n, steps, peak, reached_one")
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
    .select("n, steps, peak, reached_one")
    .order("peak", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[Collatz Engine] getTopHighestPeaks failed", error);
    return [];
  }
  return (data ?? []) as CollatzResultRow[];
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
