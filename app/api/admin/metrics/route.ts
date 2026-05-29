import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/admin/auth";
import {
  getEngineAdminState,
  getRecentActivityLogs,
  getThroughputHistory,
  getWorkerLockState,
} from "@/lib/admin/metrics";
import { getStorageMonitor } from "@/lib/admin/storage";
import { getR2Status } from "@/lib/admin/r2";

export const dynamic = "force-dynamic";

async function isAuthorized(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

export async function GET() {
  if (!(await isAuthorized())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [engine, storage, r2, throughput, activity, workerLock] =
    await Promise.all([
      getEngineAdminState(),
      getStorageMonitor(),
      getR2Status(),
      getThroughputHistory(40),
      getRecentActivityLogs(20),
      getWorkerLockState(),
    ]);

  return Response.json({
    engine: engine.data,
    engineConnected: engine.connected,
    engineError: engine.error,
    storage,
    r2,
    throughput: throughput.data,
    activity: activity.data,
    workerLock: workerLock.data,
    lockTableExists: workerLock.tableExists,
    fetchedAt: new Date().toISOString(),
  });
}
