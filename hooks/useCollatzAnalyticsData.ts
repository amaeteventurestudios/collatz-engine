"use client";

import { useCallback, useState } from "react";
import { COLLATZ_POLL_MS } from "@/lib/collatz/cache-policy";
import { useSafePolling } from "@/hooks/useSafePolling";

export interface AnalyticsChartRow {
  n: number;
  steps: number;
  peak: number;
}

export interface AnalyticsRecordRow {
  n: number;
  steps: number;
  peak: number;
  created_at: string | null;
}

export interface CollatzAnalyticsData {
  chartResults: AnalyticsChartRow[];
  topBySteps: AnalyticsRecordRow[];
  topByPeak: AnalyticsRecordRow[];
  loading: boolean;
  error: string | null;
}

const SAFE_POLL_MS = COLLATZ_POLL_MS.PUBLIC_ANALYTICS;

interface AnalyticsApiResponse {
  ok: boolean;
  chartResults?: AnalyticsChartRow[];
  topBySteps?: AnalyticsRecordRow[];
  topByPeak?: AnalyticsRecordRow[];
  error?: string;
}

export function useCollatzAnalyticsData(
  chartLimit = 500,
  recordLimit = 25,
): CollatzAnalyticsData {
  const [chartResults, setChartResults] = useState<AnalyticsChartRow[]>([]);
  const [topBySteps, setTopBySteps] = useState<AnalyticsRecordRow[]>([]);
  const [topByPeak, setTopByPeak] = useState<AnalyticsRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async (signal: AbortSignal) => {
    try {
      const params = new URLSearchParams({
        chartLimit: String(chartLimit),
        recordLimit: String(recordLimit),
      });
      const res = await fetch(`/api/collatz/analytics?${params.toString()}`, { signal });
      const json = (await res.json()) as AnalyticsApiResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Failed to load analytics data");
      }

      setChartResults(json.chartResults ?? []);
      setTopBySteps(json.topBySteps ?? []);
      setTopByPeak(json.topByPeak ?? []);
      setError(null);
    } catch (e) {
      if (signal.aborted) return;
      setError(e instanceof Error ? e.message : "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [chartLimit, recordLimit]);

  const polling = useSafePolling({
    intervalMs: SAFE_POLL_MS,
    minIntervalMs: 60_000,
    staleAfterMs: SAFE_POLL_MS * 2,
    poll,
  });

  return {
    chartResults,
    topBySteps,
    topByPeak,
    loading,
    error: error ?? polling.error,
  };
}
