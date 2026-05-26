"use client";

import { useEffect, useRef, useState } from "react";
import { getEngineState } from "@/lib/collatz/store";
import type { EngineState } from "@/lib/collatz/store";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HealthStatus = "live" | "delayed" | "stalled" | "stopped" | "error";

export interface LiveEngineStateResult {
  /** Raw engine state from Supabase, or null before first load / on error. */
  state: EngineState | null;
  /** True until the first successful fetch completes. */
  loading: boolean;
  /** Non-null only when Supabase itself throws (misconfigured client, network). */
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
   *   "live"    — running, heartbeat ≤ 15s ago
   *   "delayed" — running, heartbeat 16–60s ago
   *   "stalled" — running, heartbeat > 60s ago (or no heartbeat data)
   *   "stopped" — current_status !== "running"
   *   "error"   — last_error is set (takes priority over all other states)
   */
  healthStatus: HealthStatus;
}

// ─── Health derivation ────────────────────────────────────────────────────────

function deriveHealth(
  state: EngineState | null,
  heartbeatAgeSeconds: number,
): HealthStatus {
  if (!state) return "stopped";
  if (state.last_error) return "error";
  if (state.current_status !== "running") return "stopped";
  if (heartbeatAgeSeconds <= 15) return "live";
  if (heartbeatAgeSeconds <= 60) return "delayed";
  return "stalled";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const DEFAULT_POLL_MS = 5_000;

export function useCollatzLiveState(
  pollMs: number = DEFAULT_POLL_MS,
): LiveEngineStateResult {
  const [state, setState] = useState<EngineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(0);
  const mountedRef = useRef(false);

  // ── Data polling ────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    async function poll() {
      try {
        const data = await getEngineState();
        if (!mountedRef.current) return;
        setState(data);
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

  // ── Derived values ──────────────────────────────────────────────────────────
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

  return {
    state,
    loading,
    error,
    runtimeSeconds,
    heartbeatAgeSeconds,
    healthStatus,
  };
}
