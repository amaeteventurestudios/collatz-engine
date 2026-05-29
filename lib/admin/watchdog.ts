import type {
  EngineAdminState,
  WorkerLockState,
  StorageStatus,
  WatchdogSignal,
  WatchdogSignalStatus,
  WatchdogResult,
} from "./types";

function secondsSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

function worstOf(...statuses: WatchdogSignalStatus[]): WatchdogSignalStatus {
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("warning")) return "warning";
  if (statuses.includes("safe")) return "safe";
  return "unknown";
}

function evaluateLock(
  workerLock: WorkerLockState | null,
  lockTableExists: boolean,
  engineRunning: boolean,
): WatchdogSignal {
  if (!lockTableExists) {
    return {
      name: "Worker Lock",
      status: "unknown",
      message: "Lock table not found",
      detail: "Run phase-2b-worker-lock.sql to enable lock tracking.",
    };
  }

  if (!workerLock) {
    return engineRunning
      ? {
          name: "Worker Lock",
          status: "critical",
          message: "Engine running but no lock found",
          detail: "A running engine should always hold an active lock.",
        }
      : {
          name: "Worker Lock",
          status: "unknown",
          message: "No lock record found",
          detail: "No worker has run since the lock table was created.",
        };
  }

  if (workerLock.status === "active") {
    const expiresInSecs = Math.floor(
      (new Date(workerLock.expiresAt).getTime() - Date.now()) / 1000,
    );
    const hbAge = secondsSince(workerLock.heartbeatAt);

    if (expiresInSecs < 0) {
      return {
        name: "Worker Lock",
        status: "critical",
        message: "Active lock has expired",
        detail: `Lock expired ${Math.abs(expiresInSecs)}s ago without a clean release. Worker may have crashed.`,
      };
    }
    if (expiresInSecs < 10 || (hbAge != null && hbAge > 60)) {
      return {
        name: "Worker Lock",
        status: "warning",
        message: hbAge != null && hbAge > 60 ? `Heartbeat ${hbAge}s old` : `Lock expires in ${expiresInSecs}s`,
        detail: "Heartbeat is delayed. Lock may expire soon.",
      };
    }
    return {
      name: "Worker Lock",
      status: "safe",
      message: "Lock active — heartbeat fresh",
      detail: `Expires in ${expiresInSecs}s.`,
    };
  }

  if (workerLock.status === "expired") {
    return {
      name: "Worker Lock",
      status: engineRunning ? "critical" : "warning",
      message: "Last lock expired without clean release",
      detail: "Worker may have crashed. A new worker can acquire the lock.",
    };
  }

  if (workerLock.status === "force_released") {
    return {
      name: "Worker Lock",
      status: "warning",
      message: "Lock was force-released",
      detail: "Manually released. Confirm the worker is stopped.",
    };
  }

  return {
    name: "Worker Lock",
    status: "safe",
    message: "Lock released cleanly",
    detail: "Worker exited normally.",
  };
}

function evaluateProgress(engine: EngineAdminState | null): WatchdogSignal {
  if (!engine) {
    return {
      name: "Worker Progress",
      status: "unknown",
      message: "Engine state unavailable",
      detail: "Cannot read engine table.",
    };
  }

  if (engine.status === "paused") {
    return {
      name: "Worker Progress",
      status: "safe",
      message: "Engine paused",
      detail: "No progress expected while paused.",
    };
  }

  const hbAge = secondsSince(engine.lastHeartbeat);

  if (hbAge == null) {
    return {
      name: "Worker Progress",
      status: "unknown",
      message: "No heartbeat recorded",
      detail: "Engine has not reported a heartbeat yet.",
    };
  }

  if (hbAge < 180) {
    return {
      name: "Worker Progress",
      status: "safe",
      message: `Heartbeat ${hbAge}s ago`,
      detail: "Engine is reporting progress normally.",
    };
  }
  if (hbAge < 600) {
    return {
      name: "Worker Progress",
      status: "warning",
      message: `Heartbeat ${hbAge}s ago`,
      detail: "Engine heartbeat is delayed. Worker may be slow or stalled.",
    };
  }
  return {
    name: "Worker Progress",
    status: "critical",
    message: `Heartbeat ${hbAge}s ago`,
    detail: "Engine heartbeat not updated in 10+ minutes. Worker is likely stopped.",
  };
}

function evaluatePointer(engine: EngineAdminState | null): WatchdogSignal {
  if (!engine || engine.currentNumber == null || engine.lastProcessed == null) {
    return {
      name: "Sequence Pointer",
      status: "unknown",
      message: "Pointer data unavailable",
      detail: "currentNumber or lastProcessed is null.",
    };
  }

  const expected = engine.lastProcessed + 1;
  if (engine.currentNumber === expected) {
    return {
      name: "Sequence Pointer",
      status: "safe",
      message: `Aligned at n=${engine.currentNumber.toLocaleString("en-US")}`,
      detail: "currentNumber = lastProcessed + 1 as expected.",
    };
  }

  const gap = engine.currentNumber - engine.lastProcessed;
  return {
    name: "Sequence Pointer",
    status: "critical",
    message: `Pointer gap: ${gap.toLocaleString("en-US")}`,
    detail: `currentNumber (${engine.currentNumber.toLocaleString("en-US")}) is ${gap} ahead of lastProcessed (${engine.lastProcessed.toLocaleString("en-US")}). Possible coverage gap.`,
  };
}

function evaluateStorage(storageStatus: StorageStatus): WatchdogSignal {
  if (storageStatus === "safe" || storageStatus === "watch") {
    return {
      name: "Storage",
      status: "safe",
      message: `Storage ${storageStatus}`,
      detail: "Database storage is within safe operating bounds.",
    };
  }
  if (storageStatus === "warning") {
    return {
      name: "Storage",
      status: "warning",
      message: "Storage approaching limit",
      detail: "Above 1.5 GB. Consider running cleanup or archive.",
    };
  }
  return {
    name: "Storage",
    status: "critical",
    message: `Storage ${storageStatus}`,
    detail: "Critically high storage. Engine may auto-pause. Run cleanup immediately.",
  };
}

function evaluateConfig(runtimeConfigExists: boolean): WatchdogSignal {
  if (runtimeConfigExists) {
    return {
      name: "Runtime Config",
      status: "safe",
      message: "Config table active",
      detail: "Runtime config is managed from the database.",
    };
  }
  return {
    name: "Runtime Config",
    status: "warning",
    message: "Using environment defaults",
    detail: "Config table not found. Run phase-2a-storage-guardrails.sql to enable live switching.",
  };
}

export interface WatchdogInput {
  engine: EngineAdminState | null;
  workerLock: WorkerLockState | null;
  lockTableExists: boolean;
  storageStatus: StorageStatus;
  runtimeConfigExists: boolean;
}

export function computeWatchdog(input: WatchdogInput): WatchdogResult {
  const { engine, workerLock, lockTableExists, storageStatus, runtimeConfigExists } = input;
  const engineRunning = engine?.status === "running";

  const lock = evaluateLock(workerLock, lockTableExists, engineRunning);
  const progress = evaluateProgress(engine);
  const pointer = evaluatePointer(engine);
  const storage = evaluateStorage(storageStatus);
  const config = evaluateConfig(runtimeConfigExists);

  const overall = worstOf(
    lock.status,
    progress.status,
    pointer.status,
    storage.status,
    config.status,
  );

  return {
    overall,
    signals: { lock, progress, pointer, storage, config },
    evaluatedAt: new Date().toISOString(),
  };
}
