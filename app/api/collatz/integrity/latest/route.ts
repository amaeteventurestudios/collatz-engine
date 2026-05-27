import { getClient, jsonError } from "@/lib/collatz/api";
import { getLatestIntegrityRun } from "@/lib/collatz/integrity-runs";

export const dynamic = "force-dynamic";

function isUnrecordedRunError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("does not exist") || message.includes("collatz_integrity_runs");
}

export async function GET() {
  try {
    const client = getClient();
    const latest = await getLatestIntegrityRun(client);

    if (!latest) {
      return Response.json({
        ok: false,
        latest: null,
        message: "No full integrity run has been recorded yet.",
      });
    }

    return Response.json({ ok: true, latest });
  } catch (err) {
    if (isUnrecordedRunError(err)) {
      return Response.json({
        ok: false,
        latest: null,
        message: "No full integrity run has been recorded yet.",
      });
    }

    return jsonError("Unable to read latest integrity run.", 500);
  }
}
