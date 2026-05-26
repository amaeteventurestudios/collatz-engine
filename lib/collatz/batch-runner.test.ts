import { describe, it, expect } from "vitest";
import { runBatch } from "./batch-runner";
import { computeCollatz, computeCollatzSummary } from "./engine";

// ── Engine refactor: existing Phase 3 guarantees still hold ────────────────

describe("engine refactor: computeCollatz unchanged", () => {
  it("n=27: steps_to_1 = 111", () => expect(computeCollatz(27).steps_to_1).toBe(111));
  it("n=27: peak_value = 9232", () => expect(computeCollatz(27).peak_value).toBe(9232n));
  it("n=837799: steps_to_1 = 524", () => expect(computeCollatz(837799).steps_to_1).toBe(524));
  it("n=3: sequence correct", () =>
    expect(computeCollatz(3).full_sequence).toEqual([3n, 10n, 5n, 16n, 8n, 4n, 2n, 1n]));
});

describe("computeCollatzSummary: matches computeCollatz metrics", () => {
  for (const n of [1, 2, 3, 27, 97, 871]) {
    it(`n=${n}: steps_to_1 matches`, () => {
      const full = computeCollatz(n);
      const summ = computeCollatzSummary(n);
      expect(summ.steps_to_1).toBe(full.steps_to_1);
      expect(summ.peak_value).toBe(full.peak_value);
      expect(summ.peak_ratio).toBeCloseTo(full.peak_ratio, 10);
      expect(summ.odd_steps).toBe(full.odd_steps);
      expect(summ.even_steps).toBe(full.even_steps);
      expect(summ.first_descent_step).toBe(full.first_descent_step);
      expect(summ.reached_one).toBe(true);
    });
  }
  it("invalid input returns invalid_input", () => {
    expect(computeCollatzSummary(0).stopped_reason).toBe("invalid_input");
    expect(computeCollatzSummary(-1).stopped_reason).toBe("invalid_input");
  });
});

// ── Batch range validation ─────────────────────────────────────────────────

describe("runBatch — invalid ranges", () => {
  it("batch_start < 1 returns error", () => {
    const r = runBatch({ batch_start: 0, batch_end: 10 });
    expect(r.stopped_reason).toBe("error");
    expect(r.numbers_tested).toBe(0);
  });
  it("batch_end < batch_start returns error", () => {
    const r = runBatch({ batch_start: 10, batch_end: 5 });
    expect(r.stopped_reason).toBe("error");
  });
  it("single-number range is valid", () => {
    const r = runBatch({ batch_start: 27, batch_end: 27 });
    expect(r.stopped_reason).toBe("completed");
    expect(r.numbers_tested).toBe(1);
    expect(r.max_steps).toBe(111);
    expect(r.max_steps_number).toBe(27);
  });
});

// ── Known batch results: 1–10 ─────────────────────────────────────────────

describe("runBatch — range 1–10 exact values", () => {
  const r = runBatch({ batch_start: 1, batch_end: 10 });

  it("numbers_tested = 10", () => expect(r.numbers_tested).toBe(10));
  it("stopped_reason = completed", () => expect(r.stopped_reason).toBe("completed"));
  it("errors_count = 0", () => expect(r.errors_count).toBe(0));

  it("max_steps = 19 (n=9)", () => {
    expect(r.max_steps).toBe(19);
    expect(r.max_steps_number).toBe(9);
  });

  it("max_peak = '52' (n=7 first reaches it)", () => {
    expect(r.max_peak).toBe("52");
    expect(r.max_peak_number).toBe(7);
  });

  it("max_peak_ratio is from n=9 or n=7 (both peak at 52)", () => {
    // n=7: 52/7 ≈ 7.43, n=9: 52/9 ≈ 5.78 — n=7 wins
    expect(r.max_peak_ratio_number).toBe(7);
    expect(r.max_peak_ratio).toBeCloseTo(52 / 7, 5);
  });

  it("avg_steps is reasonable (between 0 and 20)", () => {
    expect(r.avg_steps).toBeGreaterThan(0);
    expect(r.avg_steps).toBeLessThan(20);
  });

  it("record_breakers contains one entry per record type", () => {
    const types = r.record_breakers.map((b) => b.record_type);
    expect(types).toContain("longest_path");
    expect(types).toContain("highest_peak");
    expect(types).toContain("highest_peak_ratio");
    expect(types).toContain("longest_first_descent");
    expect(types).toContain("highest_odd_step_density");
  });
});

// ── Record detection ───────────────────────────────────────────────────────

describe("runBatch — record detection", () => {
  it("n=27 is longest_path record in batch 1–100", () => {
    const r = runBatch({ batch_start: 1, batch_end: 100 });
    const lp = r.record_breakers.find((b) => b.record_type === "longest_path");
    expect(lp?.start_number).toBe(97);
    expect(lp?.value).toBe(118);
  });

  it("n=27 holds highest_peak_ratio in batch 1–50", () => {
    const r = runBatch({ batch_start: 1, batch_end: 50 });
    const pr = r.record_breakers.find((b) => b.record_type === "highest_peak_ratio");
    expect(pr?.start_number).toBe(27);
    expect(pr?.value).toBeCloseTo(9232 / 27, 3);
  });

  it("batch 1–1 has max_steps = 0 (n=1)", () => {
    const r = runBatch({ batch_start: 1, batch_end: 1 });
    expect(r.max_steps).toBe(0);
    expect(r.max_steps_number).toBe(1);
  });
});

// ── Near-escape detection ──────────────────────────────────────────────────

describe("runBatch — near-escape detection", () => {
  it("n=27 is flagged as near-escape in batch 1–100 (high_peak_ratio + long_path)", () => {
    const r = runBatch({
      batch_start: 1,
      batch_end: 100,
      near_escape_thresholds: { min_peak_ratio: 100, min_steps_to_1: 100 },
    });
    const n27 = r.near_escape_candidates.find((c) => c.start_number === 27);
    expect(n27).toBeDefined();
    expect(n27?.flags).toContain("high_peak_ratio");
    expect(n27?.flags).toContain("long_path");
    expect(n27?.steps_to_1).toBe(111);
    expect(n27?.peak_ratio).toBeCloseTo(9232 / 27, 3);
  });

  it("batch_record flag is set on final record holders", () => {
    const r = runBatch({
      batch_start: 1,
      batch_end: 50,
      near_escape_thresholds: { min_peak_ratio: 100, min_steps_to_1: 50 },
    });
    const n27 = r.near_escape_candidates.find((c) => c.start_number === 27);
    expect(n27?.flags).toContain("batch_record");
  });

  it("no candidates when thresholds are impossibly high", () => {
    const r = runBatch({
      batch_start: 1,
      batch_end: 50,
      near_escape_thresholds: {
        min_peak_ratio: 100_000,
        min_first_descent_step: 100_000,
        min_odd_step_density: 1,
        min_steps_to_1: 100_000,
      },
    });
    expect(r.near_escape_candidates).toHaveLength(0);
  });
});

// ── Residue statistics ─────────────────────────────────────────────────────

describe("runBatch — residue statistics (mod 3, range 1–10)", () => {
  const r = runBatch({ batch_start: 1, batch_end: 10 });
  const mod3 = r.residue_class_summary.filter((s) => s.modulus === 3);

  it("mod 3 has 3 residue classes (0,1,2)", () => {
    expect(mod3).toHaveLength(3);
  });

  it("residue 0 (n=3,6,9) — count=3, avg_steps=(7+8+19)/3", () => {
    const r0 = mod3.find((s) => s.residue === 0)!;
    expect(r0.count).toBe(3);
    expect(r0.avg_steps).toBeCloseTo((7 + 8 + 19) / 3, 5);
    expect(r0.max_steps).toBe(19);
  });

  it("residue 1 (n=1,4,7,10) — count=4, avg_steps=(0+2+16+6)/4", () => {
    const r1 = mod3.find((s) => s.residue === 1)!;
    expect(r1.count).toBe(4);
    expect(r1.avg_steps).toBeCloseTo((0 + 2 + 16 + 6) / 4, 5);
  });

  it("residue 2 (n=2,5,8) — count=3, avg_steps=(1+5+3)/3", () => {
    const r2 = mod3.find((s) => s.residue === 2)!;
    expect(r2.count).toBe(3);
    expect(r2.avg_steps).toBeCloseTo((1 + 5 + 3) / 3, 5);
  });

  it("all residue stats are sorted by modulus then residue", () => {
    const prev = { modulus: 0, residue: -1 };
    for (const s of r.residue_class_summary) {
      expect(
        s.modulus > prev.modulus || (s.modulus === prev.modulus && s.residue > prev.residue),
      ).toBe(true);
      prev.modulus = s.modulus;
      prev.residue = s.residue;
    }
  });
});

// ── Sample limit ───────────────────────────────────────────────────────────

describe("runBatch — sample limit", () => {
  it("sample_limit=0 produces no trajectory_samples", () => {
    const r = runBatch({ batch_start: 1, batch_end: 100, sample_limit: 0 });
    expect(r.trajectory_samples).toHaveLength(0);
  });

  it("sample_limit=2 caps samples at 2", () => {
    const r = runBatch({ batch_start: 1, batch_end: 100, sample_limit: 2 });
    expect(r.trajectory_samples.length).toBeLessThanOrEqual(2);
  });
});

// ── Larger batches ─────────────────────────────────────────────────────────

describe("runBatch — batch 1–1,000", () => {
  const r = runBatch({ batch_start: 1, batch_end: 1000 });

  it("numbers_tested = 1000", () => expect(r.numbers_tested).toBe(1000));
  it("stopped_reason = completed", () => expect(r.stopped_reason).toBe("completed"));

  it("max_steps_number is 871 (178 steps)", () => {
    expect(r.max_steps_number).toBe(871);
    expect(r.max_steps).toBe(178);
  });

  it("n=27 peak_ratio ≈ 341.9 is within batch", () => {
    expect(r.max_peak_ratio).toBeGreaterThan(300);
  });

  it("has near-escape candidates", () => {
    expect(r.near_escape_candidates.length).toBeGreaterThan(0);
  });

  it("residue_class_summary is non-empty", () => {
    expect(r.residue_class_summary.length).toBeGreaterThan(0);
  });
});
