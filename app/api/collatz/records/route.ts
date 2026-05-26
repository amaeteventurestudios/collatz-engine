import { getClient, jsonError, toPublicResult, type PublicResultRow } from "@/lib/collatz/api";
import { readEngineState } from "@/lib/collatz/verify";

export const dynamic = "force-dynamic";

function bestPeakRatio(rows: PublicResultRow[]) {
  let best: PublicResultRow | null = null;
  let bestRatio = -Infinity;
  for (const row of rows) {
    const ratio = row.n > 0 ? row.peak / row.n : 0;
    if (ratio > bestRatio) {
      best = row;
      bestRatio = ratio;
    }
  }
  return best;
}

export async function GET() {
  try {
    const client = getClient();
    const stateResult = await readEngineState(client);
    if (!stateResult.state) return jsonError(stateResult.error ?? "Live catalog state is unavailable.", 503);
    const highestVerifiedN = stateResult.state.last_checked_number ?? 0;

    const [longest, highestPeak, peakRatioSample] = await Promise.all([
      client
        .from("collatz_results")
        .select("n, steps, peak, reached_one, created_at")
        .lte("n", highestVerifiedN)
        .order("steps", { ascending: false })
        .limit(1),
      client
        .from("collatz_results")
        .select("n, steps, peak, reached_one, created_at")
        .lte("n", highestVerifiedN)
        .order("peak", { ascending: false })
        .limit(1),
      client
        .from("collatz_results")
        .select("n, steps, peak, reached_one, created_at")
        .lte("n", highestVerifiedN)
        .order("peak", { ascending: false })
        .limit(1000),
    ]);

    if (longest.error || highestPeak.error || peakRatioSample.error) {
      return jsonError("Unable to read catalog records.", 500);
    }

    const ratioBest = bestPeakRatio((peakRatioSample.data ?? []) as PublicResultRow[]);

    return Response.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      catalogSize: stateResult.state.total_numbers_checked ?? 0,
      highestVerifiedN,
      longestTrajectoryRecord: longest.data?.[0]
        ? toPublicResult(longest.data[0] as PublicResultRow)
        : null,
      highestPeakRecord: highestPeak.data?.[0]
        ? toPublicResult(highestPeak.data[0] as PublicResultRow)
        : null,
      highestPeakRatioRecord: ratioBest ? toPublicResult(ratioBest) : null,
      highestPeakRatioRecordScope: "computed from the highest-peak catalog sample",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to read catalog records.";
    return jsonError(message, 500);
  }
}
