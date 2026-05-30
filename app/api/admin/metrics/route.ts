import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/admin/auth";
import {
  getEngineAdminState,
  getRecentActivityLogs,
  getThroughputHistory,
  getWorkerLockState,
  getDbRuntimeConfig,
} from "@/lib/admin/metrics";
import { getStorageMonitor } from "@/lib/admin/storage";
import { getR2Status } from "@/lib/admin/r2";
import { computeWatchdog } from "@/lib/admin/watchdog";
import { COLLATZ_CACHE_TTL_MS } from "@/lib/collatz/cache-policy";
import {
  getCachedRead,
  logReadCacheDiagnostic,
  makeReadCacheHeaders,
} from "@/lib/collatz/read-cache";

export const dynamic = "force-dynamic";

async function isAuthorized(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

async function readAdminMetricsPayload() {
  const [engine, storage, r2, throughput, activity, workerLock, runtimeConfig] =
    await Promise.all([
      getEngineAdminState(),
      getStorageMonitor(),
      getR2Status(),
      getThroughputHistory(40),
      getRecentActivityLogs(20),
      getWorkerLockState(),
      getDbRuntimeConfig(),
    ]);

  const watchdog = computeWatchdog({
    engine: engine.data,
    workerLock: workerLock.data,
    lockTableExists: workerLock.tableExists,
    storageStatus: storage.status,
    runtimeConfigExists: runtimeConfig.exists,
  });

  return {
    engine: engine.data,
    engineConnected: engine.connected,
    engineError: engine.error,
    storage,
    r2,
    throughput: throughput.data,
    activity: activity.data,
    workerLock: workerLock.data,
    lockTableExists: workerLock.tableExists,
    watchdog,
    runtimeConfigExists: runtimeConfig.exists,
    latestIntegrityRun: null,
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET() {
  if (!(await isAuthorized())) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const startedAt = Date.now();
  const ttlMs = COLLATZ_CACHE_TTL_MS.ADMIN_METRICS;

  try {
    const { data, meta } = await getCachedRead(
      "collatz:admin:metrics:v1",
      ttlMs,
      readAdminMetricsPayload,
    );
    logReadCacheDiagnostic("api/admin/metrics", meta, startedAt);
    return Response.json(data, {
      headers: makeReadCacheHeaders(meta, {
        ttlMs,
        visibility: "private",
        includeKey: false,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to read admin metrics.";
    return Response.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
