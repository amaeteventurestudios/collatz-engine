import type { LucideIcon } from "lucide-react";

export type VisualStudioTabId =
  | "live-sequence-stack"
  | "convergence-tree"
  | "collatz-bloom"
  | "records-extremes";

export type ScaleMode = "log" | "linear";

export type VisualPathTone = "latest" | "recent" | "older" | "record";

export type VisualStudioDataSource = "connected" | "unconfigured" | "error";

export interface VisualStudioTab {
  id: VisualStudioTabId;
  label: string;
  status?: string;
  Icon: LucideIcon;
}

export interface VisualTrajectoryPoint {
  step: number;
  value: bigint;
}

export interface VisualTrajectory {
  id: string;
  start: number;
  startLabel: string;
  values: VisualTrajectoryPoint[];
  steps: number;
  peak: bigint;
  peakLabel: string;
  oddCount: number;
  evenCount: number;
  descentStep: number | null;
  checkedAt?: string | null;
  isRecord: boolean;
  recordLabel?: string;
  reachedOne: boolean;
  partial: boolean;
}

export interface VisualStudioEngineSnapshot {
  rawStatus: string | null;
  statusLabel: string;
  isLive: boolean;
  rangeLabel: string;
  lastSyncLabel: string;
  lastCheckedNumber: number;
  totalNumbersChecked: number;
  heartbeatAt?: string | null;
  longestSteps?: number | null;
  highestPeak?: number | null;
}

export interface VisualStudioDataResult {
  trajectories: VisualTrajectory[];
  engine: VisualStudioEngineSnapshot | null;
  loading: boolean;
  error: string | null;
  dataSource: VisualStudioDataSource;
  lastSyncAt: Date | null;
  hasRecordData: boolean;
  retry: () => void;
}

export interface CameraCommand {
  action: "reset" | "zoom-in" | "zoom-out" | "top";
  key: number;
}
