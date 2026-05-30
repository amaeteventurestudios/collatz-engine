import { describe, expect, it } from "vitest";
import { CALCULATOR_STEP_COPY } from "@/components/calculator/calculatorCopy";
import { runCalculator } from "./calculator";

function expectCalculation(input: string) {
  const result = runCalculator(input, 10_000, false);
  if ("error" in result) throw new Error(result.error);
  return result;
}

describe("calculator terminology", () => {
  it("uses sequence length for values including the starting number", () => {
    const result = expectCalculation("27");
    expect(result.sequenceLength).toBe(result.stoppingTime + 1);
    expect(result.totalSteps).toBe(result.sequenceLength);
  });

  it("shows stopping-time copy separately from sequence-length copy", () => {
    expect(CALCULATOR_STEP_COPY.sequenceLengthLabel).toBe("Sequence Length");
    expect(CALCULATOR_STEP_COPY.sequenceLengthCaption).toBe(
      "Values in trajectory, including starting number",
    );
    expect(CALCULATOR_STEP_COPY.stoppingTimeLabel).toBe("Stopping Time");
    expect(CALCULATOR_STEP_COPY.stoppingTimeCaption).toBe("Steps to reach 1");
    expect(CALCULATOR_STEP_COPY.recordsNote).toContain("Records use stopping time.");
  });
});

describe("calculator known record value", () => {
  it("n=6,649,279 keeps sequence length, stopping time, and peak unchanged", () => {
    const result = expectCalculation("6649279");
    expect(result.sequenceLength).toBe(665);
    expect(result.stoppingTime).toBe(664);
    expect(result.sequenceLength).toBe(result.stoppingTime + 1);
    expect(result.highestPeak).toBe(15_208_728_208n);
  });
});
