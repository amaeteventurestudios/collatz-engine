import { describe, it, expect } from "vitest";
import { storageStatus, formatBytes } from "./storage";
import { MODE_PRESETS, RECOVERY_DEFAULTS } from "../collatz/runtime-config";

// ── Storage threshold helper ───────────────────────────────────────────────────

describe("storageStatus", () => {
  it("returns safe under 1.2 GB", () => {
    expect(storageStatus(0)).toBe("safe");
    expect(storageStatus(1.1 * 1024 ** 3)).toBe("safe");
  });

  it("returns watch between 1.2 and 1.5 GB", () => {
    expect(storageStatus(1.2 * 1024 ** 3)).toBe("watch");
    expect(storageStatus(1.4 * 1024 ** 3)).toBe("watch");
  });

  it("returns warning between 1.5 and 1.8 GB", () => {
    expect(storageStatus(1.5 * 1024 ** 3)).toBe("warning");
    expect(storageStatus(1.75 * 1024 ** 3)).toBe("warning");
  });

  it("returns critical between 1.8 and 1.9 GB", () => {
    expect(storageStatus(1.8 * 1024 ** 3)).toBe("critical");
    expect(storageStatus(1.85 * 1024 ** 3)).toBe("critical");
  });

  it("returns pause at or above 1.9 GB", () => {
    expect(storageStatus(1.9 * 1024 ** 3)).toBe("pause");
    expect(storageStatus(2.0 * 1024 ** 3)).toBe("pause");
  });
});

// ── formatBytes ────────────────────────────────────────────────────────────────

describe("formatBytes", () => {
  it("formats bytes", () => expect(formatBytes(512)).toBe("512 B"));
  it("formats KB", () => expect(formatBytes(2048)).toBe("2.0 KB"));
  it("formats MB", () => expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB"));
  it("formats GB", () => expect(formatBytes(1.5 * 1024 ** 3)).toBe("1.500 GB"));
});

// ── Runtime config mode presets ────────────────────────────────────────────────

describe("MODE_PRESETS", () => {
  it("recovery preset has conservative values", () => {
    const p = MODE_PRESETS.recovery;
    expect(p.batchSize).toBe(25);
    expect(p.batchDelayMs).toBe(10_000);
    expect(p.keepRecentResults).toBe(1_000);
    expect(p.activityLogRetentionRows).toBe(250);
    expect(p.storageMode).toBe("free-tier");
  });

  it("safe preset is more permissive than recovery", () => {
    const r = MODE_PRESETS.recovery;
    const s = MODE_PRESETS.safe;
    expect(s.batchSize!).toBeGreaterThan(r.batchSize!);
    expect(s.batchDelayMs!).toBeLessThan(r.batchDelayMs!);
    expect(s.keepRecentResults!).toBeGreaterThan(r.keepRecentResults!);
  });

  it("normal preset is more permissive than safe", () => {
    const s = MODE_PRESETS.safe;
    const n = MODE_PRESETS.normal;
    expect(n.batchSize!).toBeGreaterThan(s.batchSize!);
    expect(n.batchDelayMs!).toBeLessThan(s.batchDelayMs!);
    expect(n.keepRecentResults!).toBeGreaterThan(s.keepRecentResults!);
  });

  it("all presets use free-tier storage mode", () => {
    for (const [, preset] of Object.entries(MODE_PRESETS)) {
      expect(preset.storageMode).toBe("free-tier");
    }
  });

  it("no preset has zero delay (prevents hammering DB)", () => {
    for (const [, preset] of Object.entries(MODE_PRESETS)) {
      expect(preset.batchDelayMs!).toBeGreaterThan(0);
    }
  });
});

// ── Recovery defaults ──────────────────────────────────────────────────────────

describe("RECOVERY_DEFAULTS", () => {
  it("matches recovery preset values", () => {
    expect(RECOVERY_DEFAULTS.batchSize).toBe(MODE_PRESETS.recovery.batchSize);
    expect(RECOVERY_DEFAULTS.batchDelayMs).toBe(MODE_PRESETS.recovery.batchDelayMs);
    expect(RECOVERY_DEFAULTS.keepRecentResults).toBe(MODE_PRESETS.recovery.keepRecentResults);
  });

  it("has conservative retention limits", () => {
    expect(RECOVERY_DEFAULTS.keepRecentResults).toBeLessThanOrEqual(1_000);
    expect(RECOVERY_DEFAULTS.activityLogRetentionRows).toBeLessThanOrEqual(250);
  });

  it("has pause_on_critical_storage enabled", () => {
    expect(RECOVERY_DEFAULTS.pauseOnCriticalStorage).toBe(true);
  });

  it("has auto_throttle_enabled", () => {
    expect(RECOVERY_DEFAULTS.autoThrottleEnabled).toBe(true);
  });
});
