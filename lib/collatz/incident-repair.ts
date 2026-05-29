/**
 * Pure logic for detecting and verifying repairs to duplicate-worker incidents.
 *
 * A "transition" is the (prevEnd, batchStart) pair between two consecutive
 * batch_completed log entries (sorted by batch_start ascending). A clean
 * transition satisfies batchStart === prevEnd + 1.
 *
 * An "overlap" is batchStart <= prevEnd (two workers logged the same range).
 * A "gap"     is batchStart >  prevEnd + 1 (a range was never logged).
 *
 * Repairs are stored in collatz_activity_logs with event_type =
 * "duplicate_worker_incident_repair". Each repair entry records the exact
 * (prev_end, batch_start) transitions that were anomalous and what action
 * was taken for each. The sequential verifier uses this to distinguish
 * documented-repaired anomalies from new unrepaired gaps.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type TransitionKind = "ok" | "overlap" | "gap";

export interface BatchLogEntry {
  batch_start: number;
  batch_end: number;
}

/** One anomalous transition documented inside a repair log's metadata. */
export interface RepairedTransition {
  /** batch_end of the preceding log entry */
  prev_end: number;
  /** batch_start of the anomalous log entry */
  batch_start: number;
  type: "overlap" | "gap";
  /** Only for gap type: the first missing number */
  gap_start?: number;
  /** Only for gap type: the last missing number */
  gap_end?: number;
  /** What the repair script did: "documented", "backfilled", etc. */
  action: string;
}

/** Full metadata shape stored inside a repair activity log entry. */
export interface IncidentRepairMetadata {
  script: string;
  repaired_at: string;
  incident_summary: string;
  repaired_transitions: RepairedTransition[];
}

/** One detected anomaly in the batch sequence. */
export interface SequenceAnomaly {
  prevEnd: number;
  batchStart: number;
  type: "overlap" | "gap";
  /** Negative for overlaps, positive for gaps */
  delta: number;
}

/** Result of analyzing a full batch sequence against a set of repairs. */
export interface SequenceAnalysis {
  totalBatches: number;
  unrepairedAnomalies: SequenceAnomaly[];
  repairedAnomalies: SequenceAnomaly[];
  allClean: boolean;
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * Classifies the transition from prevEnd to batchStart.
 */
export function classifyTransition(
  prevEnd: number,
  batchStart: number,
): TransitionKind {
  if (batchStart === prevEnd + 1) return "ok";
  if (batchStart <= prevEnd) return "overlap";
  return "gap";
}

/**
 * Returns true if the (prevEnd → batchStart) transition is documented in
 * any of the supplied repaired transitions.
 */
export function isTransitionRepaired(
  prevEnd: number,
  batchStart: number,
  repairs: RepairedTransition[],
): boolean {
  return repairs.some(
    (r) => r.prev_end === prevEnd && r.batch_start === batchStart,
  );
}

/**
 * Analyzes a sorted sequence of batch log entries and classifies each
 * transition as ok, repaired, or unrepaired anomaly.
 *
 * @param batches Sorted ascending by batch_start. Duplicates allowed.
 * @param repairs Repaired transitions extracted from repair log entries.
 */
export function analyzeSequence(
  batches: BatchLogEntry[],
  repairs: RepairedTransition[],
): SequenceAnalysis {
  const unrepairedAnomalies: SequenceAnomaly[] = [];
  const repairedAnomalies: SequenceAnomaly[] = [];
  let prevEnd: number | null = null;

  for (const batch of batches) {
    if (prevEnd !== null) {
      const kind = classifyTransition(prevEnd, batch.batch_start);
      if (kind !== "ok") {
        const anomaly: SequenceAnomaly = {
          prevEnd,
          batchStart: batch.batch_start,
          type: kind,
          delta: batch.batch_start - (prevEnd + 1),
        };
        if (isTransitionRepaired(prevEnd, batch.batch_start, repairs)) {
          repairedAnomalies.push(anomaly);
        } else {
          unrepairedAnomalies.push(anomaly);
        }
      }
    }
    prevEnd = batch.batch_end;
  }

  return {
    totalBatches: batches.length,
    unrepairedAnomalies,
    repairedAnomalies,
    allClean: unrepairedAnomalies.length === 0,
  };
}

/**
 * Extracts RepairedTransition[] from the raw metadata stored in an
 * activity log entry. Returns [] if the field is absent or malformed.
 */
export function extractRepairs(metadata: Record<string, unknown>): RepairedTransition[] {
  const raw = metadata.repaired_transitions;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is RepairedTransition =>
      typeof r === "object" &&
      r !== null &&
      typeof (r as RepairedTransition).prev_end === "number" &&
      typeof (r as RepairedTransition).batch_start === "number" &&
      ((r as RepairedTransition).type === "overlap" ||
        (r as RepairedTransition).type === "gap"),
  );
}

/**
 * Infers the dominant batch size from a list of logged batches.
 *
 * Uses the statistical mode of (batch_end - batch_start + 1). Requires the
 * mode to account for ≥ 50 % of entries to be considered reliable; returns
 * null when the batch list is empty or the sizes are too mixed.
 *
 * The inferred size is used by the verifier to distinguish sampled-log gaps
 * (forward gaps that are exact multiples of the batch size) from gaps that
 * could indicate a real computation hole.
 */
export function inferBatchSize(batches: BatchLogEntry[]): number | null {
  if (batches.length === 0) return null;

  const counts = new Map<number, number>();
  for (const b of batches) {
    const size = b.batch_end - b.batch_start + 1;
    if (size > 0) counts.set(size, (counts.get(size) ?? 0) + 1);
  }

  let modeSize = 0;
  let modeCount = 0;
  for (const [size, count] of counts) {
    if (count > modeCount) {
      modeSize = size;
      modeCount = count;
    }
  }

  // Require the mode to cover at least half the entries
  if (modeCount < Math.ceil(batches.length / 2)) return null;
  return modeSize > 0 ? modeSize : null;
}

/**
 * Returns true when gapSize is a positive, exact multiple of batchSize.
 *
 * A forward gap of N × batchSize between two logged batches is fully
 * explained by activity-log throttling: the worker processed those batches
 * but did not log them because shouldLogActivity was false for those
 * iterations. This is normal behaviour in recovery/safe mode with a
 * log_interval_ms > batch_delay_ms.
 *
 * A non-multiple gap cannot be explained by uniform sampling and is
 * therefore suspicious (possible real computation hole, worker reset, etc.).
 *
 * Note: the caller should pass the CURRENT runtime-config batch size as
 * batchSize when available, rather than relying solely on the size inferred
 * from recent log entries. Historical logs may reflect a different (larger)
 * batch size from a prior worker run, causing the inferred size to diverge
 * from the active batch size and producing false non-multiple classifications.
 */
export function isSampledGap(gapSize: number, batchSize: number | null): boolean {
  if (gapSize <= 0) return false;
  if (batchSize === null || batchSize <= 0) return false;
  return gapSize % batchSize === 0;
}

/**
 * Returns true when gapSize is a positive multiple of ANY size in the set.
 *
 * Use this when multiple batch sizes may be relevant (e.g., the runtime
 * config says one size and historical logs reflect a different one). Accepting
 * any size that cleanly divides the gap is the most permissive — and correct —
 * policy: if the gap can be explained by uniform sampling at ANY known batch
 * size, it is not a true computation gap.
 */
export function isSampledGapByAnyUnit(
  gapSize: number,
  units: Iterable<number>,
): boolean {
  if (gapSize <= 0) return false;
  for (const unit of units) {
    if (unit > 0 && gapSize % unit === 0) return true;
  }
  return false;
}

/**
 * Given a list of batch log entries sorted by batch_start, returns the
 * gap ranges (as [gapStart, gapEnd] pairs) that are not covered by any
 * batch. Only considers strict gaps (batchStart > prevEnd + 1).
 */
export function findGapRanges(
  batches: BatchLogEntry[],
): Array<{ gapStart: number; gapEnd: number; prevEnd: number; batchStart: number }> {
  const gaps: Array<{ gapStart: number; gapEnd: number; prevEnd: number; batchStart: number }> = [];
  let prevEnd: number | null = null;

  for (const batch of batches) {
    if (prevEnd !== null && batch.batch_start > prevEnd + 1) {
      gaps.push({
        gapStart: prevEnd + 1,
        gapEnd: batch.batch_start - 1,
        prevEnd,
        batchStart: batch.batch_start,
      });
    }
    prevEnd = batch.batch_end;
  }

  return gaps;
}
