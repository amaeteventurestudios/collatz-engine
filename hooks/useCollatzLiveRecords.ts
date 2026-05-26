"use client";

import { useEffect, useRef, useState } from "react";
import {
  getTopLongestTrajectories,
  getTopHighestPeaks,
} from "@/lib/collatz/store";
import type { CollatzResultRow } from "@/lib/collatz/store";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LiveRecordsResult {
  /** Top trajectories by step count, descending. */
  topTrajectories: CollatzResultRow[];
  /** Top results by peak value, descending. */
  topPeaks: CollatzResultRow[];
  /** True until the first successful fetch completes. */
  loading: boolean;
  /** Non-null if the fetch throws. */
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const DEFAULT_POLL_MS = 5_000;

export function useCollatzLiveRecords(
  limit = 10,
  pollMs: number = DEFAULT_POLL_MS,
): LiveRecordsResult {
  const [topTrajectories, setTopTrajectories] = useState<CollatzResultRow[]>([]);
  const [topPeaks, setTopPeaks] = useState<CollatzResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    async function poll() {
      try {
        const [trajectories, peaks] = await Promise.all([
          getTopLongestTrajectories(limit),
          getTopHighestPeaks(limit),
        ]);
        if (!mountedRef.current) return;
        setTopTrajectories(trajectories);
        setTopPeaks(peaks);
        setError(null);
      } catch (err: unknown) {
        if (!mountedRef.current) return;
        setError(
          err instanceof Error ? err.message : "Failed to load records",
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
  }, [limit, pollMs]);

  return { topTrajectories, topPeaks, loading, error };
}
