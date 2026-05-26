import { describe, it, expect } from "vitest";
import { computeCollatz } from "./engine";

// ── Known accurate values ───────────────────────────────────────────────────

describe("computeCollatz — n=1 (trivial base case)", () => {
  const r = computeCollatz(1);
  it("reaches one", () => expect(r.reached_one).toBe(true));
  it("steps_to_1 = 0", () => expect(r.steps_to_1).toBe(0));
  it("peak_value = 1", () => expect(r.peak_value).toBe(1n));
  it("peak_ratio = 1", () => expect(r.peak_ratio).toBe(1));
  it("sequence = [1]", () => expect(r.full_sequence).toEqual([1n]));
  it("stopped_reason = reached_one", () => expect(r.stopped_reason).toBe("reached_one"));
  it("odd_steps + even_steps = steps_to_1", () =>
    expect(r.odd_steps + r.even_steps).toBe(r.steps_to_1));
});

describe("computeCollatz — n=2", () => {
  const r = computeCollatz(2);
  it("reaches one", () => expect(r.reached_one).toBe(true));
  it("steps_to_1 = 1", () => expect(r.steps_to_1).toBe(1));
  it("peak_value = 2", () => expect(r.peak_value).toBe(2n));
  it("sequence = [2, 1]", () => expect(r.full_sequence).toEqual([2n, 1n]));
  it("even_steps = 1, odd_steps = 0", () => {
    expect(r.even_steps).toBe(1);
    expect(r.odd_steps).toBe(0);
  });
  it("first_descent_step = 1", () => expect(r.first_descent_step).toBe(1));
});

describe("computeCollatz — n=3", () => {
  const r = computeCollatz(3);
  it("reaches one", () => expect(r.reached_one).toBe(true));
  it("steps_to_1 = 7", () => expect(r.steps_to_1).toBe(7));
  it("peak_value = 16", () => expect(r.peak_value).toBe(16n));
  it("sequence is correct", () =>
    expect(r.full_sequence).toEqual([3n, 10n, 5n, 16n, 8n, 4n, 2n, 1n]));
  it("odd_steps = 2", () => expect(r.odd_steps).toBe(2));
  it("even_steps = 5", () => expect(r.even_steps).toBe(5));
  it("odd_steps + even_steps = steps_to_1", () =>
    expect(r.odd_steps + r.even_steps).toBe(r.steps_to_1));
  it("first_descent_step = 6", () => expect(r.first_descent_step).toBe(6));
  it("compressed_odd_only_path contains 3 and 5", () => {
    expect(r.compressed_odd_only_path).toContain(3n);
    expect(r.compressed_odd_only_path).toContain(5n);
    expect(r.compressed_odd_only_path).toContain(1n);
    expect(r.compressed_odd_only_path).not.toContain(10n);
    expect(r.compressed_odd_only_path).not.toContain(16n);
  });
});

describe("computeCollatz — n=6", () => {
  const r = computeCollatz(6);
  it("reaches one", () => expect(r.reached_one).toBe(true));
  it("steps_to_1 = 8", () => expect(r.steps_to_1).toBe(8));
  it("peak_value = 16", () => expect(r.peak_value).toBe(16n));
  it("sequence = [6,3,10,5,16,8,4,2,1]", () =>
    expect(r.full_sequence).toEqual([6n, 3n, 10n, 5n, 16n, 8n, 4n, 2n, 1n]));
});

describe("computeCollatz — n=7", () => {
  const r = computeCollatz(7);
  it("reaches one", () => expect(r.reached_one).toBe(true));
  it("steps_to_1 = 16", () => expect(r.steps_to_1).toBe(16));
  it("peak_value = 52", () => expect(r.peak_value).toBe(52n));
});

describe("computeCollatz — n=27 (famous trajectory)", () => {
  const r = computeCollatz(27);
  it("reaches one", () => expect(r.reached_one).toBe(true));
  it("steps_to_1 = 111", () => expect(r.steps_to_1).toBe(111));
  it("peak_value = 9232", () => expect(r.peak_value).toBe(9232n));
  it("full_sequence has 112 elements", () => expect(r.full_sequence.length).toBe(112));
  it("sequence starts at 27", () => expect(r.full_sequence[0]).toBe(27n));
  it("sequence ends at 1", () => expect(r.full_sequence[111]).toBe(1n));
  it("odd_steps + even_steps = 111", () =>
    expect(r.odd_steps + r.even_steps).toBe(111));
  it("densities sum to 1", () =>
    expect(r.odd_step_density + r.even_step_density).toBeCloseTo(1, 10));
  it("peak_ratio ≈ 341.93", () =>
    expect(r.peak_ratio).toBeCloseTo(9232 / 27, 5));
  it("start_number = 27", () => expect(r.start_number).toBe(27n));
  it("stopped_reason = reached_one", () => expect(r.stopped_reason).toBe("reached_one"));
});

describe("computeCollatz — remaining seed examples all reach 1", () => {
  const cases: [number, number][] = [
    [97, 118],
    [871, 178],
    [6171, 261],
    [77031, 350],
    [837799, 524],
  ];
  for (const [n, expectedSteps] of cases) {
    it(`n=${n}: steps_to_1 = ${expectedSteps}`, () => {
      const r = computeCollatz(n);
      expect(r.reached_one).toBe(true);
      expect(r.steps_to_1).toBe(expectedSteps);
      expect(r.stopped_reason).toBe("reached_one");
    });
  }
});

describe("computeCollatz — metric invariants", () => {
  const testCases = [1, 2, 3, 6, 7, 27, 97, 871];
  for (const n of testCases) {
    it(`n=${n}: odd_steps + even_steps = steps_to_1`, () => {
      const r = computeCollatz(n);
      expect(r.odd_steps + r.even_steps).toBe(r.steps_to_1);
    });
    it(`n=${n}: sequence length = steps_to_1 + 1`, () => {
      const r = computeCollatz(n);
      expect(r.full_sequence.length).toBe(r.steps_to_1 + 1);
    });
    it(`n=${n}: peak_value >= start_number`, () => {
      const r = computeCollatz(n);
      expect(r.peak_value >= r.start_number).toBe(true);
    });
    it(`n=${n}: peak_ratio >= 1`, () => {
      const r = computeCollatz(n);
      expect(r.peak_ratio).toBeGreaterThanOrEqual(1);
    });
    it(`n=${n}: compressed_odd_only_path contains only odd values`, () => {
      const r = computeCollatz(n);
      for (const v of r.compressed_odd_only_path) {
        expect(v % 2n).toBe(1n);
      }
    });
  }
});

// ── Input validation ────────────────────────────────────────────────────────

describe("computeCollatz — invalid input rejection", () => {
  it("rejects zero", () => {
    const r = computeCollatz(0);
    expect(r.stopped_reason).toBe("invalid_input");
    expect(r.reached_one).toBe(false);
  });
  it("rejects negative number", () => {
    const r = computeCollatz(-5);
    expect(r.stopped_reason).toBe("invalid_input");
  });
  it("rejects decimal", () => {
    const r = computeCollatz(3.7);
    expect(r.stopped_reason).toBe("invalid_input");
  });
  it("rejects non-numeric string", () => {
    const r = computeCollatz("hello");
    expect(r.stopped_reason).toBe("invalid_input");
  });
  it("rejects empty string", () => {
    const r = computeCollatz("");
    expect(r.stopped_reason).toBe("invalid_input");
  });
  it("rejects zero as string", () => {
    const r = computeCollatz("0");
    expect(r.stopped_reason).toBe("invalid_input");
  });
  it("rejects negative BigInt", () => {
    const r = computeCollatz(-1n);
    expect(r.stopped_reason).toBe("invalid_input");
  });
  it("accepts valid string input", () => {
    const r = computeCollatz("27");
    expect(r.reached_one).toBe(true);
    expect(r.steps_to_1).toBe(111);
  });
  it("accepts BigInt input", () => {
    const r = computeCollatz(27n);
    expect(r.reached_one).toBe(true);
    expect(r.steps_to_1).toBe(111);
  });
});

// ── Max steps guard ─────────────────────────────────────────────────────────

describe("computeCollatz — max steps guard", () => {
  it("stops when maxSteps is exceeded before reaching 1", () => {
    const r = computeCollatz(27, { maxSteps: 5 });
    expect(r.reached_one).toBe(false);
    expect(r.stopped_reason).toBe("max_steps_exceeded");
    expect(r.full_sequence.length).toBe(6); // start + 5 steps
  });
});
