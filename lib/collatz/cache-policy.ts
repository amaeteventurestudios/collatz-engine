export const COLLATZ_ROUTE_VERSION = "read-cache-v1";

export const COLLATZ_CACHE_TTL_MS = {
  PUBLIC_DASHBOARD: 120_000,
  PUBLIC_STATE: 120_000,
  PUBLIC_LATEST: 120_000,
  PUBLIC_RECORDS: 300_000,
  PUBLIC_ALL_TIME_RECORDS: 300_000,
  PUBLIC_NEAR_ESCAPES: 300_000,
  PUBLIC_HEALTH: 60_000,
  PUBLIC_INTEGRITY: 120_000,
  PUBLIC_INTEGRITY_LATEST: 120_000,
  PUBLIC_ANALYTICS: 300_000,
  PUBLIC_VISUAL_STUDIO: 300_000,
  PUBLIC_OBSERVATORY: 300_000,
  ADMIN_METRICS: 30_000,
} as const;

export const COLLATZ_POLL_MS = {
  PUBLIC_DASHBOARD: 120_000,
  PUBLIC_RECORDS: 120_000,
  PUBLIC_HEALTH: 120_000,
  PUBLIC_INTEGRITY: 120_000,
  PUBLIC_ANALYTICS: 300_000,
  PUBLIC_VISUAL_STUDIO: 300_000,
  ADMIN_ACTIVITY_LOG: 30_000,
  ADMIN_METRICS: 30_000,
} as const;

export function secondsFromMs(ms: number): number {
  return Math.max(1, Math.ceil(ms / 1_000));
}

export function clampClientPollMs(
  value: string | number | null | undefined,
  fallbackMs: number,
  minMs = 60_000,
  maxMs = 300_000,
): number {
  const parsed = typeof value === "number" ? value : value ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(parsed)) return fallbackMs;
  return Math.min(maxMs, Math.max(minMs, parsed));
}
