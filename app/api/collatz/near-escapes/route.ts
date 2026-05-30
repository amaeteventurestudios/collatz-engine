import type { NextRequest } from "next/server";
import {
  getClient,
  jsonError,
  parseLimit,
  toPublicResult,
  type PublicResultRow,
} from "@/lib/collatz/api";
import { COLLATZ_CACHE_TTL_MS } from "@/lib/collatz/cache-policy";
import {
  getCachedRead,
  logReadCacheDiagnostic,
  makeReadCacheHeaders,
} from "@/lib/collatz/read-cache";
import { readEngineState } from "@/lib/collatz/verify";

export const dynamic = "force-dynamic";

const ALLOWED_SORTS = ["peak_ratio", "steps", "peak", "n"] as const;
type SortKey = (typeof ALLOWED_SORTS)[number];

function parseSort(value: string | null): { sort: SortKey; error: string | null } {
  if (!value) return { sort: "peak_ratio", error: null };
  if ((ALLOWED_SORTS as readonly string[]).includes(value)) {
    return { sort: value as SortKey, error: null };
  }
  return { sort: "peak_ratio", error: "sort must be one of peak_ratio, steps, peak, or n." };
}

function rank(rows: PublicResultRow[], sort: SortKey): PublicResultRow[] {
  return [...rows].sort((a, b) => {
    if (sort === "peak_ratio") return b.peak / b.n - a.peak / a.n;
    if (sort === "steps") return b.steps - a.steps;
    if (sort === "peak") return b.peak - a.peak;
    return b.n - a.n;
  });
}

async function readNearEscapesPayload(limit: number, sort: SortKey) {
  const client = getClient();
  const { state, error: stateError } = await readEngineState(client);
  if (!state) throw new Error(stateError ?? "Live catalog state is unavailable.");
  const highestVerifiedN = state.last_checked_number ?? 0;
  const queryLimit = sort === "peak_ratio" ? Math.max(1000, limit) : limit;
  const orderColumn = sort === "peak_ratio" ? "peak" : sort;
  const { data, error } = await client
    .from("collatz_results")
    .select("n, steps, peak, reached_one, created_at")
    .lte("n", highestVerifiedN)
    .order(orderColumn, { ascending: false })
    .limit(queryLimit);

  if (error) throw new Error("Unable to read near-escape candidates.");

  const rows = rank((data ?? []) as PublicResultRow[], sort).slice(0, limit);
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    highestVerifiedN,
    limit,
    sort,
    count: rows.length,
    data: rows.map((row) => ({
      ...toPublicResult(row),
      flags: [
        row.n > 0 && row.peak / row.n > 50 ? "high_peak_ratio" : null,
        row.steps > 150 ? "long_path" : null,
      ].filter(Boolean),
    })),
    scope: sort === "peak_ratio" ? "ranked from the highest-peak catalog sample" : "ranked directly by selected metric",
  };
}

export async function GET(request: NextRequest) {
  const { limit, error: limitError } = parseLimit(request.nextUrl.searchParams.get("limit"));
  if (limitError) return jsonError(limitError);

  const { sort, error: sortError } = parseSort(request.nextUrl.searchParams.get("sort"));
  if (sortError) return jsonError(sortError);

  const startedAt = Date.now();
  const ttlMs = COLLATZ_CACHE_TTL_MS.PUBLIC_NEAR_ESCAPES;

  try {
    const { data, meta } = await getCachedRead(
      `collatz:near-escapes:v1:limit=${limit}:sort=${sort}`,
      ttlMs,
      () => readNearEscapesPayload(limit, sort),
    );
    logReadCacheDiagnostic("api/collatz/near-escapes", meta, startedAt, data);
    return Response.json(data, {
      headers: makeReadCacheHeaders(meta, { ttlMs, visibility: "public" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to read near-escape candidates.";
    return jsonError(message, 500);
  }
}
