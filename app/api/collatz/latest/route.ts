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

export async function GET(request: NextRequest) {
  const { limit, error: limitError } = parseLimit(request.nextUrl.searchParams.get("limit"));
  if (limitError) return jsonError(limitError);

  try {
    const client = getClient();
    const { state, error: stateError } = await readEngineState(client);
    if (!state) return jsonError(stateError ?? "Live catalog state is unavailable.", 503);
    const highestVerifiedN = state.last_checked_number ?? 0;

    const { data, error } = await client
      .from("collatz_results")
      .select("n, steps, peak, reached_one, created_at")
      .lte("n", highestVerifiedN)
      .order("n", { ascending: false })
      .limit(limit);

    if (error) return jsonError("Unable to read latest verified results.", 500);

    const rows = (data ?? []) as PublicResultRow[];
    return Response.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      highestVerifiedN,
      limit,
      count: rows.length,
      data: rows.map(toPublicResult),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to read latest verified results.";
    return jsonError(message, 500);
  }
}
