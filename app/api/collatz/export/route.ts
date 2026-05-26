import type { NextRequest } from "next/server";
import {
  EXPORT_DEFAULT_LIMIT,
  EXPORT_MAX_LIMIT,
  getClient,
  jsonError,
  parseLimit,
  parseOffset,
  parseOrder,
  toPublicResult,
  type PublicResultRow,
} from "@/lib/collatz/api";
import { readEngineState } from "@/lib/collatz/verify";

export const dynamic = "force-dynamic";

const CSV_FIELDS = ["n", "steps_to_one", "highest_peak", "peak_ratio", "reached_one", "cataloged_at"] as const;

function parseFormat(value: string | null): { format: "json" | "csv"; error: string | null } {
  if (!value) return { format: "json", error: null };
  if (value === "json" || value === "csv") return { format: value, error: null };
  return { format: "json", error: "format must be json or csv." };
}

function csvEscape(value: unknown): string {
  if (value == null) return "";
  const raw = String(value);
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function toCsv(data: ReturnType<typeof toPublicResult>[]): string {
  const lines = [CSV_FIELDS.join(",")];
  for (const row of data) {
    lines.push(CSV_FIELDS.map((field) => csvEscape(row[field])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export async function GET(request: NextRequest) {
  const { format, error: formatError } = parseFormat(request.nextUrl.searchParams.get("format"));
  if (formatError) return jsonError(formatError);

  const { limit, error: limitError } = parseLimit(
    request.nextUrl.searchParams.get("limit"),
    EXPORT_DEFAULT_LIMIT,
    EXPORT_MAX_LIMIT,
  );
  if (limitError) return jsonError(limitError);

  const { offset, error: offsetError } = parseOffset(request.nextUrl.searchParams.get("offset"));
  if (offsetError) return jsonError(offsetError);

  const { order, error: orderError } = parseOrder(request.nextUrl.searchParams.get("order"));
  if (orderError) return jsonError(orderError);

  try {
    const client = getClient();
    const { state, error: stateError } = await readEngineState(client);
    if (!state) return jsonError(stateError ?? "Live catalog state is unavailable.", 503);
    const highestVerifiedN = state.last_checked_number ?? 0;
    const from = offset;
    const to = offset + limit - 1;
    const { data, error } = await client
      .from("collatz_results")
      .select("n, steps, peak, reached_one, created_at")
      .lte("n", highestVerifiedN)
      .order("n", { ascending: order === "asc" })
      .range(from, to);

    if (error) return jsonError("Unable to export catalog sample.", 500);

    const rows = ((data ?? []) as PublicResultRow[]).map(toPublicResult);
    const generatedAt = new Date().toISOString();

    if (format === "csv") {
      return new Response(toCsv(rows), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="collatz-catalog-sample-${generatedAt.slice(0, 10)}.csv"`,
        },
      });
    }

    return Response.json({
      ok: true,
      generatedAt,
      highestVerifiedN,
      limit,
      offset,
      order,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to export catalog sample.";
    return jsonError(message, 500);
  }
}
