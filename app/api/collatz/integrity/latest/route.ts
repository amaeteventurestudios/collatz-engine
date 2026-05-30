import { getClient, jsonError } from "@/lib/collatz/api";
import { COLLATZ_CACHE_TTL_MS } from "@/lib/collatz/cache-policy";
import { getLatestIntegrityRun } from "@/lib/collatz/integrity-runs";
import {
  getCachedRead,
  logReadCacheDiagnostic,
  makeReadCacheHeaders,
} from "@/lib/collatz/read-cache";

export const dynamic = "force-dynamic";

function isUnrecordedRunError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("does not exist") || message.includes("collatz_integrity_runs");
}

async function readLatestIntegrityPayload() {
  const client = getClient();
  const latest = await getLatestIntegrityRun(client);

  if (!latest) {
    return {
      ok: false,
      latest: null,
      message: "No full integrity run has been recorded yet.",
    };
  }

  return { ok: true, latest };
}

export async function GET() {
  const startedAt = Date.now();
  const ttlMs = COLLATZ_CACHE_TTL_MS.PUBLIC_INTEGRITY_LATEST;

  try {
    const { data, meta } = await getCachedRead(
      "collatz:integrity-latest:v1",
      ttlMs,
      readLatestIntegrityPayload,
    );
    logReadCacheDiagnostic("api/collatz/integrity/latest", meta, startedAt, data);
    return Response.json(data, {
      headers: makeReadCacheHeaders(meta, { ttlMs, visibility: "public" }),
    });
  } catch (err) {
    if (isUnrecordedRunError(err)) {
      return Response.json({
        ok: false,
        latest: null,
        message: "No full integrity run has been recorded yet.",
      });
    }

    return jsonError("Unable to read latest integrity run.", 500);
  }
}
