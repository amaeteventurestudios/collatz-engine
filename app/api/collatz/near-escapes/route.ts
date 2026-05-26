import type { NextRequest } from "next/server";
import {
  getClient,
  jsonError,
  parseLimit,
  toPublicResult,
  type PublicResultRow,
} from "@/lib/collatz/api";
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

export async function GET(request: NextRequest) {
  const { limit, error: limitError } = parseLimit(request.nextUrl.searchParams.get("limit"));
  if (limitError) return jsonError(limitError);

  const { sort, error: sortError } = parseSort(request.nextUrl.searchParams.get("sort"));
  if (sortError) return jsonError(sortError);

  try {
    const client = getClient();
    const { state, error: stateError } = await readEngineState(client);
    if (!state) return jsonError(stateError ?? "Live catalog state is unavailable.", 503);
    const highestVerifiedN = state.last_checked_number ?? 0;
    const queryLimit = sort === "peak_ratio" ? Math.max(1000, limit) : limit;
    const orderColumn = sort === "peak_ratio" ? "peak" : sort;
    const { data, error } = await client
      .from("collatz_results")
      .select("n, steps, peak, reached_one, created_at")
      .lte("n", highestVerifiedN)
      .order(orderColumn, { ascending: false })
      .limit(queryLimit);

    if (error) return jsonError("Unable to read near-escape candidates.", 500);

    const rows = rank((data ?? []) as PublicResultRow[], sort).slice(0, limit);
    return Response.json({
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
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to read near-escape candidates.";
    return jsonError(message, 500);
  }
}
