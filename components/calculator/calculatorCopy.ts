export const CALCULATOR_STEP_COPY = {
  // Main headline metric — matches records table definition
  stepsLabel: "Steps",
  stepsCaption: "Transitions required to reach 1",
  // Secondary detail — shown in summary panel only
  sequenceLengthLabel: "Sequence length",
  sequenceLengthCaption: "Includes the starting value",
  // Keep stoppingTimeLabel for backward-compat references in tests
  stoppingTimeLabel: "Steps",
  stoppingTimeCaption: "Transitions required to reach 1",
  recordsNote:
    "Steps = transitions to reach 1. This matches the records table definition. Sequence length (one more) is shown below.",
} as const;
