/**
 * Worker lock unit tests.
 * Tests pure helper functions only — no Supabase connection required.
 * Live DB integration is covered by scripts/verify-worker-lock.ts.
 */

import { describe, it, expect } from "vitest";
import {
  generateWorkerInstanceId,
  isLockExpired,
  isOwnedByWorker,
  secondsUntilExpiry,
  LOCK_TTL_SECONDS,
  HEARTBEAT_INTERVAL_MS,
} from "./worker-lock";

// ── generateWorkerInstanceId ─────────────────────────────────────────────────

describe("generateWorkerInstanceId", () => {
  it("returns a non-empty string", () => {
    const id = generateWorkerInstanceId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("matches format: <host>-<pid>-<timestamp>-<4hex>", () => {
    const id = generateWorkerInstanceId();
    // last segment: 4 hex chars
    const parts = id.split("-");
    const suffix = parts[parts.length - 1];
    expect(suffix).toMatch(/^[0-9a-f]{4}$/);
  });

  it("includes the current process pid", () => {
    const id = generateWorkerInstanceId();
    expect(id).toContain(String(process.pid));
  });

  it("produces unique IDs on repeated calls (different random suffix)", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateWorkerInstanceId()));
    // With 4 hex chars (65536 possibilities) and 20 draws, virtually all distinct
    expect(ids.size).toBeGreaterThan(1);
  });

  it("maximum length is bounded (no excessively long IDs)", () => {
    const id = generateWorkerInstanceId();
    expect(id.length).toBeLessThan(200);
  });
});

// ── isLockExpired ─────────────────────────────────────────────────────────────

describe("isLockExpired", () => {
  it("returns true for past expires_at", () => {
    const row = { expires_at: new Date(Date.now() - 10_000).toISOString() };
    expect(isLockExpired(row)).toBe(true);
  });

  it("returns false for future expires_at", () => {
    const row = { expires_at: new Date(Date.now() + 30_000).toISOString() };
    expect(isLockExpired(row)).toBe(false);
  });

  it("returns true for expires_at exactly now (≤ boundary)", () => {
    const row = { expires_at: new Date(Date.now() - 1).toISOString() };
    expect(isLockExpired(row)).toBe(true);
  });

  it("returns false for expires_at 1ms in the future", () => {
    const row = { expires_at: new Date(Date.now() + 100).toISOString() };
    expect(isLockExpired(row)).toBe(false);
  });
});

// ── isOwnedByWorker ───────────────────────────────────────────────────────────

describe("isOwnedByWorker", () => {
  const instanceId = "macbook-12345-1748000000000-a3b4";

  it("returns true when instance IDs match exactly", () => {
    const row = { worker_instance_id: instanceId };
    expect(isOwnedByWorker(row, instanceId)).toBe(true);
  });

  it("returns false when instance IDs differ", () => {
    const row = { worker_instance_id: "hetzner-99999-1748000000000-ff00" };
    expect(isOwnedByWorker(row, instanceId)).toBe(false);
  });

  it("is case-sensitive", () => {
    const row = { worker_instance_id: instanceId.toUpperCase() };
    expect(isOwnedByWorker(row, instanceId)).toBe(false);
  });

  it("returns false for empty string mismatch", () => {
    const row = { worker_instance_id: "" };
    expect(isOwnedByWorker(row, instanceId)).toBe(false);
  });
});

// ── secondsUntilExpiry ────────────────────────────────────────────────────────

describe("secondsUntilExpiry", () => {
  it("returns positive value for future expiry", () => {
    const row = { expires_at: new Date(Date.now() + 30_000).toISOString() };
    const secs = secondsUntilExpiry(row);
    expect(secs).toBeGreaterThan(0);
    expect(secs).toBeLessThanOrEqual(30);
  });

  it("returns negative value for past expiry", () => {
    const row = { expires_at: new Date(Date.now() - 10_000).toISOString() };
    const secs = secondsUntilExpiry(row);
    expect(secs).toBeLessThan(0);
  });

  it("rounds down to whole seconds", () => {
    const row = { expires_at: new Date(Date.now() + 29_999).toISOString() };
    const secs = secondsUntilExpiry(row);
    expect(Number.isInteger(secs)).toBe(true);
  });

  it("returns approximately LOCK_TTL_SECONDS for freshly-acquired lock", () => {
    const row = { expires_at: new Date(Date.now() + LOCK_TTL_SECONDS * 1000).toISOString() };
    const secs = secondsUntilExpiry(row);
    expect(secs).toBeGreaterThanOrEqual(LOCK_TTL_SECONDS - 1);
    expect(secs).toBeLessThanOrEqual(LOCK_TTL_SECONDS);
  });
});

// ── Constants ─────────────────────────────────────────────────────────────────

describe("lock constants", () => {
  it("LOCK_TTL_SECONDS is 30", () => {
    expect(LOCK_TTL_SECONDS).toBe(30);
  });

  it("HEARTBEAT_INTERVAL_MS is 10_000 (1/3 of TTL)", () => {
    expect(HEARTBEAT_INTERVAL_MS).toBe(10_000);
    expect(HEARTBEAT_INTERVAL_MS).toBeLessThan(LOCK_TTL_SECONDS * 1000 / 2);
  });

  it("heartbeat fires at least twice within one TTL period", () => {
    const heartbeatsPerTtl = (LOCK_TTL_SECONDS * 1000) / HEARTBEAT_INTERVAL_MS;
    expect(heartbeatsPerTtl).toBeGreaterThanOrEqual(2);
  });
});

// ── Lock ownership guard logic (mirrors worker pre-batch check) ───────────────

describe("worker pre-batch lock ownership guard", () => {
  const myInstanceId = "macbook-12345-1748000000000-a3b4";
  const otherInstanceId = "hetzner-99999-1748000001000-ff00";

  it("allows batch when lock is active and owned by this worker", () => {
    const lock = {
      worker_instance_id: myInstanceId,
      expires_at: new Date(Date.now() + 20_000).toISOString(),
      status: "active" as const,
    };
    const canProceed =
      !isLockExpired(lock) &&
      lock.status === "active" &&
      isOwnedByWorker(lock, myInstanceId);
    expect(canProceed).toBe(true);
  });

  it("blocks batch when lock is owned by a different worker", () => {
    const lock = {
      worker_instance_id: otherInstanceId,
      expires_at: new Date(Date.now() + 20_000).toISOString(),
      status: "active" as const,
    };
    const canProceed =
      !isLockExpired(lock) &&
      lock.status === "active" &&
      isOwnedByWorker(lock, myInstanceId);
    expect(canProceed).toBe(false);
  });

  it("blocks batch when lock has expired", () => {
    const lock = {
      worker_instance_id: myInstanceId,
      expires_at: new Date(Date.now() - 5_000).toISOString(),
      status: "active" as const,
    };
    const canProceed =
      !isLockExpired(lock) &&
      lock.status === "active" &&
      isOwnedByWorker(lock, myInstanceId);
    expect(canProceed).toBe(false);
  });

  it("blocks batch when lock is released", () => {
    const lock = {
      worker_instance_id: myInstanceId,
      expires_at: new Date(Date.now() + 20_000).toISOString(),
      status: "released" as const,
    };
    const canProceed =
      !isLockExpired(lock) &&
      lock.status === "active" &&
      isOwnedByWorker(lock, myInstanceId);
    expect(canProceed).toBe(false);
  });

  it("blocks batch when lock is force_released", () => {
    const lock = {
      worker_instance_id: myInstanceId,
      expires_at: new Date(Date.now() + 20_000).toISOString(),
      status: "force_released" as const,
    };
    const canProceed =
      !isLockExpired(lock) &&
      lock.status === "active" &&
      isOwnedByWorker(lock, myInstanceId);
    expect(canProceed).toBe(false);
  });
});
