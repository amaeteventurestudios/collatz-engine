import { computeCollatz } from "./engine";
import type { CollatzResult } from "./types";

export const SEED_EXAMPLES = [1, 2, 3, 6, 7, 27, 97, 871, 6171, 77031, 837799] as const;

export type SeedExample = (typeof SEED_EXAMPLES)[number];

const _cache = new Map<number, CollatzResult>();

export function getSeedResult(n: SeedExample): CollatzResult {
  if (!_cache.has(n)) {
    _cache.set(n, computeCollatz(n));
  }
  return _cache.get(n)!;
}

export function getAllSeedResults(): CollatzResult[] {
  return SEED_EXAMPLES.map((n) => getSeedResult(n));
}

export function getSeedDemoRecords(): {
  longestPath: CollatzResult;
  highestPeak: CollatzResult;
  highestPeakRatio: CollatzResult;
  highestOddDensity: CollatzResult;
} {
  const results = getAllSeedResults().filter((r) => r.reached_one && r.start_number > 0n);

  const longestPath = results.reduce((best, r) =>
    r.steps_to_1 > best.steps_to_1 ? r : best,
  );
  const highestPeak = results.reduce((best, r) =>
    r.peak_value > best.peak_value ? r : best,
  );
  const highestPeakRatio = results.reduce((best, r) =>
    r.peak_ratio > best.peak_ratio ? r : best,
  );
  const highestOddDensity = results.reduce((best, r) =>
    r.odd_step_density > best.odd_step_density ? r : best,
  );

  return { longestPath, highestPeak, highestPeakRatio, highestOddDensity };
}
