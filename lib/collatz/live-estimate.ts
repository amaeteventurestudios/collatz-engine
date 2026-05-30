import type { EngineState } from "@/lib/collatz/store";

export interface EnginePositionEstimate {
  n: number;
  baseN: number;
  lastVerifiedN: number;
  isEstimated: boolean;
  reason: "running_estimate" | "not_running" | "invalid_rate" | "invalid_timestamp";
}

interface EstimateInput {
  state: EngineState | null;
  payloadGeneratedAt: Date | null;
  nowMs?: number;
  fallback?: "last_verified" | "queued";
}

function finitePositiveNumber(value: number | null | undefined): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function getEstimatedEnginePosition({
  state,
  payloadGeneratedAt,
  nowMs = Date.now(),
  fallback = "last_verified",
}: EstimateInput): EnginePositionEstimate {
  const lastVerifiedN = finitePositiveNumber(state?.last_checked_number) ?? 0;
  const queuedN =
    finitePositiveNumber(state?.current_number) ??
    (lastVerifiedN > 0 ? lastVerifiedN + 1 : 0);
  const baseN = fallback === "queued" ? queuedN : lastVerifiedN;
  const fallbackN = Math.max(0, baseN);

  if (state?.current_status !== "running") {
    return {
      n: fallbackN,
      baseN,
      lastVerifiedN,
      isEstimated: false,
      reason: "not_running",
    };
  }

  const rate = finitePositiveNumber(state.numbers_per_second);
  if (rate === null) {
    return {
      n: fallbackN,
      baseN,
      lastVerifiedN,
      isEstimated: false,
      reason: "invalid_rate",
    };
  }

  if (!payloadGeneratedAt || !Number.isFinite(payloadGeneratedAt.getTime())) {
    return {
      n: fallbackN,
      baseN,
      lastVerifiedN,
      isEstimated: false,
      reason: "invalid_timestamp",
    };
  }

  const elapsedSeconds = Math.max(
    0,
    (nowMs - payloadGeneratedAt.getTime()) / 1000,
  );
  const projectedN = Math.max(fallbackN, Math.round(queuedN + rate * elapsedSeconds));

  return {
    n: projectedN,
    baseN: queuedN,
    lastVerifiedN,
    isEstimated: projectedN > queuedN,
    reason: "running_estimate",
  };
}
