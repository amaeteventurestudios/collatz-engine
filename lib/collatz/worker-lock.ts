/**
 * Collatz Worker Lock — database-backed distributed mutex.
 *
 * Prevents two workers (iMac, laptop, Hetzner, CI) from processing batches
 * simultaneously. The lock is held in Supabase and enforced by a partial
 * unique index (one active lock per lock_name) and atomic SECURITY DEFINER
 * RPCs that avoid client-side read-then-insert races.
 *
 * TTL: 30 seconds default. Workers heartbeat every 10 seconds.
 * If a worker dies, the lock auto-expires after TTL with no action needed.
 * Admins can force-release from the dashboard at any time.
 */

import { hostname as osHostname } from "os";
import { randomBytes } from "crypto";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WorkerLockRow {
  id: string;
  lock_name: string;
  worker_instance_id: string;
  hostname: string | null;
  pid: number | null;
  acquired_at: string;
  heartbeat_at: string;
  expires_at: string;
  released_at: string | null;
  status: "active" | "expired" | "released" | "force_released";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AcquireResult {
  success: boolean;
  lock?: WorkerLockRow;
  currentOwner?: Omit<WorkerLockRow, "metadata" | "created_at" | "updated_at">;
  reason?: "active_lock_exists" | "concurrent_acquisition" | "supabase_error";
  error?: string;
}

export interface HeartbeatResult {
  success: boolean;
  heartbeatAt?: string;
  expiresAt?: string;
  reason?: string;
  error?: string;
}

export interface ReleaseResult {
  success: boolean;
  releasedAt?: string;
  reason?: string;
  error?: string;
}

// ── Pure helpers (exported for testability) ───────────────────────────────────

/**
 * Generates a stable unique worker instance ID for this process.
 * Format: <hostname>-<pid>-<timestamp_ms>-<4-hex-chars>
 */
export function generateWorkerInstanceId(): string {
  const host = osHostname().replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 32);
  const suffix = randomBytes(2).toString("hex");
  return `${host}-${process.pid}-${Date.now()}-${suffix}`;
}

/**
 * Returns true if the lock row's expires_at is in the past.
 */
export function isLockExpired(row: Pick<WorkerLockRow, "expires_at">): boolean {
  return new Date(row.expires_at).getTime() <= Date.now();
}

/**
 * Returns true if this worker instance owns the lock row.
 */
export function isOwnedByWorker(
  row: Pick<WorkerLockRow, "worker_instance_id">,
  instanceId: string,
): boolean {
  return row.worker_instance_id === instanceId;
}

/**
 * Returns whole seconds until the lock expires (negative if already expired).
 */
export function secondsUntilExpiry(row: Pick<WorkerLockRow, "expires_at">): number {
  return Math.floor((new Date(row.expires_at).getTime() - Date.now()) / 1000);
}

// ── Lock operations ───────────────────────────────────────────────────────────

export const LOCK_NAME_PRIMARY = "primary";
export const LOCK_TTL_SECONDS = 30;
export const HEARTBEAT_INTERVAL_MS = 10_000;

/**
 * Attempts to acquire the worker lock.
 * Returns immediately (no polling/retry) — the caller decides what to do on
 * failure (log owner info and exit).
 */
export async function acquireWorkerLock(opts: {
  workerInstanceId: string;
  hostname?: string;
  pid?: number;
  ttlSeconds?: number;
  metadata?: Record<string, unknown>;
  lockName?: string;
}): Promise<AcquireResult> {
  if (!supabase) {
    return { success: false, reason: "supabase_error", error: "Supabase not configured" };
  }

  try {
    const { data, error } = await supabase.rpc("acquire_collatz_worker_lock", {
      p_worker_instance_id: opts.workerInstanceId,
      p_hostname: opts.hostname ?? osHostname(),
      p_pid: opts.pid ?? process.pid,
      p_ttl_seconds: opts.ttlSeconds ?? LOCK_TTL_SECONDS,
      p_metadata: opts.metadata ?? {},
      p_lock_name: opts.lockName ?? LOCK_NAME_PRIMARY,
    });

    if (error) {
      return { success: false, reason: "supabase_error", error: error.message };
    }

    const result = data as Record<string, unknown>;
    if (result.success) {
      return {
        success: true,
        lock: result.lock as WorkerLockRow,
      };
    }

    return {
      success: false,
      reason: result.reason as AcquireResult["reason"],
      currentOwner: result.current_owner as AcquireResult["currentOwner"],
    };
  } catch (err) {
    return {
      success: false,
      reason: "supabase_error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Heartbeats the lock, extending expires_at by ttlSeconds from now.
 * Returns failure if this worker no longer owns the active lock.
 */
export async function heartbeatWorkerLock(opts: {
  workerInstanceId: string;
  ttlSeconds?: number;
  lockName?: string;
}): Promise<HeartbeatResult> {
  if (!supabase) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const { data, error } = await supabase.rpc("heartbeat_collatz_worker_lock", {
      p_worker_instance_id: opts.workerInstanceId,
      p_ttl_seconds: opts.ttlSeconds ?? LOCK_TTL_SECONDS,
      p_lock_name: opts.lockName ?? LOCK_NAME_PRIMARY,
    });

    if (error) return { success: false, error: error.message };

    const result = data as Record<string, unknown>;
    return {
      success: Boolean(result.success),
      heartbeatAt: result.heartbeat_at as string | undefined,
      expiresAt: result.expires_at as string | undefined,
      reason: result.reason as string | undefined,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Releases the lock owned by this worker. Safe to call on clean shutdown.
 * Does NOT release another worker's lock — the RPC enforces this.
 */
export async function releaseWorkerLock(opts: {
  workerInstanceId: string;
  lockName?: string;
}): Promise<ReleaseResult> {
  if (!supabase) {
    return { success: false, error: "Supabase not configured" };
  }

  try {
    const { data, error } = await supabase.rpc("release_collatz_worker_lock", {
      p_worker_instance_id: opts.workerInstanceId,
      p_lock_name: opts.lockName ?? LOCK_NAME_PRIMARY,
    });

    if (error) return { success: false, error: error.message };

    const result = data as Record<string, unknown>;
    return {
      success: Boolean(result.success),
      releasedAt: result.released_at as string | undefined,
      reason: result.reason as string | undefined,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Returns the current active lock row, or null if none exists.
 * Used by the worker to verify it still owns the lock before each batch.
 */
export async function getActiveLock(lockName = LOCK_NAME_PRIMARY): Promise<WorkerLockRow | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("collatz_worker_lock")
      .select("*")
      .eq("lock_name", lockName)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("acquired_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as WorkerLockRow;
  } catch {
    return null;
  }
}

/**
 * Returns the most recent lock row (any status), used by the admin dashboard.
 */
export async function getMostRecentLock(lockName = LOCK_NAME_PRIMARY): Promise<WorkerLockRow | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("collatz_worker_lock")
      .select("*")
      .eq("lock_name", lockName)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as WorkerLockRow;
  } catch {
    return null;
  }
}
