import type { NextRequest } from "next/server";
import {
  getClient,
  jsonError,
  parseLimit,
} from "@/lib/collatz/api";
import { COLLATZ_CACHE_TTL_MS } from "@/lib/collatz/cache-policy";
import {
  getCachedRead,
  logReadCacheDiagnostic,
  makeReadCacheHeaders,
} from "@/lib/collatz/read-cache";
import { readEngineState } from "@/lib/collatz/verify";

export const dynamic = "force-dynamic";

interface AnalyticsChartRow {
  n: number;
  steps: number;
  peak: number;
}

interface AnalyticsRecordRow extends AnalyticsChartRow {
  created_at: string | null;
}

async function readAnalyticsPayload(chartLimit: number, recordLimit: number) {
  const client = getClient();
  const { state, error: stateError } = await readEngineState(client);
  if (!state) throw new Error(stateError ?? "Live catalog state is unavailable.");
  const highestVerifiedN = state.last_checked_number ?? 0;

  const [chartRes, stepsRes, peakRes] = await Promise.all([
    client
      .from("collatz_results")
      .select("n, steps, peak")
      .lte("n", highestVerifiedN)
      .order("n", { ascending: false })
      .limit(chartLimit),
    client
      .from("collatz_results")
      .select("n, steps, peak, created_at")
      .lte("n", highestVerifiedN)
      .order("steps", { ascending: false })
      .limit(recordLimit),
    client
      .from("collatz_results")
      .select("n, steps, peak, created_at")
      .lte("n", highestVerifiedN)
      .order("peak", { ascending: false })
      .limit(recordLimit),
  ]);

  if (chartRes.error || stepsRes.error || peakRes.error) {
    throw new Error("Failed to load analytics data.");
  }

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    highestVerifiedN,
    chartResults: [...((chartRes.data ?? []) as AnalyticsChartRow[])].sort((a, b) => a.n - b.n),
    topBySteps: (stepsRes.data ?? []) as AnalyticsRecordRow[],
    topByPeak: (peakRes.data ?? []) as AnalyticsRecordRow[],
  };
}

export async function GET(request: NextRequest) {
  const chartLimitResult = parseLimit(
    request.nextUrl.searchParams.get("chartLimit"),
    500,
    1_000,
  );
  if (chartLimitResult.error) return jsonError(chartLimitResult.error);

  const recordLimitResult = parseLimit(
    request.nextUrl.searchParams.get("recordLimit"),
    25,
    100,
  );
  if (recordLimitResult.error) return jsonError(recordLimitResult.error);

  const startedAt = Date.now();
  const ttlMs = COLLATZ_CACHE_TTL_MS.PUBLIC_ANALYTICS;

  try {
    const { data, meta } = await getCachedRead(
      `collatz:analytics:v1:chart=${chartLimitResult.limit}:records=${recordLimitResult.limit}`,
      ttlMs,
      () => readAnalyticsPayload(chartLimitResult.limit, recordLimitResult.limit),
    );
    logReadCacheDiagnostic("api/collatz/analytics", meta, startedAt, data);
    return Response.json(data, {
      headers: makeReadCacheHeaders(meta, { ttlMs, visibility: "public" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load analytics data.";
    return jsonError(message, 500);
  }
}
