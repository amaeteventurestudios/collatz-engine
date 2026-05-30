"use client";

import { useState, useCallback } from "react";
import { COLLATZ_POLL_MS } from "@/lib/collatz/cache-policy";
import { useSafePolling } from "@/hooks/useSafePolling";
import type { AdminMetricsApiResponse } from "@/lib/admin/types";

const POLL_INTERVAL_MS = COLLATZ_POLL_MS.ADMIN_METRICS;
const STALE_THRESHOLD_MS = 90_000;

export interface UseAdminRealtimeMetricsResult {
  data: AdminMetricsApiResponse | null;
  isStale: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Polls GET /api/admin/metrics at a bounded admin cadence.
 *
 * - Keeps the last successful response visible on failure.
 * - Shows `isStale = true` when data has not refreshed for > 15 s.
 * - Pauses polling while the browser tab is hidden; resumes + immediate
 *   poll when the tab becomes visible again.
 * - Never mutates engine state (read-only polling).
 */
export function useAdminRealtimeMetrics(
  initial?: AdminMetricsApiResponse,
): UseAdminRealtimeMetricsResult {
  const [data, setData] = useState<AdminMetricsApiResponse | null>(
    initial ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    initial ? new Date() : null,
  );

  const poll = useCallback(async (signal: AbortSignal) => {
    try {
      const res = await fetch("/api/admin/metrics", {
        signal,
        headers: { "x-poll": "1" },
      });
      if (!res.ok) {
        setError("Realtime admin metrics delayed.");
        return;
      }
      const json = (await res.json()) as AdminMetricsApiResponse;
      setData(json);
      setError(null);
      const now = Date.now();
      setLastUpdated(new Date(now));
    } catch {
      if (signal.aborted) return;
      setError("Realtime admin metrics delayed.");
    }
  }, []);

  const polling = useSafePolling({
    intervalMs: POLL_INTERVAL_MS,
    minIntervalMs: 30_000,
    staleAfterMs: STALE_THRESHOLD_MS,
    poll,
  });

  return { data, isStale: polling.isStale, error: error ?? polling.error, lastUpdated };
}
