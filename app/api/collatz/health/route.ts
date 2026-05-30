import { getClient, jsonError } from "@/lib/collatz/api";
import { COLLATZ_CACHE_TTL_MS } from "@/lib/collatz/cache-policy";
import { getPublicHealthSnapshot } from "@/lib/collatz/health";
import {
  getCachedRead,
  logReadCacheDiagnostic,
  makeReadCacheHeaders,
} from "@/lib/collatz/read-cache";

export const dynamic = "force-dynamic";

async function readHealthPayload() {
  const client = getClient();
  return getPublicHealthSnapshot(client);
}

export async function GET() {
  const startedAt = Date.now();
  const ttlMs = COLLATZ_CACHE_TTL_MS.PUBLIC_HEALTH;

  try {
    const { data, meta } = await getCachedRead(
      "collatz:health:v1",
      ttlMs,
      readHealthPayload,
    );
    logReadCacheDiagnostic("api/collatz/health", meta, startedAt, data);
    return Response.json(data, {
      headers: makeReadCacheHeaders(meta, { ttlMs, visibility: "public" }),
    });
  } catch {
    return jsonError("Unable to read public health status.", 500);
  }
}
