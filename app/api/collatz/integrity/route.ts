import { getClient, jsonError } from "@/lib/collatz/api";
import { COLLATZ_CACHE_TTL_MS } from "@/lib/collatz/cache-policy";
import {
  getCachedRead,
  logReadCacheDiagnostic,
  makeReadCacheHeaders,
} from "@/lib/collatz/read-cache";
import { getIntegritySummary } from "@/lib/collatz/verify";

export const dynamic = "force-dynamic";

async function readIntegrityPayload() {
  const client = getClient();
  return getIntegritySummary(client);
}

export async function GET() {
  const startedAt = Date.now();
  const ttlMs = COLLATZ_CACHE_TTL_MS.PUBLIC_INTEGRITY;

  try {
    const { data, meta } = await getCachedRead(
      "collatz:integrity:v1",
      ttlMs,
      readIntegrityPayload,
    );
    logReadCacheDiagnostic("api/collatz/integrity", meta, startedAt, data);
    return Response.json(data, {
      headers: makeReadCacheHeaders(meta, { ttlMs, visibility: "public" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to read integrity summary.";
    return jsonError(message, 500);
  }
}
