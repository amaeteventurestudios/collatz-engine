"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

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

const POLL_MS = 5_000;

export function useCollatzAnalyticsData(
  chartLimit = 500,
  recordLimit = 25,
): CollatzAnalyticsData {
  const [chartResults, setChartResults] = useState<AnalyticsChartRow[]>([]);
  const [topBySteps, setTopBySteps] = useState<AnalyticsRecordRow[]>([]);
  const [topByPeak, setTopByPeak] = useState<AnalyticsRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    async function poll() {
      if (!supabase) {
        if (mountedRef.current) setLoading(false);
        return;
      }
      try {
        const [chartRes, stepsRes, peakRes] = await Promise.all([
          supabase
            .from("collatz_results")
            .select("n, steps, peak")
            .order("n", { ascending: false })
            .limit(chartLimit),
          supabase
            .from("collatz_results")
            .select("n, steps, peak, created_at")
            .order("steps", { ascending: false })
            .limit(recordLimit),
          supabase
            .from("collatz_results")
            .select("n, steps, peak, created_at")
            .order("peak", { ascending: false })
            .limit(recordLimit),
        ]);

        if (!mountedRef.current) return;

        if (chartRes.error || stepsRes.error || peakRes.error) {
          setError("Failed to load analytics data");
          return;
        }

        const sorted = [
          ...((chartRes.data ?? []) as AnalyticsChartRow[]),
        ].sort((a, b) => a.n - b.n);

        setChartResults(sorted);
        setTopBySteps((stepsRes.data ?? []) as AnalyticsRecordRow[]);
        setTopByPeak((peakRes.data ?? []) as AnalyticsRecordRow[]);
        setError(null);
      } catch (e) {
        if (!mountedRef.current) return;
        setError(
          e instanceof Error ? e.message : "Failed to load analytics data",
        );
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
    };
  }, [chartLimit, recordLimit]);

  return { chartResults, topBySteps, topByPeak, loading, error };
}
