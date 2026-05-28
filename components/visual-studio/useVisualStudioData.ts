"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { deriveVisualTrajectory, type CollatzVisualSourceRow } from "./collatzTransforms";
import type {
  VisualStudioDataResult,
  VisualStudioDataSource,
  VisualStudioEngineSnapshot,
  VisualTrajectory,
} from "./visualStudioTypes";

interface UseVisualStudioDataOptions {
  visiblePathCount: number;
  liveUpdates: boolean;
}

interface RawEngineState {
  current_status?: unknown;
  total_numbers_checked?: unknown;
  last_checked_number?: unknown;
  worker_heartbeat_at?: unknown;
  longest_steps?: unknown;
  highest_peak?: unknown;
}

const POLL_MS = 8_000;
const ENGINE_ID = "main";
const MAX_FETCH_LIMIT = 1_000;
const QUERY_TIMEOUT_MS = 7_000;

function numeric(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function normalizeResultRow(row: Record<string, unknown>): CollatzVisualSourceRow | null {
  const n = numeric(row.n);
  const steps = numeric(row.steps);
  const peak = row.peak;
  if (!Number.isSafeInteger(n) || n < 1) return null;
  if (!Number.isFinite(steps) || steps < 0) return null;
  if (typeof peak !== "number" && typeof peak !== "string" && typeof peak !== "bigint") {
    return null;
  }

  return {
    n,
    steps,
    peak,
    reached_one:
      typeof row.reached_one === "boolean" ? row.reached_one : null,
    created_at: text(row.created_at),
  };
}

function syncAgeLabel(lastSyncAt: Date | null): string {
  if (!lastSyncAt) return "Pending";
  const seconds = Math.max(0, Math.floor((Date.now() - lastSyncAt.getTime()) / 1_000));
  if (seconds < 5) return "< 5 seconds ago";
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
}

function rangeLabel(totalChecked: number): string {
  if (totalChecked <= 0) return "Range unavailable";
  return `1 - ${totalChecked.toLocaleString("en-US")}`;
}

function normalizeEngineState(
  raw: RawEngineState | null,
  lastSyncAt: Date | null,
): VisualStudioEngineSnapshot | null {
  if (!raw) return null;

  const rawStatus = text(raw.current_status);
  const isLive = rawStatus === "running";
  const totalNumbersChecked = numeric(raw.total_numbers_checked);
  const lastCheckedNumber = numeric(raw.last_checked_number);

  return {
    rawStatus,
    statusLabel: isLive
      ? "ENGINE LIVE"
      : rawStatus
        ? `ENGINE ${rawStatus.toUpperCase()}`
        : "DATA SYNC ACTIVE",
    isLive,
    rangeLabel: rangeLabel(totalNumbersChecked || lastCheckedNumber),
    lastSyncLabel: syncAgeLabel(lastSyncAt),
    lastCheckedNumber,
    totalNumbersChecked,
    heartbeatAt: text(raw.worker_heartbeat_at),
    longestSteps: numeric(raw.longest_steps) || null,
    highestPeak: numeric(raw.highest_peak) || null,
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error("Visual Studio data request timed out."));
    }, timeoutMs);

    promise
      .then((value) => resolve(value))
      .catch((err: unknown) => reject(err))
      .finally(() => window.clearTimeout(timeoutId));
  });
}

export function useVisualStudioData({
  visiblePathCount,
  liveUpdates,
}: UseVisualStudioDataOptions): VisualStudioDataResult {
  const [trajectories, setTrajectories] = useState<VisualTrajectory[]>([]);
  const [engineRaw, setEngineRaw] = useState<RawEngineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<VisualStudioDataSource>("connected");
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const requestIdRef = useRef(0);

  const fetchLimit = Math.min(MAX_FETCH_LIMIT, Math.max(50, visiblePathCount));

  const fetchData = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!supabase) {
      setTrajectories([]);
      setEngineRaw(null);
      setDataSource("unconfigured");
      setError(null);
      setLoading(false);
      setLastSyncAt(new Date());
      return;
    }

    try {
      const [resultResponse, engineResponse] = await withTimeout(
        Promise.all([
          supabase
            .from("collatz_results")
            .select("n, steps, peak, reached_one, created_at")
            .order("n", { ascending: false })
            .limit(fetchLimit),
          supabase
            .from("collatz_engine_state")
            .select(
              "current_status, total_numbers_checked, last_checked_number, worker_heartbeat_at, longest_steps, highest_peak",
            )
            .eq("id", ENGINE_ID)
            .maybeSingle(),
        ]),
        QUERY_TIMEOUT_MS,
      );

      if (requestIdRef.current !== requestId) return;

      if (resultResponse.error) {
        throw new Error(resultResponse.error.message);
      }

      const nextSyncAt = new Date();
      const nextEngine = (engineResponse.data ?? null) as RawEngineState | null;
      const rows = ((resultResponse.data ?? []) as Record<string, unknown>[])
        .map(normalizeResultRow)
        .filter((row): row is CollatzVisualSourceRow => row !== null);

      const recordContext = {
        longestSteps: numeric(nextEngine?.longest_steps) || null,
        highestPeak: numeric(nextEngine?.highest_peak) || null,
      };

      const nextTrajectories = rows
        .map((row) => deriveVisualTrajectory(row, recordContext))
        .filter((trajectory): trajectory is VisualTrajectory => trajectory !== null);

      setTrajectories(nextTrajectories);
      setEngineRaw(nextEngine);
      setLastSyncAt(nextSyncAt);
      setDataSource("connected");
      setError(null);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setDataSource("error");
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Visual Studio data right now.",
      );
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [fetchLimit]);

  useEffect(() => {
    const initialPollId = window.setTimeout(fetchData, 0);
    const pollId = liveUpdates ? window.setInterval(fetchData, POLL_MS) : null;

    return () => {
      window.clearTimeout(initialPollId);
      if (pollId) window.clearInterval(pollId);
      requestIdRef.current += 1;
    };
  }, [fetchData, liveUpdates]);

  const engine = useMemo(
    () => normalizeEngineState(engineRaw, lastSyncAt),
    [engineRaw, lastSyncAt],
  );

  const hasRecordData = Boolean(engine?.longestSteps || engine?.highestPeak);

  return {
    trajectories,
    engine,
    loading,
    error,
    dataSource,
    lastSyncAt,
    hasRecordData,
    retry: fetchData,
  };
}
