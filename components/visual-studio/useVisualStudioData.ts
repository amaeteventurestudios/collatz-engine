"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COLLATZ_POLL_MS } from "@/lib/collatz/cache-policy";
import { useSafePolling } from "@/hooks/useSafePolling";
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
  includeFullValues?: boolean;
}

interface RawEngineState {
  current_status?: unknown;
  total_numbers_checked?: unknown;
  last_checked_number?: unknown;
  worker_heartbeat_at?: unknown;
  longest_steps?: unknown;
  highest_peak?: unknown;
}

const POLL_MS = COLLATZ_POLL_MS.PUBLIC_VISUAL_STUDIO;
const MAX_FETCH_LIMIT = 1_000;

interface VisualStudioApiResponse {
  ok: boolean;
  rows?: Record<string, unknown>[];
  engineState?: RawEngineState | null;
  error?: string;
}

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

export function useVisualStudioData({
  visiblePathCount,
  liveUpdates,
  includeFullValues = false,
}: UseVisualStudioDataOptions): VisualStudioDataResult {
  const [trajectories, setTrajectories] = useState<VisualTrajectory[]>([]);
  const [engineRaw, setEngineRaw] = useState<RawEngineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<VisualStudioDataSource>("connected");
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const requestIdRef = useRef(0);

  const fetchLimit = Math.min(MAX_FETCH_LIMIT, Math.max(50, visiblePathCount));

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);

    try {
      const res = await fetch(`/api/collatz/visual-studio?limit=${fetchLimit}`, { signal });
      const json = (await res.json()) as VisualStudioApiResponse;

      if (requestIdRef.current !== requestId) return;

      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Unable to load Visual Studio data right now.");
      }

      const nextSyncAt = new Date();
      const nextEngine = (json.engineState ?? null) as RawEngineState | null;
      const rows = (json.rows ?? [])
        .map(normalizeResultRow)
        .filter((row): row is CollatzVisualSourceRow => row !== null);

      const recordContext = {
        longestSteps: numeric(nextEngine?.longest_steps) || null,
        highestPeak: numeric(nextEngine?.highest_peak) || null,
      };

      const nextTrajectories = rows
        .map((row) => deriveVisualTrajectory(row, recordContext, { includeFullValues }))
        .filter((trajectory): trajectory is VisualTrajectory => trajectory !== null);

      setTrajectories(nextTrajectories);
      setEngineRaw(nextEngine);
      setLastSyncAt(nextSyncAt);
      setDataSource("connected");
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      if (requestIdRef.current !== requestId) return;
      setDataSource(err instanceof Error && err.message.includes("unavailable") ? "unconfigured" : "error");
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Visual Studio data right now.",
      );
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [fetchLimit, includeFullValues]);

  useEffect(() => {
    const controller = new AbortController();
    const initialPollId = window.setTimeout(() => {
      void fetchData(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(initialPollId);
      controller.abort();
      requestIdRef.current += 1;
    };
  }, [fetchData]);

  useSafePolling({
    enabled: liveUpdates,
    intervalMs: POLL_MS,
    minIntervalMs: 60_000,
    staleAfterMs: POLL_MS * 2,
    poll: fetchData,
  });

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
