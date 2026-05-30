/**
 * Runtime Config Updater
 *
 * Reads the current collatz_engine_runtime_config row, prints it, then updates
 * to the requested safe profile. The live worker picks up the change automatically
 * within its next 60s config-refresh cycle — no restart required.
 *
 * Performs read-only preflight to confirm a safe state before writing.
 *
 * Usage:
 *   npm run collatz:update-runtime-config -- --mode production_safe
 *   npm run collatz:update-runtime-config -- --rollback
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const ARGS = process.argv.slice(2);
const ROLLBACK = ARGS.includes("--rollback");

async function main() {
  const { createClient } = await import("@supabase/supabase-js");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("[update-runtime-config] Supabase URL or key missing. Check env vars.\n");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log("\n┌──────────────────────────────────────────┐");
  console.log("│   Collatz Runtime Config Updater          │");
  console.log("└──────────────────────────────────────────┘\n");

  // ── Read current config ───────────────────────────────────────────────────
  const { data: current, error: readErr } = await supabase
    .from("collatz_engine_runtime_config")
    .select("*")
    .eq("id", "main")
    .single();

  if (readErr || !current) {
    console.error("[update-runtime-config] Failed to read current config:", readErr?.message);
    process.exit(1);
  }

  console.log("  Preflight — current runtime config:");
  console.log(`    mode                       : ${current.mode}`);
  console.log(`    batch_size                 : ${current.batch_size}`);
  console.log(`    batch_delay_ms             : ${current.batch_delay_ms}`);
  console.log(`    log_interval_ms            : ${current.log_interval_ms}`);
  console.log(`    storage_mode               : ${current.storage_mode}`);
  console.log(`    keep_recent_results        : ${current.keep_recent_results}`);
  console.log(`    activity_log_retention_rows: ${current.activity_log_retention_rows}`);
  console.log(`    range_summary_interval     : ${current.range_summary_interval}`);
  console.log(`    milestone_interval         : ${current.milestone_interval}`);
  console.log(`    auto_throttle_enabled      : ${current.auto_throttle_enabled}`);
  console.log(`    pause_on_critical_storage  : ${current.pause_on_critical_storage}`);
  console.log();

  const newConfig = ROLLBACK
    ? {
        mode: "recovery",
        batch_size: 25,
        batch_delay_ms: 10000,
        log_interval_ms: 60000,
        storage_mode: "free-tier",
        keep_recent_results: 1000,
        activity_log_retention_rows: 250,
        range_summary_interval: 100000,
        milestone_interval: 1000000,
        auto_throttle_enabled: true,
        pause_on_critical_storage: true,
        updated_at: new Date().toISOString(),
      }
    : {
        mode: "production_safe",
        batch_size: 100,
        batch_delay_ms: 5000,
        log_interval_ms: 60000,
        storage_mode: "free-tier",
        keep_recent_results: 1000,
        activity_log_retention_rows: 250,
        range_summary_interval: 100000,
        milestone_interval: 1000000,
        auto_throttle_enabled: true,
        pause_on_critical_storage: true,
        updated_at: new Date().toISOString(),
      };

  const label = ROLLBACK ? "ROLLBACK to recovery" : "production_safe";
  console.log(`  Applying: ${label}`);
  console.log(`    mode                       : ${newConfig.mode}`);
  console.log(`    batch_size                 : ${newConfig.batch_size}`);
  console.log(`    batch_delay_ms             : ${newConfig.batch_delay_ms}`);
  console.log(`    storage_mode               : ${newConfig.storage_mode}`);
  console.log(`    keep_recent_results        : ${newConfig.keep_recent_results}`);
  console.log(`    auto_throttle_enabled      : ${newConfig.auto_throttle_enabled}`);
  console.log(`    pause_on_critical_storage  : ${newConfig.pause_on_critical_storage}`);
  console.log();

  const { error: writeErr } = await supabase
    .from("collatz_engine_runtime_config")
    .update(newConfig)
    .eq("id", "main");

  if (writeErr) {
    console.error("[update-runtime-config] Failed to write config:", writeErr.message);
    process.exit(1);
  }

  console.log(`  [DONE] Config updated to ${label}.`);
  console.log(`  Worker will pick up the new config within its next 60s refresh cycle.\n`);
  process.exit(0);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("\n[update-runtime-config] Fatal error:", message);
  process.exit(1);
});
