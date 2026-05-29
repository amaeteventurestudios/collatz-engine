"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { AdminMetricsApiResponse } from "@/lib/admin/types";

const POLL_INTERVAL_MS = 5_000;   // 5 s between polls
const STALE_THRESHOLD_MS = 15_000; // show stale banner after 15 s

export interface UseAdminRealtimeMetricsResult {
  data: AdminMetricsApiResponse | null;
  isStale: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Polls GET /api/admin/metrics every 5 seconds.
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
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    initial ? new Date() : null,
  );

  // eslint-disable-next-line react-hooks/purity
  const lastSuccessMs = useRef<number>(initial ? Date.now() : 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const staleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;

    try {
      const res = await fetch("/api/admin/metrics", {
        cache: "no-store",
        headers: { "x-poll": "1" },
      });
      if (!res.ok) {
        setError("Realtime admin metrics delayed.");
        return;
      }
      const json = (await res.json()) as AdminMetricsApiResponse;
      setData(json);
      setError(null);
      setIsStale(false);
      const now = Date.now();
      lastSuccessMs.current = now;
      setLastUpdated(new Date(now));
    } catch {
      setError("Realtime admin metrics delayed.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void poll();

    // Recurring poll
    intervalRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS);

    // Stale check every 2 s
    staleRef.current = setInterval(() => {
      const age = Date.now() - lastSuccessMs.current;
      setIsStale(age > STALE_THRESHOLD_MS);
    }, 2_000);

    // Resume + immediate poll when tab regains focus
    const onVisibility = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (staleRef.current) clearInterval(staleRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [poll]);

  return { data, isStale, error, lastUpdated };
}
