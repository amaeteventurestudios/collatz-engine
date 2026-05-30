"use client";

import { useCallback, useState } from "react";
import type { DashboardPayload } from "@/app/api/collatz/dashboard/route";
import { COLLATZ_POLL_MS, clampClientPollMs } from "@/lib/collatz/cache-policy";
import { useSafePolling } from "@/hooks/useSafePolling";

export type { DashboardPayload };

// ── Poll interval ─────────────────────────────────────────────────────────────
// Reads NEXT_PUBLIC_PUBLIC_DASHBOARD_POLL_MS at build time.
// Clamped to [60 000, 300 000] ms. Defaults to 120 000 (120 s).
function resolvePollMs(): number {
  return clampClientPollMs(
    process.env.NEXT_PUBLIC_PUBLIC_DASHBOARD_POLL_MS,
    COLLATZ_POLL_MS.PUBLIC_DASHBOARD,
  );
}

const POLL_MS = resolvePollMs();

export function useDashboardData(): {
  data: DashboardPayload | null;
  loading: boolean;
  error: string | null;
  /** ISO timestamp of the most recently received payload's generatedAt field. */
  lastUpdatedAt: Date | null;
  /** Effective client-side poll interval in milliseconds. */
  pollIntervalMs: number;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const poll = useCallback(async (signal: AbortSignal) => {
    try {
      const res = await fetch("/api/collatz/dashboard", { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as DashboardPayload;
      setData(json);
      setLastUpdatedAt(json.generatedAt ? new Date(json.generatedAt) : new Date());
      setError(null);
    } catch (err) {
      if (signal.aborted) return;
      setError(err instanceof Error ? err.message : "Dashboard data unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  const polling = useSafePolling({
    intervalMs: POLL_MS,
    minIntervalMs: 60_000,
    staleAfterMs: POLL_MS * 2,
    poll,
  });

  return {
    data,
    loading,
    error: error ?? polling.error,
    lastUpdatedAt,
    pollIntervalMs: POLL_MS,
    refresh: polling.refresh,
  };
}
