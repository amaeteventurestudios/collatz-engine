"use client";

import { useEffect, useRef, useState } from "react";
import type { DashboardPayload } from "@/app/api/collatz/dashboard/route";

export type { DashboardPayload };

const POLL_MS = 10_000;

export function useDashboardData(): {
  data: DashboardPayload | null;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    async function poll() {
      try {
        const res = await fetch("/api/collatz/dashboard", {
          next: { revalidate: 10 },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as DashboardPayload;
        if (!mountedRef.current) return;
        setData(json);
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

  return { data, loading, error };
}
