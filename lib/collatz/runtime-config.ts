import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for runtime-config reads.
 * Uses SUPABASE_SERVICE_ROLE_KEY when available (worker/server context),
 * falls back to anon key (local dev / public reads).
 * Not marked server-only so worker scripts (tsx CLI) can import it.
 */
function getConfigClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey ?? anonKey;
  if (!url || !key) return null;
  if (!serviceKey) {
    console.warn(
      "[Collatz RuntimeConfig] SUPABASE_SERVICE_ROLE_KEY not set — using anon key. " +
        "RLS policies may prevent reading runtime config.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface RuntimeConfig {
  mode: string;
  batchSize: number;
  batchDelayMs: number;
  logIntervalMs: number;
  storageMode: string;
  keepRecentResults: number;
  activityLogRetentionRows: number;
  rangeSummaryInterval: number;
  milestoneInterval: number;
  autoThrottleEnabled: boolean;
  pauseOnCriticalStorage: boolean;
}

// Conservative recovery defaults — used if Supabase is unavailable
export const RECOVERY_DEFAULTS: RuntimeConfig = {
  mode: "recovery",
  batchSize: 25,
  batchDelayMs: 10_000,
  logIntervalMs: 60_000,
  storageMode: "free-tier",
  keepRecentResults: 1_000,
  activityLogRetentionRows: 250,
  rangeSummaryInterval: 100_000,
  milestoneInterval: 1_000_000,
  autoThrottleEnabled: true,
  pauseOnCriticalStorage: true,
};

export const MODE_PRESETS: Record<string, Partial<RuntimeConfig>> = {
  recovery: {
    mode: "recovery",
    batchSize: 25,
    batchDelayMs: 10_000,
    logIntervalMs: 60_000,
    storageMode: "free-tier",
    keepRecentResults: 1_000,
    activityLogRetentionRows: 250,
  },
  safe: {
    mode: "safe",
    batchSize: 50,
    batchDelayMs: 5_000,
    logIntervalMs: 60_000,
    storageMode: "free-tier",
    keepRecentResults: 5_000,
    activityLogRetentionRows: 500,
  },
  normal: {
    mode: "normal",
    batchSize: 250,
    batchDelayMs: 2_000,
    logIntervalMs: 60_000,
    storageMode: "free-tier",
    keepRecentResults: 10_000,
    activityLogRetentionRows: 1_000,
  },
};

// In-process cache with TTL
let cachedConfig: RuntimeConfig | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const p = parseInt(raw, 10);
  return Number.isFinite(p) && p >= 0 ? p : fallback;
}

function envBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  return raw !== "false" && raw !== "0";
}

function envDefaults(): RuntimeConfig {
  return {
    mode: process.env.COLLATZ_WORKER_MODE ?? RECOVERY_DEFAULTS.mode,
    batchSize: envInt("COLLATZ_RESULT_BATCH_SIZE", RECOVERY_DEFAULTS.batchSize),
    batchDelayMs: envInt("COLLATZ_BATCH_DELAY_MS", RECOVERY_DEFAULTS.batchDelayMs),
    logIntervalMs: envInt("COLLATZ_LOG_INTERVAL_MS", RECOVERY_DEFAULTS.logIntervalMs),
    storageMode: process.env.COLLATZ_STORAGE_MODE ?? RECOVERY_DEFAULTS.storageMode,
    keepRecentResults: envInt("COLLATZ_KEEP_RECENT_RESULTS", RECOVERY_DEFAULTS.keepRecentResults),
    activityLogRetentionRows: envInt("COLLATZ_ACTIVITY_LOG_RETENTION_ROWS", RECOVERY_DEFAULTS.activityLogRetentionRows),
    rangeSummaryInterval: envInt("COLLATZ_RANGE_SUMMARY_INTERVAL", RECOVERY_DEFAULTS.rangeSummaryInterval),
    milestoneInterval: envInt("COLLATZ_MILESTONE_INTERVAL", RECOVERY_DEFAULTS.milestoneInterval),
    autoThrottleEnabled: envBool("COLLATZ_AUTO_THROTTLE_ENABLED", RECOVERY_DEFAULTS.autoThrottleEnabled),
    pauseOnCriticalStorage: envBool("COLLATZ_PAUSE_ON_CRITICAL_STORAGE", RECOVERY_DEFAULTS.pauseOnCriticalStorage),
  };
}

function rowToConfig(row: Record<string, unknown>): RuntimeConfig {
  const n = (v: unknown, fallback: number): number => {
    const p = typeof v === "number" ? v : Number(v);
    return Number.isFinite(p) && p >= 0 ? p : fallback;
  };
  const b = (v: unknown, fallback: boolean): boolean =>
    typeof v === "boolean" ? v : fallback;

  return {
    mode: (row.mode as string) ?? RECOVERY_DEFAULTS.mode,
    batchSize: n(row.batch_size, RECOVERY_DEFAULTS.batchSize),
    batchDelayMs: n(row.batch_delay_ms, RECOVERY_DEFAULTS.batchDelayMs),
    logIntervalMs: n(row.log_interval_ms, RECOVERY_DEFAULTS.logIntervalMs),
    storageMode: (row.storage_mode as string) ?? RECOVERY_DEFAULTS.storageMode,
    keepRecentResults: n(row.keep_recent_results, RECOVERY_DEFAULTS.keepRecentResults),
    activityLogRetentionRows: n(row.activity_log_retention_rows, RECOVERY_DEFAULTS.activityLogRetentionRows),
    rangeSummaryInterval: n(row.range_summary_interval, RECOVERY_DEFAULTS.rangeSummaryInterval),
    milestoneInterval: n(row.milestone_interval, RECOVERY_DEFAULTS.milestoneInterval),
    autoThrottleEnabled: b(row.auto_throttle_enabled, RECOVERY_DEFAULTS.autoThrottleEnabled),
    pauseOnCriticalStorage: b(row.pause_on_critical_storage, RECOVERY_DEFAULTS.pauseOnCriticalStorage),
  };
}

/**
 * Read runtime config from Supabase with 60s in-process cache.
 * Uses service-role client when SUPABASE_SERVICE_ROLE_KEY is available so
 * RLS policies on collatz_engine_runtime_config do not block the read.
 * Falls back to env vars, then to recovery defaults.
 * Never throws — always returns a safe config.
 */
export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedAt < CACHE_TTL_MS) {
    return cachedConfig;
  }

  const client = getConfigClient();
  if (!client) {
    console.warn(
      "[Collatz RuntimeConfig] No Supabase client available — falling back to env/recovery defaults.",
    );
    const cfg = envDefaults();
    cachedConfig = cfg;
    cachedAt = now;
    return cfg;
  }

  try {
    const { data, error } = await client
      .from("collatz_engine_runtime_config")
      .select("*")
      .eq("id", "main")
      .single();

    if (error || !data) {
      console.warn(
        `[Collatz RuntimeConfig] DB read failed (${error?.code ?? "no data"}: ${error?.message ?? "empty result"}) — falling back to env/recovery defaults.`,
      );
      const cfg = envDefaults();
      cachedConfig = cfg;
      cachedAt = now;
      return cfg;
    }

    const cfg = rowToConfig(data as Record<string, unknown>);
    cachedConfig = cfg;
    cachedAt = now;
    return cfg;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[Collatz RuntimeConfig] Unexpected error fetching config: ${msg} — falling back to env/recovery defaults.`,
    );
    const cfg = envDefaults();
    cachedConfig = cfg;
    cachedAt = now;
    return cfg;
  }
}

/** Force cache invalidation — call after updating runtime config in DB */
export function invalidateRuntimeConfigCache(): void {
  cachedConfig = null;
  cachedAt = 0;
}

/**
 * Inline per-batch prune: keeps collatz_results bounded to keepRecentResults.
 * Calls the prune_results_to_limit RPC (anon-accessible).
 * Fails silently — never blocks the main batch loop.
 */
export async function pruneResultsIfNeeded(keepRecentResults: number): Promise<void> {
  const client = getConfigClient();
  if (!client) return;
  try {
    await client.rpc("prune_results_to_limit", { p_keep: keepRecentResults });
  } catch {
    console.warn("[Collatz Worker] prune_results_to_limit failed (non-fatal)");
  }
}
