import {
  COLLATZ_ROUTE_VERSION,
  secondsFromMs,
} from "@/lib/collatz/cache-policy";

export type ReadCacheStatus = "HIT" | "MISS" | "STALE" | "BYPASS";

export interface ReadCacheMetadata {
  status: ReadCacheStatus;
  cachedAt: number;
  expiresAt: number;
  key: string;
  error?: string;
}

export interface CachedReadResult<T> {
  data: T;
  meta: ReadCacheMetadata;
}

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  refresh?: Promise<T>;
  error?: string;
}

interface ReadCacheOptions {
  bypass?: boolean;
}

interface CacheHeaderOptions {
  ttlMs: number;
  visibility: "public" | "private";
  includeKey?: boolean;
  staleWhileRevalidateMs?: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function refreshEntry<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  entry?: CacheEntry<unknown>,
): Promise<T> {
  const refresh = (async () => fetcher())();
  cache.set(key, {
    ...(entry ?? {}),
    refresh,
  } as CacheEntry<unknown>);

  try {
    const data = await refresh;
    const now = Date.now();
    cache.set(key, {
      data,
      cachedAt: now,
      expiresAt: now + ttlMs,
    });
    return data;
  } catch (err) {
    const current = cache.get(key);
    if (current) {
      current.refresh = undefined;
      current.error = errorMessage(err);
      cache.set(key, current);
    }
    throw err;
  }
}

export async function getCachedRead<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  options: ReadCacheOptions = {},
): Promise<CachedReadResult<T>> {
  const now = Date.now();

  if (options.bypass) {
    const data = await fetcher();
    return {
      data,
      meta: {
        status: "BYPASS",
        cachedAt: now,
        expiresAt: now,
        key,
      },
    };
  }

  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry?.data !== undefined && now < entry.expiresAt) {
    return {
      data: entry.data,
      meta: {
        status: "HIT",
        cachedAt: entry.cachedAt,
        expiresAt: entry.expiresAt,
        key,
      },
    };
  }

  try {
    const data = await (entry?.refresh ?? refreshEntry<T>(key, ttlMs, fetcher, entry));
    const refreshed = cache.get(key) as CacheEntry<T> | undefined;
    return {
      data,
      meta: {
        status: "MISS",
        cachedAt: refreshed?.cachedAt ?? Date.now(),
        expiresAt: refreshed?.expiresAt ?? Date.now() + ttlMs,
        key,
      },
    };
  } catch (err) {
    if (entry?.data !== undefined) {
      return {
        data: entry.data,
        meta: {
          status: "STALE",
          cachedAt: entry.cachedAt,
          expiresAt: entry.expiresAt,
          key,
          error: errorMessage(err),
        },
      };
    }
    throw err;
  }
}

export function makeReadCacheHeaders(
  meta: ReadCacheMetadata,
  options: CacheHeaderOptions,
): Record<string, string> {
  const ttlSeconds = secondsFromMs(options.ttlMs);
  const swrSeconds = secondsFromMs(options.staleWhileRevalidateMs ?? 30_000);
  const headers: Record<string, string> = {
    "X-Collatz-Cache": meta.status,
    "X-Collatz-Route-Version": COLLATZ_ROUTE_VERSION,
  };

  if (options.includeKey !== false) {
    headers["X-Collatz-Cache-Key"] = meta.key;
  }

  if (options.visibility === "public") {
    const browserDirective = `public, max-age=0, s-maxage=${ttlSeconds}, stale-while-revalidate=${swrSeconds}`;
    const cdnDirective = `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${swrSeconds}`;
    headers["Cache-Control"] = browserDirective;
    headers["CDN-Cache-Control"] = cdnDirective;
    headers["Vercel-CDN-Cache-Control"] = cdnDirective;
  } else {
    headers["Cache-Control"] = `private, max-age=0, stale-while-revalidate=${swrSeconds}`;
  }

  return headers;
}

export function logReadCacheDiagnostic(
  routeName: string,
  meta: ReadCacheMetadata,
  startedAtMs: number,
  payload?: unknown,
): void {
  if (process.env.NODE_ENV !== "development") return;

  let payloadBytes: number | null = null;
  if (payload !== undefined) {
    try {
      payloadBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
    } catch {
      payloadBytes = null;
    }
  }

  const durationMs = Date.now() - startedAtMs;
  const details = [
    `route=${routeName}`,
    `status=${meta.status}`,
    `ts=${new Date().toISOString()}`,
    `durationMs=${durationMs}`,
    payloadBytes == null ? null : `payloadBytes=${payloadBytes}`,
  ].filter(Boolean);

  console.info(`[Collatz Read Cache] ${details.join(" ")}`);
}
