import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { jsonError, parseLimit } from "@/lib/collatz/api";
import { COLLATZ_CACHE_TTL_MS } from "@/lib/collatz/cache-policy";
import {
  getCachedRead,
  logReadCacheDiagnostic,
  makeReadCacheHeaders,
} from "@/lib/collatz/read-cache";
import type {
  AllTimeRecordCategory,
  CollatzAllTimeRecordRow,
  EngineState,
} from "@/lib/collatz/store";

export const dynamic = "force-dynamic";

const RECORD_FIELDS =
  "id, record_category, starting_number, steps, peak_value, rank_scope, source, source_batch_start, source_batch_end, discovered_at, created_at, updated_at";

const BACKFILL_STATE_FIELDS =
  "id, status, start_number, target_number, current_number, processed_count, top_n_limit, started_at, completed_at, last_heartbeat_at, updated_at";

const ENGINE_STATE_FIELDS =
  "id, started_at, last_checked_number, current_number, total_numbers_checked, highest_peak, longest_steps, current_status, updated_at, last_batch_size, last_batch_duration_ms, numbers_per_second, last_run_at, worker_heartbeat_at, last_error";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !key) {
    throw new Error("Supabase service role is not configured.");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

function coerceRecord(row: Record<string, unknown>): CollatzAllTimeRecordRow {
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

async function readEngineState(client: SupabaseClient): Promise<EngineState | null> {
  const { data, error } = await client
    .from("collatz_engine_state")
    .select(ENGINE_STATE_FIELDS)
    .eq("id", "main")
    .single();

  if (error) {
    throw new Error(`Unable to read engine state: ${error.message}`);
  }

  const state = (data ?? null) as EngineState | null;
  if (!state) return null;
  return {
    ...state,
    last_error: state.last_error
      ? "Operational error reported. Details are available to administrators."
      : null,
  };
}

async function readRecords(
  client: SupabaseClient,
  category: AllTimeRecordCategory,
  limit: number,
): Promise<CollatzAllTimeRecordRow[]> {
  const orderColumn = category === "longest_trajectory" ? "steps" : "peak_value";
  const { data, error } = await client
    .from("collatz_all_time_records")
    .select(RECORD_FIELDS)
    .eq("record_category", category)
    .order(orderColumn, { ascending: false })
    .order("starting_number", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Unable to read ${category} records: ${error.message}`);
  }

  return ((data ?? []) as Record<string, unknown>[]).map(coerceRecord);
}

async function readBackfillState(client: SupabaseClient) {
  const { data, error } = await client
    .from("collatz_record_backfill_state")
    .select(BACKFILL_STATE_FIELDS)
    .eq("id", "main")
    .maybeSingle();

  if (error) return null;
  return data ?? null;
}

async function readAllTimeRecordsPayload(limit: number) {
  const client = getServiceClient();
  const [engineState, longestRecords, peakRecords, backfillState] = await Promise.all([
    readEngineState(client),
    readRecords(client, "longest_trajectory", limit),
    readRecords(client, "highest_peak", limit),
    readBackfillState(client),
  ]);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    engineState,
    longestRecords,
    peakRecords,
    backfillState,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { limit, error } = parseLimit(searchParams.get("limit"), 10, 100);
  if (error) return jsonError(error, 400);

  const startedAt = Date.now();
  const ttlMs = COLLATZ_CACHE_TTL_MS.PUBLIC_ALL_TIME_RECORDS;

  try {
    const { data, meta } = await getCachedRead(
      `collatz:all-time-records:v1:limit=${limit}`,
      ttlMs,
      () => readAllTimeRecordsPayload(limit),
    );
    logReadCacheDiagnostic("api/collatz/all-time-records", meta, startedAt, data);
    return Response.json(data, {
      headers: makeReadCacheHeaders(meta, { ttlMs, visibility: "public" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to read all-time records.";
    return jsonError(message, 500);
  }
}
