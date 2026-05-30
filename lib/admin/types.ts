export interface AdminSession {
  sub: "admin";
  iat: number;
  exp: number;
}

export type StorageStatus = "safe" | "watch" | "warning" | "critical" | "pause";

export interface TableSizeRow {
  tableName: string;
  estimatedRows: number | null;
  estimatedBytes: number | null;
  percentOfTracked: number | null;
  status: "ok" | "growing" | "large" | "unknown" | "not_found";
  exists: boolean;
}

export interface StorageMonitor {
  estimatedUsedBytes: number;
  limitBytes: number;
  percentUsed: number;
  status: StorageStatus;
  tableRows: TableSizeRow[];
  fetchedAt: string;
}

export interface R2Config {
  configured: boolean;
  bucketName: string | null;
  endpointConfigured: boolean;
  publicBaseUrlConfigured: boolean;
  archiveEnabled: boolean;
  archiveFormat: string | null;
  deleteAfterUpload: boolean;
}

export interface R2Status {
  config: R2Config;
  connectionCheckedAt: string | null;
  lastManifest: string | null;
}

export interface EngineAdminState {
  currentNumber: number | null;
  lastProcessed: number | null;
  totalChecked: number | null;
  status: string | null;
  throughputPerSecond: number | null;
  lastHeartbeat: string | null;
  workersActive: number;
  startedAt: string | null;
  lastError: string | null;
  highestPeak: number | null;
  longestSteps: number | null;
}

export interface RuntimeConfig {
  mode: string;
  batchSize: number;
  batchDelayMs: number;
  logIntervalMs: number;
  storageMode: string;
  keepRecentResults: number;
  activityLogRetentionRows: number;
  rangeSummaryInterval: number;
  milestoneInterval: number;
  autoThrottleEnabled: boolean;
  pauseOnCriticalStorage: boolean;
  updatedAt?: string | null;
}

export interface CleanupResult {
  ok: boolean;
  error?: string;
  resultsBefore?: number;
  resultsAfter?: number;
  resultsDeleted?: number;
  logsBefore?: number;
  logsAfter?: number;
  logsDeleted?: number;
  ranAt?: string;
}

export interface AdminMetrics {
  engine: EngineAdminState;
  storage: StorageMonitor;
  r2: R2Status;
  runtime: RuntimeConfig;
  fetchedAt: string;
}

export interface ActivityLogEntry {
  id?: string;
  event_type: string;
  message: string;
  created_at: string;
  numbers_processed?: number | null;
  numbers_per_second?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface HealthPanel {
  dbConnected: boolean;
  lastSuccessfulRead: string | null;
  lastError: string | null;
  storageStatus: StorageStatus;
  metricsEnabled: boolean;
  recentWarnings: ActivityLogEntry[];
}

export interface WorkerLockState {
  id: string;
  lockName: string;
  workerInstanceId: string;
  hostname: string | null;
  pid: number | null;
  acquiredAt: string;
  heartbeatAt: string;
  expiresAt: string;
  releasedAt: string | null;
  status: "active" | "expired" | "released" | "force_released";
  secondsUntilExpiry: number;
  metadata: Record<string, unknown>;
}

export type WatchdogSignalStatus = "safe" | "warning" | "critical" | "unknown";

export interface WatchdogSignal {
  name: string;
  status: WatchdogSignalStatus;
  message: string;
  detail?: string;
}

export interface WatchdogResult {
  overall: WatchdogSignalStatus;
  signals: {
    lock: WatchdogSignal;
    progress: WatchdogSignal;
    pointer: WatchdogSignal;
    storage: WatchdogSignal;
    config: WatchdogSignal;
  };
  evaluatedAt: string;
}

/** Shape returned by GET /api/admin/metrics */
export interface AdminMetricsApiResponse {
  engine: EngineAdminState | null;
  engineConnected: boolean;
  engineError: string | null;
  storage: StorageMonitor;
  r2: R2Status;
  throughput: Array<{ ts: string; nps: number }>;
  activity: ActivityLogEntry[];
  workerLock: WorkerLockState | null;
  lockTableExists: boolean;
  watchdog: WatchdogResult;
  runtimeConfigExists: boolean;
  latestIntegrityRun: null;
  fetchedAt: string;
}
