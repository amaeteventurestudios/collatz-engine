"use client";

import { useCallback, useState } from "react";
import { COLLATZ_POLL_MS } from "@/lib/collatz/cache-policy";
import { useSafePolling } from "@/hooks/useSafePolling";
import type { CollatzAllTimeRecordRow, CollatzResultRow } from "@/lib/collatz/store";

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

const DEFAULT_POLL_MS = COLLATZ_POLL_MS.PUBLIC_RECORDS;

interface AllTimeRecordsApiResponse {
  ok: boolean;
  longestRecords?: CollatzAllTimeRecordRow[];
  peakRecords?: CollatzAllTimeRecordRow[];
  error?: string;
}

function toResultRow(row: CollatzAllTimeRecordRow): CollatzResultRow {
  return {
    n: row.starting_number,
    steps: row.steps,
    peak: row.peak_value,
    reached_one: true,
    created_at: row.discovered_at ?? row.created_at ?? null,
  };
}

export function useCollatzLiveRecords(
  limit = 10,
  pollMs: number = DEFAULT_POLL_MS,
): LiveRecordsResult {
  const [topTrajectories, setTopTrajectories] = useState<CollatzResultRow[]>([]);
  const [topPeaks, setTopPeaks] = useState<CollatzResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async (signal: AbortSignal) => {
    try {
      const res = await fetch(`/api/collatz/all-time-records?limit=${limit}`, { signal });
      const json = (await res.json()) as AllTimeRecordsApiResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Failed to load records");
      }
      setTopTrajectories((json.longestRecords ?? []).map(toResultRow));
      setTopPeaks((json.peakRecords ?? []).map(toResultRow));
      setError(null);
    } catch (err: unknown) {
      if (signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const polling = useSafePolling({
    intervalMs: pollMs,
    minIntervalMs: 60_000,
    staleAfterMs: Math.max(pollMs * 2, 120_000),
    poll,
  });

  return { topTrajectories, topPeaks, loading, error: error ?? polling.error };
}
