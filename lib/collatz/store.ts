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