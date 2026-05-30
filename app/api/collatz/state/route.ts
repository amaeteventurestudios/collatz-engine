import { getClient, jsonError, runtimeSeconds, secondsSince } from "@/lib/collatz/api";
import { readEngineState } from "@/lib/collatz/verify";

export const dynamic = "force-dynamic";
// 10-second CDN / server cache; browsers may also serve stale for 5 s.
// Admin reads still work — the 10 s window is fine for observability.
const CACHE_HEADER = "public, s-maxage=10, stale-while-revalidate=5";

export async function GET() {
  try {
    const client = getClient();
    const { state, error } = await readEngineState(client);
    if (!state) return jsonError(error ?? "Live catalog state is unavailable.", 503);

    const batchSize = state.last_batch_size && state.last_batch_size > 0 ? state.last_batch_size : 100;
    const highestVerifiedN = state.last_checked_number ?? 0;
    const nextQueuedN = highestVerifiedN + 1;

    return Response.json({
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
    }, { headers: { "Cache-Control": CACHE_HEADER } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to read live state.";
    return jsonError(message, 500);
  }
}
