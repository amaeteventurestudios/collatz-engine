import type { NextRequest } from "next/server";
import {
  getClient,
  jsonError,
  parseLimit,
  type PublicResultRow,
} from "@/lib/collatz/api";
import { COLLATZ_CACHE_TTL_MS } from "@/lib/collatz/cache-policy";
import {
  getCachedRead,
  logReadCacheDiagnostic,
  makeReadCacheHeaders,
} from "@/lib/collatz/read-cache";
import { readEngineState } from "@/lib/collatz/verify";

export const dynamic = "force-dynamic";

async function readVisualStudioPayload(limit: number) {
  const client = getClient();
  const { state, error: stateError } = await readEngineState(client);
  if (!state) throw new Error(stateError ?? "Live catalog state is unavailable.");
  const highestVerifiedN = state.last_checked_number ?? 0;

  const { data, error } = await client
    .from("collatz_results")
    .select("n, steps, peak, reached_one, created_at")
    .lte("n", highestVerifiedN)
    .order("n", { ascending: false })
    .limit(limit);

  if (error) throw new Error("Unable to load Visual Studio data right now.");

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    rows: (data ?? []) as PublicResultRow[],
    engineState: {
      current_status: state.current_status ?? null,
      total_numbers_checked: state.total_numbers_checked ?? 0,
      last_checked_number: state.last_checked_number ?? 0,
      worker_heartbeat_at: state.worker_heartbeat_at ?? null,
      longest_steps: state.longest_steps ?? null,
      highest_peak: state.highest_peak ?? null,
    },
  };
}

export async function GET(request: NextRequest) {
  const { limit, error } = parseLimit(
    request.nextUrl.searchParams.get("limit"),
    100,
    1_000,
  );
  if (error) return jsonError(error);

  const startedAt = Date.now();
  const ttlMs = COLLATZ_CACHE_TTL_MS.PUBLIC_VISUAL_STUDIO;

  try {
    const { data, meta } = await getCachedRead(
      `collatz:visual-studio:v1:limit=${limit}`,
      ttlMs,
      () => readVisualStudioPayload(limit),
    );
    logReadCacheDiagnostic("api/collatz/visual-studio", meta, startedAt, data);
    return Response.json(data, {
      headers: makeReadCacheHeaders(meta, { ttlMs, visibility: "public" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load Visual Studio data right now.";
    return jsonError(message, 500);
  }
}
