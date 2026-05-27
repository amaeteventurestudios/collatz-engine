"use client";

import { useEffect, useState } from "react";
import { getSeedResult } from "@/lib/collatz/examples";
import { computeCollatz } from "@/lib/collatz/engine";
import {
  getTopLongestTrajectories,
  getTopHighestPeaks,
} from "@/lib/collatz/store";
import { useCollatzLiveState } from "./useCollatzLiveState";
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
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FALLBACK: CollatzResult = getSeedResult(27);
const RECORDS_POLL_MS = 5_000;

const LABELS: Record<DisplayMode, (n: number) => string> = {
  latest_verified: (n) => `Latest verified, n=${n.toLocaleString("en-US")}`,
  current_batch: (n) => `Current batch sample, n=${n.toLocaleString("en-US")}`,
  longest_record: (n) => `Longest record, n=${n.toLocaleString("en-US")}`,
  highest_peak: (n) => `Highest peak record, n=${n.toLocaleString("en-US")}`,
};

const HELPER_COPY: Record<DisplayMode, string | null> = {
  latest_verified: null,
  current_batch:
    "Computed from the active batch, not yet stored in the catalog.",
  longest_record:
    "Updates only when a new record trajectory is discovered.",
  highest_peak:
    "Updates only when a new peak value record is discovered.",
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCollatzSelectedTrajectory(): SelectedTrajectoryResult {
  const [mode, setMode] = useState<DisplayMode>("latest_verified");
  const [result, setResult] = useState<CollatzResult>(FALLBACK);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Engine state is already polled at 2 s — reuse it for live modes
  const { state, nextBatchStart } = useCollatzLiveState();

  // ── Live modes: recompute synchronously whenever engine state advances ─────
  // No extra DB query needed; computeCollatz is fast for typical n values.
  useEffect(() => {
    if (mode !== "latest_verified" && mode !== "current_batch") return;

    const n =
      mode === "latest_verified"
        ? (state?.last_checked_number ?? 0)
        : nextBatchStart;

    if (n <= 0) return;

    let active = true;

    function compute() {
      try {
        const computed = computeCollatz(n);
        if (!active) return;
        if (computed.reached_one && computed.full_sequence.length > 1) {
          setResult(computed);
          setError(null);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Computation failed");
      } finally {
        if (active) setLoading(false);
      }
    }

    compute();

    return () => {
      active = false;
    };
  }, [mode, state?.last_checked_number, nextBatchStart]);

  // ── Record modes: DB fetch + compute, polled every 5 s ───────────────────
  useEffect(() => {
    if (mode !== "longest_record" && mode !== "highest_peak") return;

    let active = true;

    async function fetchAndCompute() {
      setLoading(true);
      try {
        const rows =
          mode === "longest_record"
            ? await getTopLongestTrajectories(1)
            : await getTopHighestPeaks(1);

        if (!active || !rows || rows.length === 0) return;

        const computed = computeCollatz(rows[0].n);
        if (!active) return;

        if (computed.reached_one && computed.full_sequence.length > 1) {
          setResult(computed);
          setError(null);
        }
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load record",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchAndCompute();
    const pollId = window.setInterval(fetchAndCompute, RECORDS_POLL_MS);

    return () => {
      active = false;
      window.clearInterval(pollId);
    };
  }, [mode]);

  const n = Number(result.start_number);

  return {
    mode,
    setMode,
    result,
    label: LABELS[mode](n),
    helperCopy: HELPER_COPY[mode],
    loading,
    error,
  };
}
