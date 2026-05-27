/**
 * Read-only Collatz catalog integrity verification.
 *
 * Usage:
 *   npm run collatz:verify
 *   npm run collatz:verify -- --persist
 */

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { runFullIntegrityVerification } from "@/lib/collatz/verify";
import {
  integrityRunFromResult,
  persistIntegrityRun,
  safeErrorMessage,
  thrownIntegrityRun,
} from "@/lib/collatz/integrity-runs";

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const shouldPersist = process.argv.includes("--persist");
const scriptStartedAtMs = Date.now();

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

  if (shouldPersist && !supabaseServiceRoleKey) {
    console.warn("WARN  Persistence key");
    console.warn("      SUPABASE_SERVICE_ROLE_KEY is not set; attempting persistence with the configured public key.");
  }

  const client = createClient(
    supabaseUrl,
    shouldPersist ? supabaseServiceRoleKey || supabaseAnonKey : supabaseAnonKey,
  );
  const result = await runFullIntegrityVerification(client);

  console.log("\nCollatz Integrity Verification\n");
  result.checks.forEach(printCheck);
  console.log(`\nSummary: ${result.passed} passed, ${result.failed} failed`);

  if (shouldPersist) {
    await persistIntegrityRun(client, integrityRunFromResult(result));
    console.log("Persisted full integrity run summary.");
  }

  if (result.failed > 0) process.exit(1);
}

main().catch(async (err: unknown) => {
  const message = safeErrorMessage(err);
  console.error("\nFAIL  Verification script");
  console.error(`      ${message}`);

  if (
    shouldPersist &&
    supabaseUrl &&
    supabaseAnonKey &&
    !message.startsWith("Unable to persist integrity run:")
  ) {
    try {
      const client = createClient(
        supabaseUrl,
        supabaseServiceRoleKey || supabaseAnonKey,
      );
      await persistIntegrityRun(client, thrownIntegrityRun(err, scriptStartedAtMs));
      console.error("      Persisted failed integrity run summary.");
    } catch (persistErr) {
      console.error(`      Could not persist failed run: ${safeErrorMessage(persistErr)}`);
    }
  }

  process.exit(1);
});
