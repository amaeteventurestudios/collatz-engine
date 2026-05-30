"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { computeCollatz, computeCollatzSummary } from "@/lib/collatz/engine";
import { getSeedResult } from "@/lib/collatz/examples";
import { getEstimatedEnginePosition } from "@/lib/collatz/live-estimate";
import type { DashboardRecord } from "@/app/api/collatz/dashboard/route";
import type { CollatzResult, CollatzSummary } from "@/lib/collatz/types";

export type DisplayMode =
  | "estimated_live"
  | "latest_verified"
  | "longest_record"
  | "highest_peak";

export interface VisualizationWindowRow {
  n: number;
  steps: number;
  peak: number;
  peakRatio: number;
  oddSteps: number;
  evenSteps: number;
  firstDescentStep: number | null;
  oddStepDensity: number;
}

export interface VisualizationRecordRow {
  n: number;
  steps: number;
  peak: number;
  created_at: string | null;
}

export interface OddEvenSeriesPoint {
  step: number;
  value: bigint;
  isOdd: boolean;
}

export interface TrajectoryPoint {
  step: number;
  value: bigint;
}

export interface EstimatedNearEscapeCandidate {
  n: number;
  steps: number;
  peak: number;
  peakRatio: number;
  ratio: number;
  oddStepCount: number;
  evenStepCount: number;
  firstDescentStep: number | null;
  oddStepDensity: number;
}

export interface EstimatedLiveCollatzResult {
  mode: DisplayMode;
  setMode: (mode: DisplayMode) => void;
  estimatedN: number;
  estimatedLabelN: string;
  lastVerifiedN: number;
  lastVerifiedAt: Date | null;
  payloadGeneratedAt: Date | null;
  pollIntervalMs: number;
  isEstimated: boolean;
  engineStatus: string | null;
  result: CollatzResult;
  label: string;
  helperCopy: string | null;
  loading: boolean;
  error: string | null;
  trajectorySummary: CollatzResult;
  sequence: bigint[];
  trajectoryPoints: TrajectoryPoint[];
  steps: number;
  peak: bigint;
  peakRatio: number;
  firstDescentStep: number | null;
  oddStepCount: number;
  evenStepCount: number;
  oddEvenSeries: OddEvenSeriesPoint[];
  descentProfilePoints: TrajectoryPoint[];
  stoppingTimeWindow: VisualizationWindowRow[];
  peakGrowthWindow: VisualizationWindowRow[];
  nearEscapeCandidates: EstimatedNearEscapeCandidate[];
  topBySteps: VisualizationRecordRow[];
  topByPeak: VisualizationRecordRow[];
}

const FALLBACK = getSeedResult(27);
const TRAJECTORY_REFRESH_MS = 5_000;
const WINDOW_REFRESH_MS = 10_000;
const CANDIDATE_REFRESH_MS = 15_000;
const PREVIEW_WINDOW_SIZE = 250;
const CANDIDATE_WINDOW_RADIUS = 60;

function fmtN(n: number): string {
  return n.toLocaleString("en-US");
}

function safeComputeResult(n: number): CollatzResult {
  if (!Number.isFinite(n) || n <= 0) return FALLBACK;
  try {
    const result = computeCollatz(Math.round(n));
    return result.reached_one && result.full_sequence.length > 1 ? result : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

function safeComputeSummary(n: number): CollatzSummary | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  try {
    const summary = computeCollatzSummary(Math.round(n));
    return summary.reached_one ? summary : null;
  } catch {
    return null;
  }
}

function recordToRow(record: DashboardRecord): VisualizationRecordRow {
  return {
    n: record.startingNumber,
    steps: record.steps,
    peak: record.peakValue,
    created_at: record.discoveredAt,
  };
}

function summaryToWindowRow(summary: CollatzSummary): VisualizationWindowRow {
  return {
    n: Number(summary.start_number),
    steps: summary.steps_to_1,
    peak: Number(summary.peak_value),
    peakRatio: summary.peak_ratio,
    oddSteps: summary.odd_steps,
    evenSteps: summary.even_steps,
    firstDescentStep: summary.first_descent_step,
    oddStepDensity: summary.odd_step_density,
  };
}

function buildWindow(centerN: number, size = PREVIEW_WINDOW_SIZE): VisualizationWindowRow[] {
  if (!Number.isFinite(centerN) || centerN <= 1) return [];
  const half = Math.floor(size / 2);
  const start = Math.max(2, Math.round(centerN) - half);
  const rows: VisualizationWindowRow[] = [];

  for (let n = start; n < start + size; n++) {
    const summary = safeComputeSummary(n);
    if (summary) rows.push(summaryToWindowRow(summary));
  }

  return rows;
}

function buildNearEscapeCandidates(centerN: number): EstimatedNearEscapeCandidate[] {
  if (!Number.isFinite(centerN) || centerN <= 1) return [];
  const start = Math.max(2, Math.round(centerN) - CANDIDATE_WINDOW_RADIUS);
  const end = Math.round(centerN) + CANDIDATE_WINDOW_RADIUS;
  const candidates: EstimatedNearEscapeCandidate[] = [];

  for (let n = start; n <= end; n++) {
    const summary = safeComputeSummary(n);
    if (!summary) continue;
    candidates.push({
      n,
      steps: summary.steps_to_1,
      peak: Number(summary.peak_value),
      peakRatio: summary.peak_ratio,
      ratio: summary.peak_ratio,
      oddStepCount: summary.odd_steps,
      evenStepCount: summary.even_steps,
      firstDescentStep: summary.first_descent_step,
      oddStepDensity: summary.odd_step_density,
    });
  }

  return candidates
    .sort((a, b) => {
      const byPeakRatio = b.peakRatio - a.peakRatio;
      if (byPeakRatio !== 0) return byPeakRatio;
      const byStoppingTime = b.steps - a.steps;
      if (byStoppingTime !== 0) return byStoppingTime;
      return b.oddStepDensity - a.oddStepDensity;
    })
    .slice(0, 5);
}

function resultPoints(result: CollatzResult): TrajectoryPoint[] {
  return result.full_sequence.map((value, step) => ({ step, value }));
}

function resultOddEvenSeries(result: CollatzResult): OddEvenSeriesPoint[] {
  return result.full_sequence.map((value, step) => ({
    step,
    value,
    isOdd: value % 2n !== 0n,
  }));
}

function selectedLabel(
  mode: DisplayMode,
  result: CollatzResult,
  isEstimated: boolean,
): string {
  const n = Number(result.start_number);
  if (mode === "estimated_live") {
    return isEstimated
      ? `Estimated Live n=~${fmtN(n)}`
      : `Estimated Live using latest verified n=${fmtN(n)}`;
  }
  if (mode === "latest_verified") return `Latest Verified n=${fmtN(n)}`;
  if (mode === "longest_record") return `Longest Record n=${fmtN(n)}`;
  return `Highest Peak n=${fmtN(n)}`;
}

function selectedHelperCopy(mode: DisplayMode, isEstimated: boolean): string | null {
  if (mode === "estimated_live") {
    return isEstimated
      ? "Generated locally from the estimated engine position. Verified catalog data updates on backend sync."
      : "Engine is not live-estimating; showing the latest backend-verified trajectory.";
  }
  if (mode === "longest_record") {
    return "Authoritative all-time record data from the backend; visualization is computed locally from that verified n.";
  }
  if (mode === "highest_peak") {
    return "Authoritative all-time peak record data from the backend; visualization is computed locally from that verified n.";
  }
  return null;
}

export function useEstimatedLiveCollatz(
  mode: DisplayMode,
  setMode: (mode: DisplayMode) => void,
): EstimatedLiveCollatzResult {
  const { data, loading, error, pollIntervalMs } = useDashboardData();
  const [trajectoryNow, setTrajectoryNow] = useState(() => Date.now());
  const [windowNow, setWindowNow] = useState(() => Date.now());
  const [candidateNow, setCandidateNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setTrajectoryNow(Date.now()), TRAJECTORY_REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setWindowNow(Date.now()), WINDOW_REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setCandidateNow(Date.now()), CANDIDATE_REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  const state = data?.engineState ?? null;
  const payloadGeneratedAt = useMemo(
    () => (data?.generatedAt ? new Date(data.generatedAt) : null),
    [data],
  );

  const position = useMemo(
    () =>
      getEstimatedEnginePosition({
        state,
        payloadGeneratedAt,
        nowMs: trajectoryNow,
        fallback: "last_verified",
      }),
    [state, payloadGeneratedAt, trajectoryNow],
  );

  const lastVerifiedN = position.lastVerifiedN;
  const latestVerifiedResult = useMemo(
    () => safeComputeResult(lastVerifiedN || Number(FALLBACK.start_number)),
    [lastVerifiedN],
  );
  const estimatedResult = useMemo(
    () => safeComputeResult(position.n || lastVerifiedN || Number(FALLBACK.start_number)),
    [position.n, lastVerifiedN],
  );

  const topBySteps = useMemo(
    () => (data?.records.longestTrajectories ?? []).map(recordToRow),
    [data?.records.longestTrajectories],
  );
  const topByPeak = useMemo(
    () => (data?.records.highestPeaks ?? []).map(recordToRow),
    [data?.records.highestPeaks],
  );

  const longestRecordResult = useMemo(
    () => safeComputeResult(topBySteps[0]?.n ?? Number(FALLBACK.start_number)),
    [topBySteps],
  );
  const highestPeakResult = useMemo(
    () => safeComputeResult(topByPeak[0]?.n ?? Number(FALLBACK.start_number)),
    [topByPeak],
  );

  const selectedResult = useMemo(() => {
    if (mode === "estimated_live") return estimatedResult;
    if (mode === "latest_verified") return latestVerifiedResult;
    if (mode === "longest_record") return longestRecordResult;
    return highestPeakResult;
  }, [mode, estimatedResult, latestVerifiedResult, longestRecordResult, highestPeakResult]);

  const selectedIsEstimated = mode === "estimated_live" && position.isEstimated;
  const selectedN = Number(selectedResult.start_number);

  const previewCenterN = mode === "estimated_live" ? position.n : selectedN;

  const peakGrowthWindow = useMemo(() => {
    void windowNow;
    return buildWindow(previewCenterN, PREVIEW_WINDOW_SIZE);
  }, [previewCenterN, windowNow]);

  const stoppingTimeWindow = peakGrowthWindow;

  const nearEscapeCandidates = useMemo(() => {
    void candidateNow;
    return buildNearEscapeCandidates(previewCenterN);
  }, [previewCenterN, candidateNow]);

  const trajectoryPoints = useMemo(
    () => resultPoints(selectedResult),
    [selectedResult],
  );
  const oddEvenSeries = useMemo(
    () => resultOddEvenSeries(selectedResult),
    [selectedResult],
  );

  return {
    mode,
    setMode,
    estimatedN: position.n,
    estimatedLabelN: position.isEstimated ? `~${fmtN(position.n)}` : fmtN(position.n),
    lastVerifiedN,
    lastVerifiedAt: state?.worker_heartbeat_at
      ? new Date(state.worker_heartbeat_at)
      : state?.updated_at
        ? new Date(state.updated_at)
        : null,
    payloadGeneratedAt,
    pollIntervalMs,
    isEstimated: selectedIsEstimated,
    engineStatus: state?.current_status ?? null,
    result: selectedResult,
    label: selectedLabel(mode, selectedResult, selectedIsEstimated),
    helperCopy: selectedHelperCopy(mode, selectedIsEstimated),
    loading,
    error,
    trajectorySummary: selectedResult,
    sequence: selectedResult.full_sequence,
    trajectoryPoints,
    steps: selectedResult.steps_to_1,
    peak: selectedResult.peak_value,
    peakRatio: selectedResult.peak_ratio,
    firstDescentStep: selectedResult.first_descent_step,
    oddStepCount: selectedResult.odd_steps,
    evenStepCount: selectedResult.even_steps,
    oddEvenSeries,
    descentProfilePoints: trajectoryPoints,
    stoppingTimeWindow,
    peakGrowthWindow,
    nearEscapeCandidates,
    topBySteps,
    topByPeak,
  };
}
