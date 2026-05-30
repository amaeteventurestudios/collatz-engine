import { getClient, jsonError, runtimeSeconds, secondsSince } from "@/lib/collatz/api";
import { COLLATZ_CACHE_TTL_MS } from "@/lib/collatz/cache-policy";
import {
  getCachedRead,
  logReadCacheDiagnostic,
  makeReadCacheHeaders,
} from "@/lib/collatz/read-cache";
import { readEngineState } from "@/lib/collatz/verify";

export const dynamic = "force-dynamic";

async function readStatePayload() {
  const client = getClient();
  const { state, error } = await readEngineState(client);
  if (!state) throw new Error(error ?? "Live catalog state is unavailable.");

  const batchSize = state.last_batch_size && state.last_batch_size > 0 ? state.last_batch_size : 100;
  const highestVerifiedN = state.last_checked_number ?? 0;
  const nextQueuedN = highestVerifiedN + 1;

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    status: state.current_status ?? "unknown",
    numbersCataloged: state.total_numbers_checked ?? 0,
    highestVerifiedN,
    currentlyAnalyzingN: nextQueuedN,
    nextQueuedN,
    lastVerifiedBatch: {
      start: highestVerifiedN > 0 ? Math.max(1, highestVerifiedN - batchSize + 1) : 0,
      end: highestVerifiedN,
      size: batchSize,
    },
    nextBatchQueued: {
      start: nextQueuedN,
      end: highestVerifiedN + batchSize,
      size: batchSize,
    },
    throughput: {
      numbersPerSecond: state.numbers_per_second ?? 0,
      lastBatchDurationMs: state.last_batch_duration_ms ?? 0,
    },
    heartbeatAgeSeconds: secondsSince(state.worker_heartbeat_at),
    runtimeSeconds: runtimeSeconds(state.started_at),
    startedAt: state.started_at ?? null,
  };
}

export async function GET() {
  const startedAt = Date.now();
  const ttlMs = COLLATZ_CACHE_TTL_MS.PUBLIC_STATE;

  try {
    const { data, meta } = await getCachedRead(
      "collatz:state:v1",
      ttlMs,
      readStatePayload,
    );
    logReadCacheDiagnostic("api/collatz/state", meta, startedAt, data);
    return Response.json(data, {
      headers: makeReadCacheHeaders(meta, { ttlMs, visibility: "public" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to read live state.";
    return jsonError(message, message === "Live catalog is unavailable." ? 503 : 500);
  }
}
