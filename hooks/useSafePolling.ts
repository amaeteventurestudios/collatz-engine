"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseSafePollingOptions {
  enabled?: boolean;
  immediate?: boolean;
  intervalMs: number;
  minIntervalMs?: number;
  errorBackoffMs?: number;
  staleAfterMs?: number;
  poll: (signal: AbortSignal) => Promise<void>;
}

export interface UseSafePollingResult {
  refresh: () => Promise<void>;
  inFlight: boolean;
  error: string | null;
  isStale: boolean;
  lastRunAt: Date | null;
}

function isHidden(): boolean {
  return typeof document !== "undefined" && document.hidden;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : "Polling request failed.";
}

export function useSafePolling({
  enabled = true,
  immediate = true,
  intervalMs,
  minIntervalMs = 60_000,
  errorBackoffMs,
  staleAfterMs,
  poll,
}: UseSafePollingOptions): UseSafePollingResult {
  const [inFlight, setInFlight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(false);
  const pollRef = useRef(poll);
  const scheduleRef = useRef<(delayMs: number) => void>(() => {});
  const interval = Math.max(minIntervalMs, intervalMs);
  const backoff = Math.max(interval, errorBackoffMs ?? interval);
  const lastSuccessMsRef = useRef(0);

  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const run = useCallback(async (manual: boolean): Promise<void> => {
    if (!mountedRef.current) return;
    if (!manual && (!enabled || isHidden())) return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    setInFlight(true);

    try {
      await pollRef.current(controller.signal);
      if (!mountedRef.current) return;
      const now = Date.now();
      lastSuccessMsRef.current = now;
      setLastRunAt(new Date(now));
      setIsStale(false);
      setError(null);
      scheduleRef.current(interval);
    } catch (err) {
      if (!mountedRef.current || controller.signal.aborted) return;
      setError(formatError(err));
      if (lastSuccessMsRef.current > 0) setIsStale(true);
      scheduleRef.current(backoff);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      inFlightRef.current = false;
      if (mountedRef.current) setInFlight(false);
    }
  }, [backoff, enabled, interval]);

  const schedule = useCallback(
    (delayMs: number) => {
      clearTimer();
      if (!enabled || !mountedRef.current) return;
      timerRef.current = window.setTimeout(() => {
        if (isHidden()) {
          scheduleRef.current(interval);
          return;
        }
        void run(false);
      }, delayMs);
    },
    [clearTimer, enabled, interval, run],
  );

  useEffect(() => {
    scheduleRef.current = schedule;
  }, [schedule]);

  const refresh = useCallback(async () => {
    await run(true);
  }, [run]);

  useEffect(() => {
    mountedRef.current = true;
    schedule(immediate ? 0 : interval);

    const onVisibility = () => {
      if (!document.hidden && enabled) void run(false);
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mountedRef.current = false;
      clearTimer();
      abortRef.current?.abort();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [clearTimer, enabled, immediate, interval, run, schedule]);

  useEffect(() => {
    if (!staleAfterMs) return;
    const id = window.setInterval(() => {
      if (lastSuccessMsRef.current === 0) return;
      setIsStale(Date.now() - lastSuccessMsRef.current > staleAfterMs);
    }, Math.min(10_000, Math.max(1_000, Math.floor(staleAfterMs / 3))));
    return () => window.clearInterval(id);
  }, [staleAfterMs]);

  return { refresh, inFlight, error, isStale, lastRunAt };
}
