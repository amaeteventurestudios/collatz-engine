import { NextRequest, NextResponse } from "next/server";
import { runAutonomousBatch } from "@/lib/collatz/autonomous-runner";

/**
 * POST /api/collatz/run-batch
 *
 * Body (optional): { "batchSize": 100 }
 *
 * Runs the next autonomous batch starting from last_checked_number + 1,
 * writes results to Supabase, and returns a summary.
 */
export async function POST(request: NextRequest) {
  try {
    let batchSize = 100;

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const body: unknown = await request.json();
        if (
          body !== null &&
          typeof body === "object" &&
          "batchSize" in body &&
          body.batchSize !== undefined
        ) {
          batchSize = (body as { batchSize: number }).batchSize;
        }
      } catch {
        // Malformed body — fall through to default batchSize
      }
    }

    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 10_000) {
      return NextResponse.json(
        { ok: false, error: "batchSize must be an integer between 1 and 10000" },
        { status: 400 },
      );
    }

    const result = await runAutonomousBatch({ batchSize });

    return NextResponse.json({
      ok: true,
      batchStart: result.batchStart,
      batchEnd: result.batchEnd,
      numbersProcessed: result.numbersProcessed,
    });
  } catch (err) {
    console.error("[Collatz API] run-batch failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
