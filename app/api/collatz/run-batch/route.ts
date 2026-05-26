import { NextRequest, NextResponse } from "next/server";
import { runAutonomousBatch } from "@/lib/collatz/autonomous-runner";

const DEFAULT_BATCH_SIZE = 100;

/**
 * Validate the request secret.
 *
 * If COLLATZ_CRON_SECRET is set in the environment, every request must include
 * one of the following headers:
 *
 *   x-collatz-cron-secret: <secret>      – for POST from internal/admin callers
 *   authorization: Bearer <secret>       – Vercel Cron Authorization pattern
 *
 * NOTE: Vercel Cron does not support sending arbitrary custom headers.
 * To protect GET requests from Vercel Cron, set COLLATZ_CRON_SECRET in your
 * Vercel project settings to match Vercel's auto-generated CRON_SECRET. Vercel
 * will then send: Authorization: Bearer <CRON_SECRET> on every cron invocation.
 *
 * If you need a query-param fallback instead, replace the authorization check
 * below with: request.nextUrl.searchParams.get("secret") === secret
 */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.COLLATZ_CRON_SECRET;
  if (!secret) return true; // No secret configured — allow all (local development)

  const customHeader = request.headers.get("x-collatz-cron-secret");
  if (customHeader === secret) return true;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  return false;
}

type BatchOutcome =
  | { ok: false; error: string; status: 400 }
  | {
      ok: true;
      result: { batchStart: number; batchEnd: number; numbersProcessed: number };
    };

async function executeBatch(batchSize: number): Promise<BatchOutcome> {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 10_000) {
    return {
      ok: false,
      error: "batchSize must be an integer between 1 and 10000",
      status: 400,
    };
  }
  const result = await runAutonomousBatch({ batchSize });
  return { ok: true, result };
}

/**
 * GET /api/collatz/run-batch
 *
 * Invoked by Vercel Cron (vercel.json schedule: "* * * * *").
 * Processes the next DEFAULT_BATCH_SIZE numbers and advances engine state.
 *
 * Protected by COLLATZ_CRON_SECRET when set (see isAuthorized above).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const outcome = await executeBatch(DEFAULT_BATCH_SIZE);
    if (!outcome.ok) {
      return NextResponse.json({ ok: false, error: outcome.error }, { status: outcome.status });
    }
    return NextResponse.json({
      ok: true,
      batchStart: outcome.result.batchStart,
      batchEnd: outcome.result.batchEnd,
      numbersProcessed: outcome.result.numbersProcessed,
    });
  } catch (err) {
    console.error("[Collatz API] GET run-batch failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/collatz/run-batch
 *
 * Body (optional): { "batchSize": 100 }
 * Header required (if COLLATZ_CRON_SECRET is set): x-collatz-cron-secret: <secret>
 *
 * For internal/admin use (e.g. admin dashboard, CLI wrappers).
 * Protected by COLLATZ_CRON_SECRET when set.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    let batchSize = DEFAULT_BATCH_SIZE;

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const body: unknown = await request.json();
        if (
          body !== null &&
          typeof body === "object" &&
          "batchSize" in body &&
          (body as { batchSize: unknown }).batchSize !== undefined
        ) {
          batchSize = (body as { batchSize: number }).batchSize;
        }
      } catch {
        // Malformed body — fall through to default batchSize
      }
    }

    const outcome = await executeBatch(batchSize);
    if (!outcome.ok) {
      return NextResponse.json({ ok: false, error: outcome.error }, { status: outcome.status });
    }
    return NextResponse.json({
      ok: true,
      batchStart: outcome.result.batchStart,
      batchEnd: outcome.result.batchEnd,
      numbersProcessed: outcome.result.numbersProcessed,
    });
  } catch (err) {
    console.error("[Collatz API] POST run-batch failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
