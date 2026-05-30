"use client";

import { useEffect, useRef, useState } from "react";
import type { DashboardPayload } from "@/app/api/collatz/dashboard/route";

export type { DashboardPayload };

// ── Poll interval ─────────────────────────────────────────────────────────────
// Reads NEXT_PUBLIC_PUBLIC_DASHBOARD_POLL_MS at build time.
// Clamped to [30 000, 300 000] ms. Defaults to 60 000 (60 s).
function resolvePollMs(): number {
  const raw = process.env.NEXT_PUBLIC_PUBLIC_DASHBOARD_POLL_MS;
  const n = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n) || n < 30_000) return 60_000;
  return Math.min(n, 300_000);
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
} {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    async function poll() {
      try {
        const res = await fetch("/api/collatz/dashboard");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as DashboardPayload;
        if (!mountedRef.current) return;
        setData(json);
        setLastUpdatedAt(json.generatedAt ? new Date(json.generatedAt) : new Date());
        setError(null);
      } catch (err) {
        if (!mountedRef.current) return;
        setError(
          err instanceof Error ? err.message : "Dashboard data unavailable",
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
  }, []);

  return { data, loading, error, lastUpdatedAt, pollIntervalMs: POLL_MS };
}
