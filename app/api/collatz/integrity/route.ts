import { getClient, jsonError } from "@/lib/collatz/api";
import { getIntegritySummary } from "@/lib/collatz/verify";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = getClient();
    const summary = await getIntegritySummary(client);
    return Response.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to read integrity summary.";
    return jsonError(message, 500);
  }
}
