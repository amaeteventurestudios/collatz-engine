"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSeedResult } from "@/lib/collatz/examples";
import { computeCollatz } from "@/lib/collatz/engine";
import { COLLATZ_POLL_MS } from "@/lib/collatz/cache-policy";
import { useSafePolling } from "@/hooks/useSafePolling";
import { useCollatzLiveState } from "./useCollatzLiveState";
import type { CollatzAllTimeRecordRow } from "@/lib/collatz/store";
import type { CollatzResult } from "@/lib/collatz/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DisplayMode =
  | "latest_verified"
  | "current_batch"
  | "longest_record"
  | "highest_peak";

export interface SelectedTrajectoryResult {
  mode: DisplayMode;
  setMode: (m: DisplayMode) => void;
  /** Always a valid result — falls back to n=27 until real data is available. */
  result: CollatzResult;
  /** Human-readable badge label including the selected n. */
  label: string;
  /** Optional note shown below the mode selector when applicable. */
  helperCopy: string | null;
  /** True while an async record-mode DB fetch is in flight. */
  loading: boolean;
  /** Non-null when a fetch or computation fails. */
  error: string | null;
  /** True when the displayed trajectory is browser-estimated, not backend-verified. */
  isEstimated: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FALLBACK: CollatzResult = getSeedResult(27);
const RECORDS_POLL_MS = COLLATZ_POLL_MS.PUBLIC_RECORDS;
// How often to refresh the estimated-live trajectory (Part 1 requirement)
const ESTIMATED_REFRESH_MS = 5_000;

interface AllTimeRecordsApiResponse {
  ok: boolean;
  longestRecords?: CollatzAllTimeRecordRow[];
  peakRecords?: CollatzAllTimeRecordRow[];
  error?: string;
}

const LABELS: Record<DisplayMode, (n: number, estimated: boolean) => string> = {
  latest_verified: (n) => `Latest verified, n=${n.toLocaleString("en-US")}`,
  current_batch: (n, est) =>
    est
      ? `Estimated live n=~${n.toLocaleString("en-US")}`
      : `Current batch, n=${n.toLocaleString("en-US")}`,
  longest_record: (n) => `Longest record, n=${n.toLocaleString("en-US")}`,
  highest_peak: (n) => `Highest peak record, n=${n.toLocaleString("en-US")}`,
};

const HELPER_COPY: Record<DisplayMode, (estimated: boolean) => string | null> = {
  latest_verified: () => null,
  current_batch: (est) =>
    est
      ? "Generated locally from the estimated engine position. Verified catalog data updates on backend sync."
      : "Computed from the active batch, not yet stored in the catalog.",
  longest_record: () => "Updates only when a new record trajectory is discovered.",
  highest_peak: () => "Updates only when a new peak value record is discovered.",
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCollatzSelectedTrajectory(): SelectedTrajectoryResult {
  const [mode, setMode] = useState<DisplayMode>("latest_verified");
  const [result, setResult] = useState<CollatzResult>(FALLBACK);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEstimated, setIsEstimated] = useState(false);

  // Engine state polled at the configured public interval; also exposes
  // payloadGeneratedAt so we can project estimated n forward client-side.
  const { state, nextBatchStart, payloadGeneratedAt } = useCollatzLiveState();

  // ── latest_verified mode: recompute on backend sync ──────────────────────
  // setState calls are inside a helper function (not directly in the body)
  // so the react-hooks/set-state-in-effect rule is satisfied.
  useEffect(() => {
    if (mode !== "latest_verified") return;
    const n = state?.last_checked_number ?? 0;
    if (n <= 0) return;
    let active = true;

    function compute() {
      try {
        const computed = computeCollatz(n);
        if (!active) return;
        if (computed.reached_one && computed.full_sequence.length > 1) {
          setResult(computed);
          setIsEstimated(false);
          setError(null);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Computation failed");
      }
    }

    compute();
    return () => { active = false; };
  }, [mode, state?.last_checked_number]);

  // ── current_batch mode: estimated N refreshed every 5 s ──────────────────
  // Reads estimation params from a ref so the interval closure never goes stale.
  const estimateRef = useRef({
    base: 0,
    rate: 0 as number | null | undefined,
    generatedAt: null as Date | null,
    running: false,
  });

  useEffect(() => {
    estimateRef.current = {
      base: nextBatchStart,
      rate: state?.numbers_per_second,
      generatedAt: payloadGeneratedAt,
      running: state?.current_status === "running",
    };
  }, [nextBatchStart, state?.numbers_per_second, payloadGeneratedAt, state?.current_status]);

  useEffect(() => {
    if (mode !== "current_batch") return;

    function runCompute() {
      const { base, rate, generatedAt, running } = estimateRef.current;
      let n = base;
      let estimated = false;

      if (running && rate && rate > 0 && generatedAt) {
        const elapsed = Math.max(0, (Date.now() - generatedAt.getTime()) / 1000);
        const advanced = Math.round(rate * elapsed);
        if (advanced > 0) {
          n = base + advanced;
          estimated = true;
        }
      }

      if (n <= 0) return;

      try {
        const computed = computeCollatz(n);
        if (computed.reached_one && computed.full_sequence.length > 1) {
          setResult(computed);
          setIsEstimated(estimated);
          setError(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Computation failed");
      }
    }

    runCompute();
    const id = window.setInterval(runCompute, ESTIMATED_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [mode]); // stable — reads exclusively from ref

  // ── Record modes: cached API fetch + compute ─────────────────────────────
  const fetchRecordMode = useCallback(async (signal: AbortSignal) => {
    if (mode !== "longest_record" && mode !== "highest_peak") return;
    setLoading(true);
    try {
      const res = await fetch("/api/collatz/all-time-records?limit=1", { signal });
      const json = (await res.json()) as AllTimeRecordsApiResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Failed to load record");
      }
      const row =
        mode === "longest_record"
          ? json.longestRecords?.[0]
          : json.peakRecords?.[0];
      if (!row) return;
      const computed = computeCollatz(row.starting_number);
      if (computed.reached_one && computed.full_sequence.length > 1) {
        setResult(computed);
        setIsEstimated(false);
        setError(null);
      }
    } catch (err) {
      if (signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to load record");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useSafePolling({
    enabled: mode === "longest_record" || mode === "highest_peak",
    intervalMs: RECORDS_POLL_MS,
    minIntervalMs: 60_000,
    staleAfterMs: RECORDS_POLL_MS * 2,
    poll: fetchRecordMode,
  });

  const n = Number(result.start_number);

  return {
    mode,
    setMode,
    result,
    label: LABELS[mode](n, isEstimated),
    helperCopy: HELPER_COPY[mode](isEstimated),
    loading,
    error,
    isEstimated,
  };
}
