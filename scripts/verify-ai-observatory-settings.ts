/**
 * verify-ai-observatory-settings.ts
 *
 * Verifies that the ai_observatory_settings table exists, has the correct
 * schema, contains a default row, and that every publishing mode can be
 * written and read back correctly.
 *
 * Run:
 *   npm run observatory:verify-settings
 */

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const REQUIRED_COLUMNS = [
  "id",
  "publishing_mode",
  "disclosure_text",
  "auto_topic_detection_enabled",
  "auto_draft_generation_enabled",
  "auto_image_generation_enabled",
  "auto_publish_enabled",
  "max_auto_posts_per_day",
  "weekly_report_enabled",
  "record_trigger_enabled",
  "near_escape_trigger_enabled",
  "created_at",
  "updated_at",
] as const;

const VALID_MODES = ["manual", "semi_auto", "autonomous", "emergency_hold"] as const;
type Mode = typeof VALID_MODES[number];

const REQUIRED_DISCLOSURE = "This report was generated automatically by The Collatz Engine from verified computation data. It does not claim to prove the Collatz Conjecture.";

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function pass(label: string) {
  console.log(`  [PASS] ${label}`);
  passed++;
}

function fail(label: string, detail?: string) {
  console.error(`  [FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
  failed++;
}

function section(title: string) {
  console.log(`\n  ${title}`);
  console.log("  " + "─".repeat(title.length));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n┌─────────────────────────────────────────────┐");
  console.log("│  AI Observatory Settings Verifier            │");
  console.log("└─────────────────────────────────────────────┘");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("\n  [ERROR] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.");
    console.error("  Load your .env.local before running this script.\n");
    process.exit(1);
  }

  const client = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // ── 1. Table existence + PostgREST schema cache ─────────────────────────────
  section("1. Table existence + PostgREST schema cache");

  // Use a real SELECT (not HEAD) — PostgREST must look the table up in its schema
  // cache for SELECT queries.  A HEAD-only check can pass even with a stale cache.
  const { error: tableCheckError } = await client
    .from("ai_observatory_settings")
    .select("id")
    .limit(0);

  if (tableCheckError) {
    const msg = tableCheckError.message ?? "";
    const isSchemaCache = msg.includes("schema cache") || msg.includes("Could not find the table");
    if (isSchemaCache) {
      fail(
        "ai_observatory_settings is in PostgREST schema cache",
        "Table may exist in Postgres but PostgREST hasn't cached it yet.",
      );
      console.error(
        "\n  ▶ Fix: run supabase/phase-3f-settings-fix.sql in the Supabase SQL Editor." +
        "\n         The migration ends with NOTIFY pgrst, 'reload schema' which forces a cache refresh.\n"
      );
    } else {
      fail("ai_observatory_settings table accessible", msg);
      console.error("\n  ▶ Fix: run supabase/phase-3f-settings-fix.sql in the Supabase SQL Editor.\n");
    }
    // No point continuing — all subsequent checks will fail with the same error
    process.exit(1);
  }
  pass("ai_observatory_settings table exists and PostgREST schema cache is current");

  // ── 2. Column schema ────────────────────────────────────────────────────────
  section("2. Required columns");

  const { data: sampleRow, error: sampleErr } = await client
    .from("ai_observatory_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (sampleErr) {
    fail("Read sample row", sampleErr.message);
  } else {
    const cols = sampleRow ? Object.keys(sampleRow) : [];
    for (const col of REQUIRED_COLUMNS) {
      if (cols.includes(col)) {
        pass(`Column: ${col}`);
      } else {
        fail(`Column: ${col}`, "missing from table");
      }
    }
  }

  // ── 3. Default row ──────────────────────────────────────────────────────────
  section("3. Default row");

  const { data: rows, error: rowsErr } = await client
    .from("ai_observatory_settings")
    .select("*");

  if (rowsErr) {
    fail("Fetch all rows", rowsErr.message);
  } else {
    const count = rows?.length ?? 0;
    if (count >= 1) {
      pass(`Default row exists (${count} row${count > 1 ? "s" : ""})`);
      const row = rows![0] as Record<string, unknown>;
      if (VALID_MODES.includes(row.publishing_mode as Mode)) {
        pass(`publishing_mode is valid: "${row.publishing_mode}"`);
      } else {
        fail(`publishing_mode is valid`, `got "${row.publishing_mode}"`);
      }
    } else {
      fail("Default row exists", "table is empty — run the seed INSERT from phase-3f-settings-fix.sql");
    }
  }

  // ── 4. Write / read each publishing mode ────────────────────────────────────
  section("4. Write / read each publishing_mode");

  // Get or create a test row
  const { data: existingRows } = await client
    .from("ai_observatory_settings")
    .select("id, publishing_mode")
    .limit(1);

  if (!existingRows || existingRows.length === 0) {
    fail("Cannot run mode write/read — no row exists", "seed the table first");
  } else {
    const rowId = (existingRows[0] as { id: string }).id;
    const originalMode = (existingRows[0] as { publishing_mode: string }).publishing_mode;

    for (const mode of VALID_MODES) {
      const { error: writeErr } = await client
        .from("ai_observatory_settings")
        .update({ publishing_mode: mode, updated_at: new Date().toISOString() })
        .eq("id", rowId);

      if (writeErr) {
        fail(`Write publishing_mode = ${mode}`, writeErr.message);
        continue;
      }

      const { data: readBack, error: readErr } = await client
        .from("ai_observatory_settings")
        .select("publishing_mode")
        .eq("id", rowId)
        .single();

      if (readErr) {
        fail(`Read back publishing_mode = ${mode}`, readErr.message);
      } else if ((readBack as { publishing_mode: string }).publishing_mode === mode) {
        pass(`Write + read publishing_mode = "${mode}"`);
      } else {
        fail(`Read back publishing_mode = ${mode}`, `got "${(readBack as { publishing_mode: string }).publishing_mode}"`);
      }
    }

    // Restore original mode
    await client
      .from("ai_observatory_settings")
      .update({ publishing_mode: originalMode, updated_at: new Date().toISOString() })
      .eq("id", rowId);
  }

  // ── 5. Emergency Hold guard ──────────────────────────────────────────────────
  section("5. Emergency Hold server-side guard");

  const { data: ehRows } = await client
    .from("ai_observatory_settings")
    .select("id, publishing_mode")
    .limit(1);

  if (ehRows && ehRows.length > 0) {
    const rowId = (ehRows[0] as { id: string }).id;
    // Set Emergency Hold
    await client
      .from("ai_observatory_settings")
      .update({ publishing_mode: "emergency_hold", updated_at: new Date().toISOString() })
      .eq("id", rowId);

    // Read it back — assertNotEmergencyHold() in actions.ts reads this
    const { data: holdRow } = await client
      .from("ai_observatory_settings")
      .select("publishing_mode")
      .eq("id", rowId)
      .single();

    if ((holdRow as { publishing_mode: string } | null)?.publishing_mode === "emergency_hold") {
      pass("Emergency Hold mode persists — server guard will block approve/publish");
    } else {
      fail("Emergency Hold persistence", "mode did not read back correctly");
    }

    // Restore to manual (safe default)
    await client
      .from("ai_observatory_settings")
      .update({ publishing_mode: "manual", updated_at: new Date().toISOString() })
      .eq("id", rowId);
    pass("Restored publishing_mode to 'manual' after Emergency Hold test");
  }

  // ── 6. Boolean trigger columns ───────────────────────────────────────────────
  section("6. Boolean trigger columns write / read");

  const boolCols = [
    "auto_topic_detection_enabled",
    "auto_draft_generation_enabled",
    "auto_image_generation_enabled",
    "auto_publish_enabled",
    "weekly_report_enabled",
    "record_trigger_enabled",
    "near_escape_trigger_enabled",
  ] as const;

  const { data: boolRows } = await client
    .from("ai_observatory_settings")
    .select("id")
    .limit(1);

  if (boolRows && boolRows.length > 0) {
    const rowId = (boolRows[0] as { id: string }).id;
    for (const col of boolCols) {
      // Toggle off
      const { error: offErr } = await client
        .from("ai_observatory_settings")
        .update({ [col]: false, updated_at: new Date().toISOString() })
        .eq("id", rowId);
      if (offErr) { fail(`${col} = false`, offErr.message); continue; }

      const { data: offRow } = await client
        .from("ai_observatory_settings")
        .select(col)
        .eq("id", rowId)
        .single();
      if ((offRow as Record<string, unknown>)?.[col] !== false) {
        fail(`${col} = false read-back`, "value did not persist"); continue;
      }

      // Toggle on
      const { error: onErr } = await client
        .from("ai_observatory_settings")
        .update({ [col]: true, updated_at: new Date().toISOString() })
        .eq("id", rowId);
      if (onErr) { fail(`${col} = true`, onErr.message); continue; }

      const { data: onRow } = await client
        .from("ai_observatory_settings")
        .select(col)
        .eq("id", rowId)
        .single();
      if ((onRow as Record<string, unknown>)?.[col] !== true) {
        fail(`${col} = true read-back`, "value did not persist"); continue;
      }

      pass(`${col}: false → true persists`);
    }
  }

  // ── 7. Disclosure text ───────────────────────────────────────────────────────
  section("7. Disclosure text write / read");

  const { data: discRows } = await client
    .from("ai_observatory_settings")
    .select("id, disclosure_text")
    .limit(1);

  if (discRows && discRows.length > 0) {
    const rowId = (discRows[0] as { id: string }).id;
    const testText = REQUIRED_DISCLOSURE;
    const { error: discErr } = await client
      .from("ai_observatory_settings")
      .update({ disclosure_text: testText, updated_at: new Date().toISOString() })
      .eq("id", rowId);

    if (discErr) {
      fail("Write disclosure_text", discErr.message);
    } else {
      const { data: discBack } = await client
        .from("ai_observatory_settings")
        .select("disclosure_text")
        .eq("id", rowId)
        .single();
      if ((discBack as { disclosure_text: string } | null)?.disclosure_text === testText) {
        pass("Required disclosure text persists");
      } else {
        fail("Required disclosure text read-back", "text did not match");
      }
    }
  }

  // ── 8. max_auto_posts_per_day ────────────────────────────────────────────────
  section("8. max_auto_posts_per_day write / read");

  const { data: maxRows } = await client
    .from("ai_observatory_settings")
    .select("id")
    .limit(1);

  if (maxRows && maxRows.length > 0) {
    const rowId = (maxRows[0] as { id: string }).id;
    for (const v of [0, 1, 3]) {
      const { error: maxErr } = await client
        .from("ai_observatory_settings")
        .update({ max_auto_posts_per_day: v, updated_at: new Date().toISOString() })
        .eq("id", rowId);
      if (maxErr) { fail(`max_auto_posts_per_day = ${v}`, maxErr.message); continue; }

      const { data: maxBack } = await client
        .from("ai_observatory_settings")
        .select("max_auto_posts_per_day")
        .eq("id", rowId)
        .single();
      if ((maxBack as { max_auto_posts_per_day: number } | null)?.max_auto_posts_per_day === v) {
        pass(`max_auto_posts_per_day = ${v}`);
      } else {
        fail(`max_auto_posts_per_day = ${v} read-back`);
      }
    }

    // Restore to safe default
    await client
      .from("ai_observatory_settings")
      .update({ max_auto_posts_per_day: 1, updated_at: new Date().toISOString() })
      .eq("id", rowId);
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("\n  ─────────────────────────────────────────────");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("");

  if (failed > 0) {
    console.error(
      `  [FAIL] ${failed} check(s) failed.\n` +
      "  If the table is missing: run supabase/phase-3f-settings-fix.sql in the Supabase SQL Editor.\n" +
      "  If there are permission errors: run supabase/phase-3c-ai-provider-permissions.sql.\n"
    );
    process.exit(1);
  }

  console.log("  [observatory:verify-settings] PASS — all checks passed.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("[observatory:verify-settings] Unexpected error:", err);
  process.exit(1);
});
