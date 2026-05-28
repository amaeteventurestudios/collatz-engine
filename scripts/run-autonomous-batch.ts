import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { runAutonomousBatch } = await import("../lib/collatz/autonomous-runner");

  const args = process.argv.slice(2);
  // CLI arg → env var → hard default (5 000)
  const envDefault = parseInt(process.env.COLLATZ_RESULT_BATCH_SIZE ?? "5000", 10);
  const defaultBatchSize =
    Number.isFinite(envDefault) && envDefault >= 1 ? envDefault : 5000;
  const batchSize = parseInt(args[0] ?? "", 10) || defaultBatchSize;

  if (!Number.isInteger(batchSize) || batchSize < 1) {
    console.error("Usage: npm run collatz:auto -- <batchSize>");
    process.exit(1);
  }

  console.log("\n=== Collatz Autonomous Batch ===");
  console.log(`Batch size: ${batchSize.toLocaleString("en-US")}`);
  console.log("Reading state from Supabase...\n");

  const result = await runAutonomousBatch({ batchSize });

  console.log(
    `Processed: ${result.numbersProcessed.toLocaleString("en-US")} numbers`,
  );
  console.log(
    `Range: ${result.batchStart.toLocaleString("en-US")} - ${result.batchEnd.toLocaleString("en-US")}`,
  );
  console.log("State persisted to Supabase.");
  console.log("===============================\n");
}

main().catch((error) => {
  console.error("[Collatz Engine] Autonomous batch failed:");
  console.error(error);
  process.exit(1);
});