/**
 * Tests for the incident-repair pure logic module.
 * No Supabase connection required.
 */

import { describe, it, expect } from "vitest";
import {
  classifyTransition,
  isTransitionRepaired,
  analyzeSequence,
  extractRepairs,
  findGapRanges,
  type BatchLogEntry,
  type RepairedTransition,
} from "./incident-repair";

// ── classifyTransition ────────────────────────────────────────────────────────

describe("classifyTransition", () => {
  it("ok: batchStart === prevEnd + 1", () => {
    expect(classifyTransition(100, 101)).toBe("ok");
    expect(classifyTransition(7_646_801, 7_646_802)).toBe("ok");
  });

  it("overlap: batchStart <= prevEnd", () => {
    expect(classifyTransition(7_646_851, 7_646_802)).toBe("overlap");
    expect(classifyTransition(100, 100)).toBe("overlap");
    expect(classifyTransition(100, 50)).toBe("overlap");
  });

  it("gap: batchStart > prevEnd + 1", () => {
    expect(classifyTransition(7_647_051, 7_647_102)).toBe("gap");
    expect(classifyTransition(100, 200)).toBe("gap");
    expect(classifyTransition(100, 102)).toBe("gap");
  });
});

// ── isTransitionRepaired ──────────────────────────────────────────────────────

describe("isTransitionRepaired", () => {
  const repairs: RepairedTransition[] = [
    { prev_end: 7_646_851, batch_start: 7_646_802, type: "overlap", action: "documented" },
    { prev_end: 7_646_901, batch_start: 7_646_852, type: "overlap", action: "documented" },
    { prev_end: 7_647_051, batch_start: 7_647_102, type: "gap", gap_start: 7_647_052, gap_end: 7_647_101, action: "backfilled" },
  ];

  it("returns true for documented overlap transitions", () => {
    expect(isTransitionRepaired(7_646_851, 7_646_802, repairs)).toBe(true);
    expect(isTransitionRepaired(7_646_901, 7_646_852, repairs)).toBe(true);
  });

  it("returns true for documented gap transition", () => {
    expect(isTransitionRepaired(7_647_051, 7_647_102, repairs)).toBe(true);
  });

  it("returns false for unknown transition", () => {
    expect(isTransitionRepaired(7_647_051, 7_647_200, repairs)).toBe(false);
    expect(isTransitionRepaired(999, 1001, repairs)).toBe(false);
  });

  it("returns false for empty repairs list", () => {
    expect(isTransitionRepaired(7_646_851, 7_646_802, [])).toBe(false);
  });

  it("matches exact pair only (not partial matches)", () => {
    expect(isTransitionRepaired(7_646_851, 7_646_803, repairs)).toBe(false);
    expect(isTransitionRepaired(7_646_850, 7_646_802, repairs)).toBe(false);
  });
});

// ── analyzeSequence — clean sequence ──────────────────────────────────────────

describe("analyzeSequence — clean sequence (no anomalies)", () => {
  const batches: BatchLogEntry[] = [
    { batch_start: 1, batch_end: 50 },
    { batch_start: 51, batch_end: 100 },
    { batch_start: 101, batch_end: 150 },
  ];

  it("no anomalies → allClean = true", () => {
    const result = analyzeSequence(batches, []);
    expect(result.allClean).toBe(true);
    expect(result.unrepairedAnomalies).toHaveLength(0);
    expect(result.repairedAnomalies).toHaveLength(0);
    expect(result.totalBatches).toBe(3);
  });
});

// ── analyzeSequence — duplicate-worker incident ───────────────────────────────

describe("analyzeSequence — duplicate-worker incident (unrepaired)", () => {
  // Mirrors the actual incident: two workers logged same ranges, plus a gap
  const batches: BatchLogEntry[] = [
    { batch_start: 7_646_752, batch_end: 7_646_801 },
    { batch_start: 7_646_802, batch_end: 7_646_851 }, // Worker A
    { batch_start: 7_646_802, batch_end: 7_646_851 }, // Worker B duplicate
    { batch_start: 7_646_852, batch_end: 7_646_901 }, // Worker A
    { batch_start: 7_646_852, batch_end: 7_646_901 }, // Worker B duplicate
    { batch_start: 7_646_902, batch_end: 7_646_951 },
    { batch_start: 7_646_952, batch_end: 7_647_001 },
    { batch_start: 7_647_002, batch_end: 7_647_051 },
    { batch_start: 7_647_102, batch_end: 7_647_151 }, // gap: 7,647,052-7,647,101 missing
    { batch_start: 7_647_152, batch_end: 7_647_201 },
  ];

  it("detects 3 anomalies when no repairs exist", () => {
    const result = analyzeSequence(batches, []);
    expect(result.allClean).toBe(false);
    expect(result.unrepairedAnomalies).toHaveLength(3);
    expect(result.repairedAnomalies).toHaveLength(0);
  });

  it("anomaly types are correct", () => {
    const result = analyzeSequence(batches, []);
    const overlaps = result.unrepairedAnomalies.filter((a) => a.type === "overlap");
    const gaps = result.unrepairedAnomalies.filter((a) => a.type === "gap");
    expect(overlaps).toHaveLength(2);
    expect(gaps).toHaveLength(1);
  });

  it("overlap anomaly 1: prevEnd=7,646,851 → batchStart=7,646,802", () => {
    const result = analyzeSequence(batches, []);
    const a = result.unrepairedAnomalies.find(
      (x) => x.prevEnd === 7_646_851 && x.batchStart === 7_646_802,
    );
    expect(a).toBeDefined();
    expect(a?.type).toBe("overlap");
    expect(a?.delta).toBe(-50); // 7,646,802 - (7,646,851 + 1) = -50
  });

  it("overlap anomaly 2: prevEnd=7,646,901 → batchStart=7,646,852", () => {
    const result = analyzeSequence(batches, []);
    const a = result.unrepairedAnomalies.find(
      (x) => x.prevEnd === 7_646_901 && x.batchStart === 7_646_852,
    );
    expect(a).toBeDefined();
    expect(a?.type).toBe("overlap");
  });

  it("gap anomaly: prevEnd=7,647,051 → batchStart=7,647,102 (gap of 50)", () => {
    const result = analyzeSequence(batches, []);
    const a = result.unrepairedAnomalies.find(
      (x) => x.prevEnd === 7_647_051 && x.batchStart === 7_647_102,
    );
    expect(a).toBeDefined();
    expect(a?.type).toBe("gap");
    expect(a?.delta).toBe(50); // 7,647,102 - (7,647,051 + 1) = 50
  });
});

describe("analyzeSequence — duplicate-worker incident (fully repaired)", () => {
  const batches: BatchLogEntry[] = [
    { batch_start: 7_646_752, batch_end: 7_646_801 },
    { batch_start: 7_646_802, batch_end: 7_646_851 },
    { batch_start: 7_646_802, batch_end: 7_646_851 }, // duplicate
    { batch_start: 7_646_852, batch_end: 7_646_901 },
    { batch_start: 7_646_852, batch_end: 7_646_901 }, // duplicate
    { batch_start: 7_646_902, batch_end: 7_646_951 },
    { batch_start: 7_646_952, batch_end: 7_647_001 },
    { batch_start: 7_647_002, batch_end: 7_647_051 },
    { batch_start: 7_647_102, batch_end: 7_647_151 }, // gap — repaired
    { batch_start: 7_647_152, batch_end: 7_647_201 },
  ];

  const repairs: RepairedTransition[] = [
    { prev_end: 7_646_851, batch_start: 7_646_802, type: "overlap", action: "documented" },
    { prev_end: 7_646_901, batch_start: 7_646_852, type: "overlap", action: "documented" },
    { prev_end: 7_647_051, batch_start: 7_647_102, type: "gap", gap_start: 7_647_052, gap_end: 7_647_101, action: "backfilled" },
  ];

  it("allClean = true when all anomalies are repaired", () => {
    const result = analyzeSequence(batches, repairs);
    expect(result.allClean).toBe(true);
    expect(result.unrepairedAnomalies).toHaveLength(0);
    expect(result.repairedAnomalies).toHaveLength(3);
  });

  it("repaired anomalies include correct types", () => {
    const result = analyzeSequence(batches, repairs);
    const overlaps = result.repairedAnomalies.filter((a) => a.type === "overlap");
    const gaps = result.repairedAnomalies.filter((a) => a.type === "gap");
    expect(overlaps).toHaveLength(2);
    expect(gaps).toHaveLength(1);
  });
});

describe("analyzeSequence — partial repair (one anomaly still unrepaired)", () => {
  const batches: BatchLogEntry[] = [
    { batch_start: 1, batch_end: 50 },
    { batch_start: 1, batch_end: 50 },  // overlap — repaired
    { batch_start: 51, batch_end: 100 },
    { batch_start: 201, batch_end: 250 }, // gap 101-200 — NOT repaired
  ];

  const repairs: RepairedTransition[] = [
    { prev_end: 50, batch_start: 1, type: "overlap", action: "documented" },
    // gap is NOT in repairs
  ];

  it("allClean = false when any anomaly is unrepaired", () => {
    const result = analyzeSequence(batches, repairs);
    expect(result.allClean).toBe(false);
    expect(result.unrepairedAnomalies).toHaveLength(1);
    expect(result.repairedAnomalies).toHaveLength(1);
  });

  it("correctly identifies which anomaly is unrepaired", () => {
    const result = analyzeSequence(batches, repairs);
    expect(result.unrepairedAnomalies[0].type).toBe("gap");
    expect(result.unrepairedAnomalies[0].prevEnd).toBe(100);
    expect(result.unrepairedAnomalies[0].batchStart).toBe(201);
  });
});

// ── extractRepairs ────────────────────────────────────────────────────────────

describe("extractRepairs", () => {
  it("extracts valid RepairedTransition array from metadata", () => {
    const metadata = {
      repaired_transitions: [
        { prev_end: 100, batch_start: 50, type: "overlap", action: "documented" },
        { prev_end: 200, batch_start: 252, type: "gap", gap_start: 201, gap_end: 251, action: "backfilled" },
      ],
    };
    const repairs = extractRepairs(metadata);
    expect(repairs).toHaveLength(2);
    expect(repairs[0].type).toBe("overlap");
    expect(repairs[1].type).toBe("gap");
  });

  it("returns [] when repaired_transitions is absent", () => {
    expect(extractRepairs({})).toEqual([]);
    expect(extractRepairs({ other: "field" })).toEqual([]);
  });

  it("returns [] when repaired_transitions is not an array", () => {
    expect(extractRepairs({ repaired_transitions: "string" })).toEqual([]);
    expect(extractRepairs({ repaired_transitions: null })).toEqual([]);
  });

  it("filters out malformed entries", () => {
    const metadata = {
      repaired_transitions: [
        { prev_end: 100, batch_start: 50, type: "overlap", action: "documented" }, // valid
        { prev_end: "not-a-number", batch_start: 50, type: "overlap", action: "documented" }, // invalid
        { prev_end: 200, type: "gap", action: "backfilled" }, // missing batch_start
        null,
        42,
      ],
    };
    const repairs = extractRepairs(metadata as Record<string, unknown>);
    expect(repairs).toHaveLength(1);
  });
});

// ── findGapRanges ─────────────────────────────────────────────────────────────

describe("findGapRanges", () => {
  it("returns empty for clean sequence", () => {
    const batches: BatchLogEntry[] = [
      { batch_start: 1, batch_end: 50 },
      { batch_start: 51, batch_end: 100 },
    ];
    expect(findGapRanges(batches)).toHaveLength(0);
  });

  it("finds the missing range from the duplicate-worker incident", () => {
    const batches: BatchLogEntry[] = [
      { batch_start: 7_647_002, batch_end: 7_647_051 },
      { batch_start: 7_647_102, batch_end: 7_647_151 },
    ];
    const gaps = findGapRanges(batches);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].gapStart).toBe(7_647_052);
    expect(gaps[0].gapEnd).toBe(7_647_101);
    expect(gaps[0].prevEnd).toBe(7_647_051);
    expect(gaps[0].batchStart).toBe(7_647_102);
  });

  it("ignores overlaps (batchStart <= prevEnd) — those are not gaps", () => {
    const batches: BatchLogEntry[] = [
      { batch_start: 1, batch_end: 50 },
      { batch_start: 1, batch_end: 50 }, // overlap, not a gap
    ];
    expect(findGapRanges(batches)).toHaveLength(0);
  });

  it("finds multiple gaps in one sequence", () => {
    const batches: BatchLogEntry[] = [
      { batch_start: 1, batch_end: 50 },
      { batch_start: 101, batch_end: 150 }, // gap 51-100
      { batch_start: 251, batch_end: 300 }, // gap 151-250
    ];
    const gaps = findGapRanges(batches);
    expect(gaps).toHaveLength(2);
    expect(gaps[0]).toMatchObject({ gapStart: 51, gapEnd: 100 });
    expect(gaps[1]).toMatchObject({ gapStart: 151, gapEnd: 250 });
  });

  it("single batch has no gaps", () => {
    const batches: BatchLogEntry[] = [{ batch_start: 100, batch_end: 150 }];
    expect(findGapRanges(batches)).toHaveLength(0);
  });
});
