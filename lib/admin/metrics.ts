import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { EngineAdminState, ActivityLogEntry, RuntimeConfig, WorkerLockState } from "./types";

const STRUCTURED_PLACEHOLDER = "[object Object]";
const MAX_ACTIVITY_MESSAGE_LENGTH = 700;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function truncateMessage(value: string): string {
  return value.length > MAX_ACTIVITY_MESSAGE_LENGTH
    ? `${value.slice(0, MAX_ACTIVITY_MESSAGE_LENGTH - 1)}…`
    : value;
}

function stringifyActivityValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed && trimmed !== STRUCTURED_PLACEHOLDER ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Error) return value.message || value.name;
  if (typeof value === "bigint") return value.toString();

  try {
    const json = JSON.stringify(
      value,
      (_key, nested) => (typeof nested === "bigint" ? nested.toString() : nested),
    );
    return json && json !== "{}" ? json : null;
  } catch {
    return "Structured event details could not be serialized.";
  }
}

function metadataActivityDetail(metadata: unknown): string | null {
  if (!isRecord(metadata)) return null;

  for (const key of ["error_message", "error", "message", "detail", "details", "reason"]) {
    const formatted = stringifyActivityValue(metadata[key]);
    if (formatted) return formatted;
  }

  return stringifyActivityValue(metadata);
}

export function formatActivityLogMessage(message: unknown, metadata?: unknown): string {
  const raw = stringifyActivityValue(message);
  const detail = metadataActivityDetail(metadata);

  if (raw) {
    return truncateMessage(
      raw.replaceAll(
        STRUCTURED_PLACEHOLDER,
        detail ?? "structured event details",
      ),
    );
  }

  return truncateMessage(detail ?? "Structured event details recorded.");
}

export async function getEngineAdminState(): Promise<{
  data: EngineAdminState | null;
  error: string | null;
  connected: boolean;
  lastSuccessfulRead: string | null;
}> {
  const client = getServiceClient() ?? getAnonClient();
  if (!client) {
    return {
      data: null,
      error: "Supabase not configured",
      connected: false,
      lastSuccessfulRead: null,
    };
  }

  try {
    const { data, error } = await client
      .from("collatz_engine_state")
      .select("*")
      .eq("id", "main")
      .single();

    if (error) {
      return {
        data: null,
        error: error.message,
        connected: false,
        lastSuccessfulRead: null,
      };
    }

    const state = data as Record<string, unknown>;
    const n = (v: unknown): number | null => {
      const p = typeof v === "number" ? v : Number(v);
      return Number.isFinite(p) ? p : null;
    };

    return {
      data: {
        // current_number is the number the worker is currently computing;
        // last_checked_number is the last fully-completed number.
        // They are different columns. If current_number is absent (old schema),
        // null is returned so the watchdog shows "unknown" rather than "critical".
        currentNumber: n(state.current_number) ?? null,
        lastProcessed: n(state.last_checked_number),
        totalChecked: n(state.total_numbers_checked),
        status: (state.current_status as string) ?? null,
        throughputPerSecond: n(state.numbers_per_second),
        lastHeartbeat: (state.worker_heartbeat_at as string) ?? null,
        workersActive: state.current_status === "running" ? 1 : 0,
        startedAt: (state.started_at as string) ?? null,
        lastError: (state.last_error as string) ?? null,
        highestPeak: n(state.highest_peak),
        longestSteps: n(state.longest_steps),
      },
      error: null,
      connected: true,
      lastSuccessfulRead: new Date().toISOString(),
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
      connected: false,
      lastSuccessfulRead: null,
    };
  }
}

export async function getRecentActivityLogs(limit = 20): Promise<{
  data: ActivityLogEntry[];
  error: string | null;
}> {
  const client = getServiceClient() ?? getAnonClient();
  if (!client) return { data: [], error: "Supabase not configured" };

  try {
    const { data, error } = await client
      .from("collatz_activity_logs")
      .select("id,event_type,message,created_at,numbers_processed,numbers_per_second,metadata")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { data: [], error: error.message };

    return {
      data: ((data ?? []) as ActivityLogEntry[]).map((row) => ({
        id: row.id,
        event_type: row.event_type ?? "unknown",
        message: formatActivityLogMessage(row.message, row.metadata),
        created_at: row.created_at ?? new Date().toISOString(),
        numbers_processed: row.numbers_processed ?? null,
        numbers_per_second: row.numbers_per_second ?? null,
        metadata: row.metadata ?? null,
      })),
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function getThroughputHistory(limit = 30): Promise<{
  data: Array<{ ts: string; nps: number }>;
  error: string | null;
}> {
  const client = getServiceClient() ?? getAnonClient();
  if (!client) return { data: [], error: "Supabase not configured" };

  try {
    const { data, error } = await client
      .from("collatz_activity_logs")
      .select("created_at,numbers_per_second")
      .not("numbers_per_second", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { data: [], error: error.message };

    return {
      data: ((data ?? []) as Array<{ created_at: string; numbers_per_second: unknown }>)
        .filter((r) => r.numbers_per_second != null)
        .map((r) => ({
          ts: r.created_at,
          nps: Number(r.numbers_per_second),
        }))
        .reverse(),
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function getWorkerLockState(): Promise<{
  data: WorkerLockState | null;
  tableExists: boolean;
  error: string | null;
}> {
  const client = getServiceClient() ?? getAnonClient();
  if (!client) return { data: null, tableExists: false, error: "Supabase not configured" };

  try {
    // Most recent active lock, then most recent overall (to show last-held info)
    const { data, error } = await client
      .from("collatz_worker_lock")
      .select("*")
      .eq("lock_name", "primary")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      // Table may not exist yet (migration not run)
      if (error.message?.includes("does not exist") || error.code === "42P01") {
        return { data: null, tableExists: false, error: null };
      }
      return { data: null, tableExists: true, error: error.message };
    }

    if (!data) {
      return { data: null, tableExists: true, error: null };
    }

    const r = data as Record<string, unknown>;
    const expiresAt = r.expires_at as string;
    const secondsUntilExpiry = Math.floor(
      (new Date(expiresAt).getTime() - Date.now()) / 1000,
    );

    return {
      data: {
        id: r.id as string,
        lockName: r.lock_name as string,
        workerInstanceId: r.worker_instance_id as string,
        hostname: (r.hostname as string) ?? null,
        pid: (r.pid as number) ?? null,
        acquiredAt: r.acquired_at as string,
        heartbeatAt: r.heartbeat_at as string,
        expiresAt,
        releasedAt: (r.released_at as string) ?? null,
        status: r.status as WorkerLockState["status"],
        secondsUntilExpiry,
        metadata: (r.metadata as Record<string, unknown>) ?? {},
      },
      tableExists: true,
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      tableExists: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function getDbRuntimeConfig(): Promise<{
  data: RuntimeConfig | null;
  exists: boolean;
  error: string | null;
}> {
  const client = getServiceClient() ?? getAnonClient();
  if (!client) return { data: null, exists: false, error: "Supabase not configured" };

  try {
    const { data, error } = await client
      .from("collatz_engine_runtime_config")
      .select("*")
      .eq("id", "main")
      .single();

    if (error) {
      return { data: null, exists: false, error: error.message };
    }

    const r = data as Record<string, unknown>;
    const num = (v: unknown, fb: number) => {
      const p = typeof v === "number" ? v : Number(v);
      return Number.isFinite(p) && p >= 0 ? p : fb;
    };

    return {
      data: {
        mode: (r.mode as string) ?? "recovery",
        batchSize: num(r.batch_size, 25),
        batchDelayMs: num(r.batch_delay_ms, 10000),
        logIntervalMs: num(r.log_interval_ms, 60000),
        storageMode: (r.storage_mode as string) ?? "free-tier",
        keepRecentResults: num(r.keep_recent_results, 1000),
        activityLogRetentionRows: num(r.activity_log_retention_rows, 250),
        rangeSummaryInterval: num(r.range_summary_interval, 100000),
        milestoneInterval: num(r.milestone_interval, 1000000),
        autoThrottleEnabled: r.auto_throttle_enabled !== false,
        pauseOnCriticalStorage: r.pause_on_critical_storage !== false,
        updatedAt: (r.updated_at as string) ?? null,
      },
      exists: true,
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      exists: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
