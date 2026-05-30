"use client";

import { useEffect, useRef, useState } from "react";
import type { EngineState } from "@/lib/collatz/store";

// Match useDashboardData so both hooks share one effective poll interval.
function resolvePollMs(): number {
  const raw = process.env.NEXT_PUBLIC_PUBLIC_DASHBOARD_POLL_MS;
  const n = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n) || n < 30_000) return 60_000;
  return Math.min(n, 300_000);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type HealthStatus = "live" | "delayed" | "stalled" | "stopped" | "error";

export interface LiveEngineStateResult {
  /** Raw engine state from Supabase, or null before first load / on error. */
  state: EngineState | null;
  /** True until the first successful fetch completes. */
  loading: boolean;
  /** Non-null only when the database itself throws (misconfigured client, network). */
  error: string | null;
  /** Whole seconds since state.started_at. Ticks every second. 0 if unknown. */
  runtimeSeconds: number;
  /**
   * Whole seconds since state.worker_heartbeat_at. Ticks every second.
   * Infinity when worker_heartbeat_at is absent (Phase 6 not yet run).
   */
  heartbeatAgeSeconds: number;
  /**
   * Derived health classification:
   *   "live"    — running, heartbeat ≤ 30s ago
   *   "delayed" — running, heartbeat 31–120s ago
   *   "stalled" — running, heartbeat > 120s ago (or no heartbeat data)
   *   "stopped" — current_status !== "running"
   *   "error"   — last_error is set (takes priority over all other states)
   */
  healthStatus: HealthStatus;
  /**
   * Batch range fields — derived from engine state.
   * lastVerifiedStart/End: the n-range of the most recently completed batch.
   * nextBatchStart/End:    the n-range of the batch currently queued.
   * batchSize:             numbers processed per batch.
   */
  lastVerifiedStart: number;
  lastVerifiedEnd: number;
  nextBatchStart: number;
  nextBatchEnd: number;
  batchSize: number;
  /** When the server generated the dashboard payload (accounts for server-side cache age). */
  payloadGeneratedAt: Date | null;
  /** Effective client-side poll interval in milliseconds. */
  pollIntervalMs: number;
}

// ─── Health derivation ────────────────────────────────────────────────────────

function deriveHealth(
  state: EngineState | null,
  heartbeatAgeSeconds: number,
): HealthStatus {
  if (!state) return "stopped";
  if (state.last_error) return "error";
  if (state.current_status !== "running") return "stopped";
  if (heartbeatAgeSeconds <= 30) return "live";
  if (heartbeatAgeSeconds <= 120) return "delayed";
  return "stalled";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

// Poll the cached dashboard API — never the Supabase anon client directly.
// Reads the same env var as useDashboardData for a consistent public refresh interval.
const DEFAULT_POLL_MS = resolvePollMs();

export function useCollatzLiveState(
  pollMs: number = DEFAULT_POLL_MS,
): LiveEngineStateResult {
  const [state, setState] = useState<EngineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(0);
  const [payloadGeneratedAt, setPayloadGeneratedAt] = useState<Date | null>(null);
  const mountedRef = useRef(false);

  // ── Data polling ────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    async function poll() {
      try {
        const res = await fetch("/api/collatz/dashboard");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!mountedRef.current) return;
        setState((json.engineState as EngineState) ?? null);
        setPayloadGeneratedAt(
          json.generatedAt ? new Date(json.generatedAt as string) : null,
        );
        setError(null);
      } catch (err: unknown) {
        if (!mountedRef.current) return;
        setError(
          err instanceof Error ? err.message : "Failed to load engine state",
        );
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    poll();
    const pollId = window.setInterval(poll, pollMs);

    return () => {
      mountedRef.current = false;
      window.clearInterval(pollId);
    };
  }, [pollMs]);

  // ── Clock tick (drives live runtime + heartbeat age) ────────────────────────
  // setNow is called inside `tick` (not directly in the effect body) to satisfy
  // the react-hooks/set-state-in-effect lint rule.
  useEffect(() => {
    function tick() {
      setNow(Date.now());
    }
    tick(); // Initialise immediately after mount to avoid SSR mismatch
    const id = window.setInterval(tick, 1_000);
    return () => window.clearInterval(id);
  }, []);

  // ── Derived time values ──────────────────────────────────────────────────────
  const runtimeSeconds =
    now > 0 && state?.started_at
      ? Math.max(
          0,
          Math.floor((now - new Date(state.started_at).getTime()) / 1_000),
        )
      : 0;

  const heartbeatAgeSeconds =
    now > 0 && state?.worker_heartbeat_at
      ? Math.max(
          0,
          Math.floor(
            (now - new Date(state.worker_heartbeat_at).getTime()) / 1_000,
          ),
        )
      : Infinity;

  const healthStatus = deriveHealth(state, heartbeatAgeSeconds);

  // ── Batch range computation ──────────────────────────────────────────────────
  const lastVerifiedEnd = state?.total_numbers_checked ?? 0;
  const batchSize = state?.last_batch_size ?? 100;
  const lastVerifiedStart = lastVerifiedEnd > 0 ? Math.max(1, lastVerifiedEnd - batchSize + 1) : 0;
  const nextBatchStart = lastVerifiedEnd + 1;
  const nextBatchEnd = lastVerifiedEnd + batchSize;

  return {
    state,
    loading,
    error,
    runtimeSeconds,
    heartbeatAgeSeconds,
    healthStatus,
    lastVerifiedStart,
    lastVerifiedEnd,
    nextBatchStart,
    nextBatchEnd,
    batchSize,
    payloadGeneratedAt,
    pollIntervalMs: pollMs,
  };
}
