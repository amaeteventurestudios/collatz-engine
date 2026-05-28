/**
 * Collatz Storage Cleanup Script
 *
 * Trims collatz_results and collatz_activity_logs to configured retention limits.
 * Uses the cleanup_collatz_storage RPC (service_role required).
 *
 * Usage:
 *   npm run collatz:cleanup
 *   npm run collatz:cleanup -- --keep-results 500 --keep-logs 100
 *
 * Never deletes:
 *   - collatz_engine_state
 *   - collatz_integrity_runs
 *   - collatz_record_events (if it exists)
 *   - collatz_range_summaries (if it exists)
 *   - collatz_archive_manifests (if it exists)
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = ReturnType<typeof createClient<any>>;

// ── Service-role client ────────────────────────────────────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "\n[Cleanup] ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.\n" +
        "  Add them to .env.local (they are already in .env.example).\n"
    );
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── CLI args ───────────────────────────────────────────────────────────────────

function parseArgs(): { keepResults: number; keepLogs: number } {
  const args = process.argv.slice(2);
  let keepResults = -1;
  let keepLogs = -1;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--keep-results" && args[i + 1]) {
      keepResults = parseInt(args[i + 1], 10);
    }
    if (args[i] === "--keep-logs" && args[i + 1]) {
      keepLogs = parseInt(args[i + 1], 10);
    }
  }

  return { keepResults, keepLogs };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

async function getRowCount(client: AnyClient, table: string): Promise<number | null> {
  try {
    const { count, error } = await client.from(table).select("*", { count: "exact", head: true });
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const { keepResults: cliKeepResults, keepLogs: cliKeepLogs } = parseArgs();

  const client = getServiceClient();

  console.log("\n┌──────────────────────────────────────────┐");
  console.log("│     Collatz Storage Cleanup               │");
  console.log("└──────────────────────────────────────────┘");

  // ── Read runtime config for defaults ─────────────────────────────────────
  let keepResults = cliKeepResults;
  let keepLogs = cliKeepLogs;

  let cfgData: Record<string, number> | null = null;
  try {
    const { data } = await client
      .from("collatz_engine_runtime_config")
      .select("keep_recent_results, activity_log_retention_rows")
      .eq("id", "main")
      .single();
    cfgData = data as Record<string, number> | null;
  } catch {
    // Table doesn't exist yet — use recovery defaults
  }

  if (keepResults < 0) {
    keepResults = cfgData?.keep_recent_results ?? 1_000;
  }
  if (keepLogs < 0) {
    keepLogs = cfgData?.activity_log_retention_rows ?? 250;
  }

  console.log(`\n  Config source  ${cfgData != null ? "collatz_engine_runtime_config" : "recovery defaults"}`);
  console.log(`  Keep results   ${fmt(keepResults)} rows`);
  console.log(`  Keep logs      ${fmt(keepLogs)} rows`);

  // ── Count rows before ─────────────────────────────────────────────────────
  console.log("\n  Counting rows before cleanup...");

  const [resultsBefore, logsBefore, engineState] = await Promise.all([
    getRowCount(client, "collatz_results"),
    getRowCount(client, "collatz_activity_logs"),
    getRowCount(client, "collatz_engine_state"),
  ]);

  console.log(`  collatz_results         ${resultsBefore != null ? fmt(resultsBefore) : "table not found"} rows`);
  console.log(`  collatz_activity_logs   ${logsBefore != null ? fmt(logsBefore) : "table not found"} rows`);
  console.log(`  collatz_engine_state    ${engineState != null ? fmt(engineState) : "table not found"} rows (NEVER touched)`);

  const needsCleanup =
    (resultsBefore != null && resultsBefore > keepResults) ||
    (logsBefore != null && logsBefore > keepLogs);

  if (!needsCleanup) {
    console.log("\n  ✓ Already within retention limits — nothing to delete.\n");
    return;
  }

  // ── Confirm safety check ──────────────────────────────────────────────────
  // Verify engine_state row is present before touching anything
  if (!engineState || engineState === 0) {
    console.error(
      "\n  ERROR: collatz_engine_state is empty or missing.\n" +
        "  Aborting cleanup to protect engine state.\n"
    );
    process.exit(1);
  }

  // ── Run cleanup RPC ───────────────────────────────────────────────────────
  console.log("\n  Running cleanup_collatz_storage RPC...");

  const { data, error } = await client.rpc("cleanup_collatz_storage", {
    p_keep_results: keepResults,
    p_keep_logs: keepLogs,
  });

  if (error) {
    console.error(
      "\n  ERROR: cleanup RPC failed.\n" +
        `  ${error.message}\n\n` +
        "  Make sure the cleanup_collatz_storage function was created by running:\n" +
        "    supabase/phase-2a-storage-guardrails.sql\n"
    );
    process.exit(1);
  }

  // ── Results ────────────────────────────────────────────────────────────────
  const r = data as Record<string, number>;

  console.log("\n  ┌─────────────────────────────────────────────┐");
  console.log("  │  Cleanup complete                            │");
  console.log("  └─────────────────────────────────────────────┘");
  console.log(`\n  collatz_results`);
  console.log(`    Before   ${fmt(r.results_before ?? 0)}`);
  console.log(`    After    ${fmt(r.results_after ?? 0)}`);
  console.log(`    Deleted  ${fmt(r.results_deleted ?? 0)}`);
  console.log(`\n  collatz_activity_logs`);
  console.log(`    Before   ${fmt(r.logs_before ?? 0)}`);
  console.log(`    After    ${fmt(r.logs_after ?? 0)}`);
  console.log(`    Deleted  ${fmt(r.logs_deleted ?? 0)}`);

  // ── Verify engine state still intact ─────────────────────────────────────
  const engineStateAfter = await getRowCount(client, "collatz_engine_state");
  if (!engineStateAfter || engineStateAfter === 0) {
    console.error("\n  CRITICAL: collatz_engine_state appears to have been deleted!");
    process.exit(1);
  }
  console.log(`\n  ✓ collatz_engine_state preserved (${engineStateAfter} row)\n`);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`\n[Cleanup] Fatal error: ${msg}`);
  process.exit(1);
});
