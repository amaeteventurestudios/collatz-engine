/**
 * Read-only Collatz worker health check.
 *
 * Usage:
 *   npm run collatz:health
 *   npm run collatz:health -- --persist
 */

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import {
  assessWorkerHealth,
  recordWorkerHealthEventIfNeeded,
} from "@/lib/collatz/health";
import { readEngineState } from "@/lib/collatz/verify";

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const shouldPersist = process.argv.includes("--persist");

function fmt(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "unknown";
  return value.toLocaleString("en-US");
}

function prefix(status: string): "PASS" | "WARN" | "FAIL" | "INFO" {
  if (status === "live") return "PASS";
  if (status === "delayed") return "WARN";
  if (status === "stalled" || status === "error") return "FAIL";
  return "INFO";
}

async function main() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("FAIL Supabase configuration");
    console.error("     NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
    process.exit(1);
  }

  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { state, error } = await readEngineState(client);
  if (!state) {
    console.error(`FAIL Worker state unavailable: ${error ?? "state row not found"}`);
    process.exit(1);
  }

  const assessment = assessWorkerHealth(state);
  const catalog = fmt(state.total_numbers_checked ?? 0);
  const heartbeat = assessment.heartbeatAgeSeconds;
  const heartbeatCopy = heartbeat == null ? "heartbeat unknown" : `heartbeat ${fmt(heartbeat)}s ago`;

  if (assessment.status === "live") {
    console.log(`${prefix(assessment.status)} Worker live, ${heartbeatCopy}, catalog ${catalog}.`);
  } else if (assessment.status === "delayed") {
    console.log(`${prefix(assessment.status)} Worker delayed, ${heartbeatCopy}.`);
  } else if (assessment.status === "stalled") {
    console.log(`${prefix(assessment.status)} Worker stalled, ${heartbeatCopy}.`);
  } else if (assessment.status === "error") {
    console.log(`${prefix(assessment.status)} Worker error, ${state.last_error ?? "last error set"}.`);
  } else {
    console.log(`${prefix(assessment.status)} Worker stopped by status "${state.current_status ?? "unknown"}".`);
  }

  if (shouldPersist) {
    const event = await recordWorkerHealthEventIfNeeded(client, state, assessment);
    console.log(
      event.inserted
        ? `INFO Persisted operational event: ${event.eventType}.`
        : `INFO No new operational event needed (${event.eventType}).`,
    );
  }

  if (assessment.status === "stalled" || assessment.status === "error") process.exit(1);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`FAIL Health check failed: ${message}`);
  process.exit(1);
});
