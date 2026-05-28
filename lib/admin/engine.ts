import "server-only";
import type { RuntimeConfig } from "./types";

export function getRuntimeConfig(): RuntimeConfig {
  return {
    mode: process.env.COLLATZ_WORKER_MODE ?? "safe",
    batchSize: parseInt(process.env.COLLATZ_RESULT_BATCH_SIZE ?? "50", 10),
    batchDelayMs: parseInt(process.env.COLLATZ_BATCH_DELAY_MS ?? "5000", 10),
    logIntervalMs: parseInt(process.env.COLLATZ_LOG_INTERVAL_MS ?? "60000", 10),
    storageMode: process.env.COLLATZ_STORAGE_MODE ?? "free-tier",
    keepRecentResults: parseInt(
      process.env.COLLATZ_KEEP_RECENT_RESULTS ?? "5000",
      10,
    ),
    activityLogRetentionRows: parseInt(
      process.env.COLLATZ_ACTIVITY_LOG_RETENTION_ROWS ?? "500",
      10,
    ),
    rangeSummaryInterval: parseInt(
      process.env.COLLATZ_RANGE_SUMMARY_INTERVAL ?? "100000",
      10,
    ),
    milestoneInterval: parseInt(
      process.env.COLLATZ_MILESTONE_INTERVAL ?? "1000000",
      10,
    ),
    autoThrottleEnabled: process.env.COLLATZ_AUTO_THROTTLE_ENABLED !== "false",
    pauseOnCriticalStorage:
      process.env.COLLATZ_PAUSE_ON_CRITICAL_STORAGE !== "false",
  };
}

export const MODE_PRESETS = {
  recovery: { batchSize: 25, batchDelayMs: 10000, logIntervalMs: 60000 },
  safe: { batchSize: 50, batchDelayMs: 5000, logIntervalMs: 60000 },
  normal: { batchSize: 250, batchDelayMs: 2000, logIntervalMs: 60000 },
} as const;

export function secondsSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function heartbeatStatus(
  ageSeconds: number | null,
): "live" | "delayed" | "stalled" | "unknown" {
  if (ageSeconds == null) return "unknown";
  if (ageSeconds <= 30) return "live";
  if (ageSeconds <= 120) return "delayed";
  return "stalled";
}
