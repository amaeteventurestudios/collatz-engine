import { getClient, jsonError } from "@/lib/collatz/api";
import { getPublicHealthSnapshot } from "@/lib/collatz/health";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = getClient();
    const snapshot = await getPublicHealthSnapshot(client);
    return Response.json(snapshot);
  } catch {
    return jsonError("Unable to read public health status.", 500);
  }
}
