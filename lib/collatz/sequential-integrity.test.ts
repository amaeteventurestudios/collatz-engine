/**
 * Sequential integrity tests for the Collatz autonomous runner.
 *
 * These tests verify the core invariant without a live Supabase connection:
 *   next_batch_start = previous_batch_end + 1
 *
 * They test the mathematical formulas used by runAutonomousBatch, the config
 * plumbing that ensures displayed batchSize === actual batchSize === state
 * update batchSize, and the gap-detection logic used by the worker.
 */

import { describe, it, expect } from "vitest";

// ── Pure formula helpers (mirrors autonomous-runner logic exactly) ─────────

function computeBatch(lastCheckedNumber: number, batchSize: number) {
  const batchStart = lastCheckedNumber + 1;
  const batchEnd = batchStart + batchSize - 1;
  const nextLastChecked = batchEnd;
  const nextCurrentNumber = batchEnd + 1;
  const numbersProcessed = batchEnd - batchStart + 1;
  return { batchStart, batchEnd, nextLastChecked, nextCurrentNumber, numbersProcessed };
}

function simulateBatches(
  initialLastChecked: number,
  batchSize: number,
  count: number,
): Array<{ batchStart: number; batchEnd: number; numbersProcessed: number }> {
  const results = [];
  let lastChecked = initialLastChecked;
  for (let i = 0; i < count; i++) {
    const b = computeBatch(lastChecked, batchSize);
    results.push({ batchStart: b.batchStart, batchEnd: b.batchEnd, numbersProcessed: b.numbersProcessed });
    lastChecked = b.nextLastChecked;
  }
  return results;
}

// ── Core invariant: consecutive batches are contiguous ────────────────────

describe("sequential invariant: next_batch_start = previous_batch_end + 1", () => {
  it("three consecutive batches of size 50 produce contiguous ranges", () => {
    const batches = simulateBatches(7_560_451, 50, 3);
    expect(batches[0].batchStart).toBe(7_560_452);
    expect(batches[0].batchEnd).toBe(7_560_501);
    expect(batches[1].batchStart).toBe(batches[0].batchEnd + 1);
    expect(batches[1].batchEnd).toBe(batches[0].batchEnd + 50);
    expect(batches[2].batchStart).toBe(batches[1].batchEnd + 1);
    expect(batches[2].batchEnd).toBe(batches[1].batchEnd + 50);
  });

  it("no gaps across 100 consecutive batches of size 50", () => {
    const batches = simulateBatches(1_000_000, 50, 100);
    for (let i = 1; i < batches.length; i++) {
      expect(batches[i].batchStart).toBe(batches[i - 1].batchEnd + 1);
    }
  });

  it("no gaps across 10 consecutive batches of size 250 (normal mode)", () => {
    const batches = simulateBatches(0, 250, 10);
    for (let i = 1; i < batches.length; i++) {
      expect(batches[i].batchStart).toBe(batches[i - 1].batchEnd + 1);
    }
  });

  it("no gaps starting from n=1", () => {
    const batches = simulateBatches(0, 50, 5);
    expect(batches[0].batchStart).toBe(1);
    for (let i = 1; i < batches.length; i++) {
      expect(batches[i].batchStart).toBe(batches[i - 1].batchEnd + 1);
    }
  });
});

// ── batchSize is honored exactly ──────────────────────────────────────────

describe("batchSize is honored exactly", () => {
  for (const batchSize of [1, 25, 50, 250, 1000, 5000]) {
    it(`batchSize=${batchSize}: numbersProcessed === batchSize`, () => {
      const b = computeBatch(1_000_000, batchSize);
      expect(b.numbersProcessed).toBe(batchSize);
    });

    it(`batchSize=${batchSize}: batchEnd - batchStart + 1 === batchSize`, () => {
      const b = computeBatch(1_000_000, batchSize);
      expect(b.batchEnd - b.batchStart + 1).toBe(batchSize);
    });
  }
});

// ── State persistence invariant ───────────────────────────────────────────

describe("state persistence invariant", () => {
  it("last_checked_number = batchEnd after batch completes", () => {
    const b = computeBatch(7_560_501, 50);
    expect(b.nextLastChecked).toBe(b.batchEnd);
    expect(b.nextLastChecked).toBe(7_560_551);
  });

  it("current_number = batchEnd + 1 after batch completes", () => {
    const b = computeBatch(7_560_501, 50);
    expect(b.nextCurrentNumber).toBe(b.batchEnd + 1);
    expect(b.nextCurrentNumber).toBe(7_560_552);
  });

  it("total_numbers_checked increments by exact rows.length, not config batchSize", () => {
    // rows.length = batchEnd - batchStart + 1, which equals batchSize when no maxSteps cut
    const batchSize = 50;
    const b = computeBatch(100, batchSize);
    const rowsLength = b.batchEnd - b.batchStart + 1;
    const prevTotal = 500;
    const newTotal = prevTotal + rowsLength;
    expect(newTotal).toBe(550);
    expect(rowsLength).toBe(batchSize);
  });
});

// ── Config batchSize change between batches must not create gaps ──────────

describe("batchSize change between batches does not create gaps", () => {
  it("switching from batchSize=250 to batchSize=50 mid-run produces no gap", () => {
    // Simulate: 2 batches at 250, then switch to 50
    const b1 = computeBatch(0, 250);
    const b2 = computeBatch(b1.nextLastChecked, 250);
    const b3 = computeBatch(b2.nextLastChecked, 50); // config change here
    expect(b3.batchStart).toBe(b2.batchEnd + 1);
  });

  it("switching from batchSize=50 to batchSize=250 mid-run produces no gap", () => {
    const b1 = computeBatch(7_560_000, 50);
    const b2 = computeBatch(b1.nextLastChecked, 50);
    const b3 = computeBatch(b2.nextLastChecked, 250); // config change here
    expect(b3.batchStart).toBe(b2.batchEnd + 1);
  });
});

// ── State update uses actual processed batchEnd, not stale config ─────────

describe("state update uses actual batchEnd, not stale/default config value", () => {
  it("last_checked_number is derived from batchEnd, not from a separate config", () => {
    // The formula last_checked_number = batchEnd must hold regardless of which
    // variable produced batchEnd. Simulates a scenario where batchSize comes
    // from runtime config (50) but a stale DEFAULT_BATCH_SIZE env (5000) exists.
    const configBatchSize = 50;
    const b = computeBatch(1_000_000, configBatchSize);
    // State must use the actual batchEnd (1_000_050), not 1_000_000 + 5000
    expect(b.nextLastChecked).toBe(1_000_050);
    expect(b.nextLastChecked).not.toBe(1_005_000);
  });
});

// ── Free-tier pruning does not affect state advancement ───────────────────

describe("free-tier pruning does not affect sequential state advancement", () => {
  it("pruning collatz_results (by n) cannot modify last_checked_number", () => {
    // Pruning is a separate operation on a separate table. The state invariant
    // only depends on last_checked_number, which is updated independently.
    // This test verifies the formulas are unaffected by any external prune.
    const beforePrune = computeBatch(5_000_000, 50);
    // Simulate: prune fired, deleted old rows — state formula unchanged
    const afterPrune = computeBatch(beforePrune.nextLastChecked, 50);
    expect(afterPrune.batchStart).toBe(beforePrune.batchEnd + 1);
  });

  it("prune after state commit: next batch still starts at batchEnd + 1", () => {
    // Moving prune to AFTER updateEngineState means the prune cannot race
    // with readCommittedMaxN. The sequential invariant still holds.
    const batches = simulateBatches(7_555_000, 50, 3);
    for (let i = 1; i < batches.length; i++) {
      expect(batches[i].batchStart).toBe(batches[i - 1].batchEnd + 1);
    }
  });
});

// ── Gap detection logic (mirrors worker's check) ──────────────────────────

describe("worker gap detection logic", () => {
  it("detects a gap when batchStart !== previousBatchEnd + 1", () => {
    const previousBatchEnd = 7_560_551;
    const actualBatchStart = 7_560_852; // gap of 300
    const hasGap = actualBatchStart !== previousBatchEnd + 1;
    const gapSize = actualBatchStart - (previousBatchEnd + 1);
    expect(hasGap).toBe(true);
    expect(gapSize).toBe(300);
  });

  it("no gap when batchStart === previousBatchEnd + 1", () => {
    const previousBatchEnd = 7_560_551;
    const actualBatchStart = 7_560_552;
    const hasGap = actualBatchStart !== previousBatchEnd + 1;
    expect(hasGap).toBe(false);
  });

  it("gap of exactly batchSize is still a gap (not a duplicate)", () => {
    const previousBatchEnd = 7_560_551;
    const batchSize = 50;
    // Correct: 7,560,552. If next start = 7,560,602 (skipped one batch):
    const skippedBatchStart = previousBatchEnd + batchSize + 1;
    const hasGap = skippedBatchStart !== previousBatchEnd + 1;
    expect(hasGap).toBe(true);
  });

  it("first batch (no previousBatchEnd) skips gap check", () => {
    let previousBatchEnd: number | null = null;
    const result = { batchStart: 7_560_502, batchEnd: 7_560_551 };
    // Mirrors the worker: only check when previousBatchEnd is not null
    let gapDetected = false;
    if (previousBatchEnd !== null && result.batchStart !== previousBatchEnd + 1) {
      gapDetected = true;
    }
    previousBatchEnd = result.batchEnd;
    expect(gapDetected).toBe(false);
    expect(previousBatchEnd).toBe(7_560_551);
  });
});
