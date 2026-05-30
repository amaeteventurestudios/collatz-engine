import { describe, expect, it } from "vitest";
import { CALCULATOR_STEP_COPY } from "@/components/calculator/calculatorCopy";
import { runCalculator } from "./calculator";

function expectCalculation(input: string) {
  const result = runCalculator(input, 10_000, false);
  if ("error" in result) throw new Error(result.error);
  return result;
}

describe("calculator terminology", () => {
  it("stoppingTime is transitions to reach 1; sequenceLength is one more", () => {
    const result = expectCalculation("27");
    expect(result.sequenceLength).toBe(result.stoppingTime + 1);
    expect(result.totalSteps).toBe(result.sequenceLength);
  });

  it("main step label matches records table definition (stoppingTime)", () => {
    // The headline metric shown in the calculator cards uses stoppingTime,
    // matching the records table definition of "steps".
    expect(CALCULATOR_STEP_COPY.stepsLabel).toBe("Steps");
    expect(CALCULATOR_STEP_COPY.stepsCaption).toBe("Transitions required to reach 1");
    expect(CALCULATOR_STEP_COPY.stoppingTimeLabel).toBe("Steps");
    expect(CALCULATOR_STEP_COPY.stoppingTimeCaption).toBe("Transitions required to reach 1");
  });

  it("sequence length is a secondary label, not the headline metric", () => {
    expect(CALCULATOR_STEP_COPY.sequenceLengthLabel).toBe("Sequence length");
    expect(CALCULATOR_STEP_COPY.sequenceLengthCaption).toBe("Includes the starting value");
  });

  it("records note clarifies steps = transitions", () => {
    expect(CALCULATOR_STEP_COPY.recordsNote).toContain("Steps = transitions to reach 1");
  });
});

describe("calculator known record value n=6,649,279", () => {
  it("stoppingTime (displayed as Steps) = 664, matching the records table", () => {
    const result = expectCalculation("6649279");
    expect(result.stoppingTime).toBe(664);
  });

  it("sequenceLength = 665 (secondary detail, includes starting value)", () => {
    const result = expectCalculation("6649279");
    expect(result.sequenceLength).toBe(665);
    expect(result.sequenceLength).toBe(result.stoppingTime + 1);
  });

  it("highestPeak = 15,208,728,208", () => {
    const result = expectCalculation("6649279");
    expect(result.highestPeak).toBe(15_208_728_208n);
  });

  it("no calculation logic changed — math results identical", () => {
    const result = expectCalculation("6649279");
    expect(result.stoppingTime).toBe(664);
    expect(result.sequenceLength).toBe(665);
    expect(result.highestPeak).toBe(15_208_728_208n);
    expect(result.reachedOne).toBe(true);
    expect(result.startNumber).toBe(6_649_279n);
  });
});
