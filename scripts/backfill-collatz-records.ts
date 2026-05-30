import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

type BackfillStatus = "idle" | "running" | "paused" | "completed" | "failed";
type RecordCategory = "longest_trajectory" | "highest_peak";

interface Args {
  dryRun: boolean;
  status: boolean;
  pause: boolean;
  resume: boolean;
  start: number | null;
  end: number | null;
  batchSize: number;
  top: number;
}

interface BackfillState {
  id: string;
  status: BackfillStatus;
  start_number: number;
  target_number: number | null;
  current_number: number;
  processed_count: number;
  top_n_limit: number;
  started_at: string | null;
  completed_at: string | null;
  last_heartbeat_at: string | null;
  error_message: string | null;
}

interface RecordCandidate {
  starting_number: number;
  steps: number;
  peak_value: string;
}

interface RankedCandidate extends RecordCandidate {
  peakNumeric: bigint;
}

const DEFAULT_BATCH_SIZE = 10_000;
const DEFAULT_TOP_LIMIT = 1_000;
const STATE_ID = "main";
const SOURCE = "historical_backfill";

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;
  const text = readFileSync(".env.local", "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

loadLocalEnv();

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false,
    status: false,
    pause: false,
    resume: false,
    start: null,
    end: null,
    batchSize: DEFAULT_BATCH_SIZE,
    top: DEFAULT_TOP_LIMIT,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--status") args.status = true;
    else if (arg === "--pause") args.pause = true;
    else if (arg === "--resume") args.resume = true;
    else if (arg === "--start" && next) {
      args.start = parsePositiveInt(next, "--start");
      i++;
    } else if (arg === "--end" && next) {
      args.end = parsePositiveInt(next, "--end");
      i++;
    } else if (arg === "--batch-size" && next) {
      args.batchSize = parsePositiveInt(next, "--batch-size");
      i++;
    } else if (arg === "--top" && next) {
      args.top = parsePositiveInt(next, "--top");
      i++;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (args.top < 10) throw new Error("--top must be at least 10");
  return args;
}

function parsePositiveInt(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive safe integer.`);
  }
  return parsed;
}

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function computeCollatzRecord(startingNumber: number): RankedCandidate {
  let n = BigInt(startingNumber);
  let peak = n;
  let steps = 0;

  while (n !== 1n) {
    n = n % 2n === 0n ? n / 2n : 3n * n + 1n;
    if (n > peak) peak = n;
    steps++;
  }

  return {
    starting_number: startingNumber,
    steps,
    peak_value: peak.toString(),
    peakNumeric: peak,
  };
}

function compareLongest(a: RankedCandidate, b: RankedCandidate): number {
  return b.steps - a.steps || a.starting_number - b.starting_number;
}

function comparePeak(a: RankedCandidate, b: RankedCandidate): number {
  if (a.peakNumeric !== b.peakNumeric) return a.peakNumeric > b.peakNumeric ? -1 : 1;
  return a.starting_number - b.starting_number;
}

function pushTop(
  rows: RankedCandidate[],
  candidate: RankedCandidate,
  limit: number,
  compare: (a: RankedCandidate, b: RankedCandidate) => number,
) {
  rows.push(candidate);
  if (rows.length >= limit * 2) {
    rows.sort(compare);
    rows.length = limit;
  }
}

function finalizeTop(
  rows: RankedCandidate[],
  limit: number,
  compare: (a: RankedCandidate, b: RankedCandidate) => number,
) {
  rows.sort(compare);
  return rows.slice(0, limit);
}

async function readState(client: SupabaseClient): Promise<BackfillState | null> {
  const { data, error } = await client
    .from("collatz_record_backfill_state")
    .select("*")
    .eq("id", STATE_ID)
    .maybeSingle();

  if (error) throw new Error(`Unable to read backfill state. Run supabase/phase-3h-record-backfill-state.sql first. ${error.message}`);
  return (data ?? null) as BackfillState | null;
}

async function ensureState(client: SupabaseClient): Promise<BackfillState> {
  const existing = await readState(client);
  if (existing) return existing;

  const { data, error } = await client
    .from("collatz_record_backfill_state")
    .insert({ id: STATE_ID })
    .select("*")
    .single();

  if (error) throw new Error(`Unable to create backfill state: ${error.message}`);
  return data as BackfillState;
}

async function readEngineCheckpoint(client: SupabaseClient): Promise<number> {
  const { data, error } = await client
    .from("collatz_engine_state")
    .select("last_checked_number")
    .eq("id", "main")
    .single();

  if (error) throw new Error(`Unable to read frozen checkpoint: ${error.message}`);
  const checkpoint = Number(data?.last_checked_number ?? 0);
  if (!Number.isSafeInteger(checkpoint) || checkpoint < 1) {
    throw new Error(`Invalid last_checked_number checkpoint: ${data?.last_checked_number}`);
  }
  return checkpoint;
}

async function updateState(client: SupabaseClient, updates: Partial<BackfillState>) {
  const { error } = await client
    .from("collatz_record_backfill_state")
    .update({
      ...updates,
      last_heartbeat_at: new Date().toISOString(),
    })
    .eq("id", STATE_ID);

  if (error) throw new Error(`Unable to update backfill state: ${error.message}`);
}

function toPayload(
  category: RecordCategory,
  rows: RankedCandidate[],
  batchStart: number,
  batchEnd: number,
) {
  const reconstructedAt = new Date().toISOString();
  return rows.map((row) => ({
    record_category: category,
    starting_number: row.starting_number,
    steps: row.steps,
    peak_value: row.peak_value,
    rank_scope: "all_time",
    source: SOURCE,
    source_batch_start: batchStart,
    source_batch_end: batchEnd,
    discovered_at: reconstructedAt,
    updated_at: reconstructedAt,
  }));
}

async function writeCandidates(
  client: SupabaseClient,
  category: RecordCategory,
  rows: RankedCandidate[],
  batchStart: number,
  batchEnd: number,
  keep: number,
) {
  if (rows.length === 0) return;

  const { error } = await client
    .from("collatz_all_time_records")
    .upsert(toPayload(category, rows, batchStart, batchEnd), {
      onConflict: "record_category,starting_number",
    });

  if (error) throw new Error(`Unable to write ${category} records: ${error.message}`);

  const { error: pruneError } = await client.rpc("prune_collatz_all_time_records", {
    p_category: category,
    p_keep: keep,
  });

  if (pruneError) throw new Error(`Unable to prune ${category} records: ${pruneError.message}`);
}

async function printStatus(client: SupabaseClient) {
  let state: BackfillState | null = null;
  try {
    state = await readState(client);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log("Historical records backfill status");
    console.log("----------------------------------");
    console.log("Status          : migration not installed");
    console.log(`Detail          : ${message}`);
    console.log("Next step       : run supabase/phase-3h-record-backfill-state.sql in Supabase SQL Editor");
    return;
  }
  if (!state) {
    console.log("Backfill state table is reachable, but no main state row exists yet.");
    return;
  }

  console.log("Historical records backfill status");
  console.log("----------------------------------");
  console.log(`Status          : ${state.status}`);
  console.log(`Range           : ${state.start_number.toLocaleString("en-US")} -> ${state.target_number?.toLocaleString("en-US") ?? "not frozen"}`);
  console.log(`Current number  : ${state.current_number.toLocaleString("en-US")}`);
  console.log(`Processed count : ${state.processed_count.toLocaleString("en-US")}`);
  console.log(`Top N limit     : ${state.top_n_limit.toLocaleString("en-US")}`);
  console.log(`Started at      : ${state.started_at ?? "not started"}`);
  console.log(`Completed at    : ${state.completed_at ?? "not completed"}`);
  console.log(`Heartbeat       : ${state.last_heartbeat_at ?? "none"}`);
  console.log(`Error           : ${state.error_message ?? "none"}`);
}

async function setPaused(client: SupabaseClient) {
  const state = await ensureState(client);
  if (state.status !== "running") {
    console.log(`Backfill is ${state.status}; no pause needed.`);
    return;
  }
  await updateState(client, { status: "paused" });
  console.log("Backfill pause requested. The running job will stop after its current batch.");
}

async function setResume(client: SupabaseClient) {
  const state = await ensureState(client);
  if (state.status !== "paused" && state.status !== "failed") {
    console.log(`Backfill is ${state.status}; run records:backfill to continue if needed.`);
    return;
  }
  await updateState(client, { status: "running", error_message: null, completed_at: null });
  console.log("Backfill marked running. Start records:backfill to continue from saved progress.");
}

async function dryRun(args: Args) {
  const start = args.start ?? 1;
  const end = args.end ?? 1_000;
  if (end < start) throw new Error("--end must be greater than or equal to --start.");

  const longest: RankedCandidate[] = [];
  const peaks: RankedCandidate[] = [];
  for (let n = start; n <= end; n++) {
    const candidate = computeCollatzRecord(n);
    pushTop(longest, candidate, args.top, compareLongest);
    pushTop(peaks, candidate, args.top, comparePeak);
  }

  const longestTop = finalizeTop(longest, args.top, compareLongest);
  const peakTop = finalizeTop(peaks, args.top, comparePeak);
  console.log(`Dry run only. No database writes. Range ${start.toLocaleString("en-US")} -> ${end.toLocaleString("en-US")}`);
  console.log(`Top longest : n=${longestTop[0]?.starting_number.toLocaleString("en-US")}, steps=${longestTop[0]?.steps}, peak=${longestTop[0]?.peak_value}`);
  console.log(`Top peak    : n=${peakTop[0]?.starting_number.toLocaleString("en-US")}, steps=${peakTop[0]?.steps}, peak=${peakTop[0]?.peak_value}`);
}

async function runBackfill(client: SupabaseClient, args: Args) {
  const state = await ensureState(client);
  const now = new Date().toISOString();

  let startNumber = state.current_number;
  let targetNumber = state.target_number;
  let processedCount = state.processed_count;

  if (state.status === "running") {
    console.log("Backfill is already marked running. Resuming from saved progress.");
  } else if (state.status === "paused") {
    console.log("Backfill is paused. Run with --resume first.");
    return;
  } else if (state.status === "completed") {
    console.log("Backfill already completed. No work to do.");
    return;
  } else {
    targetNumber = args.end ?? await readEngineCheckpoint(client);
    startNumber = args.start ?? 1;
    processedCount = 0;
    await updateState(client, {
      status: "running",
      start_number: startNumber,
      current_number: startNumber,
      target_number: targetNumber,
      processed_count: 0,
      top_n_limit: args.top,
      started_at: now,
      completed_at: null,
      error_message: null,
    });
  }

  if (targetNumber == null) throw new Error("Backfill target_number is not frozen.");

  console.log(`Historical records backfill target frozen at n=${targetNumber.toLocaleString("en-US")}`);
  console.log("This job writes only collatz_all_time_records and collatz_record_backfill_state.");

  try {
    while (startNumber <= targetNumber) {
      const currentState = await readState(client);
      if (currentState?.status === "paused") {
        console.log("Backfill paused by operator.");
        return;
      }

      const batchStart = startNumber;
      const batchEnd = Math.min(targetNumber, batchStart + args.batchSize - 1);
      const longest: RankedCandidate[] = [];
      const peaks: RankedCandidate[] = [];

      for (let n = batchStart; n <= batchEnd; n++) {
        const candidate = computeCollatzRecord(n);
        pushTop(longest, candidate, args.top, compareLongest);
        pushTop(peaks, candidate, args.top, comparePeak);
      }

      const longestTop = finalizeTop(longest, args.top, compareLongest);
      const peakTop = finalizeTop(peaks, args.top, comparePeak);
      await writeCandidates(client, "longest_trajectory", longestTop, batchStart, batchEnd, args.top);
      await writeCandidates(client, "highest_peak", peakTop, batchStart, batchEnd, args.top);

      processedCount += batchEnd - batchStart + 1;
      startNumber = batchEnd + 1;
      await updateState(client, {
        current_number: startNumber,
        processed_count: processedCount,
        top_n_limit: args.top,
      });

      console.log(
        `Processed ${batchStart.toLocaleString("en-US")} -> ${batchEnd.toLocaleString("en-US")} ` +
        `(${processedCount.toLocaleString("en-US")} total)`,
      );
    }

    await updateState(client, {
      status: "completed",
      current_number: targetNumber + 1,
      completed_at: new Date().toISOString(),
      error_message: null,
    });
    console.log("Historical records backfill completed.");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateState(client, { status: "failed", error_message: message });
    throw err;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.dryRun) {
    await dryRun(args);
    return;
  }

  const client = getClient();
  if (args.status) return printStatus(client);
  if (args.pause) return setPaused(client);
  if (args.resume) return setResume(client);
  await runBackfill(client, args);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[records:backfill] ${message}`);
  process.exit(1);
});
