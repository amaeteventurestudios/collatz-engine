/**
 * Read-only Collatz catalog integrity verification.
 *
 * Usage:
 *   npm run collatz:verify
 */

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { runFullIntegrityVerification } from "@/lib/collatz/verify";

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function printCheck(check: { name: string; status: string; detail: string }): void {
  const marker = check.status.padEnd(4, " ");
  console.log(`${marker}  ${check.name}`);
  console.log(`      ${check.detail}`);
}

async function main() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("FAIL  Supabase configuration");
    console.error("      NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
    process.exit(1);
  }

  const client = createClient(supabaseUrl, supabaseAnonKey);
  const result = await runFullIntegrityVerification(client);

  console.log("\nCollatz Integrity Verification\n");
  result.checks.forEach(printCheck);
  console.log(`\nSummary: ${result.passed} passed, ${result.failed} failed`);

  if (result.failed > 0) process.exit(1);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("\nFAIL  Verification script");
  console.error(`      ${message}`);
  process.exit(1);
});
