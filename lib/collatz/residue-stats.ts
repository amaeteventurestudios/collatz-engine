import type { ResidueClassStats } from "./batch-types";

export const DEFAULT_RESIDUE_MODULI = [3, 4, 6, 8, 12, 24, 36];

interface ResidueAccumulator {
  count: number;
  sumSteps: number;
  maxSteps: number;
  sumPeakRatio: number;
  maxPeakRatio: number;
  sumFirstDescent: number;
  countFirstDescent: number;
}

export type ResidueAccMap = Map<number, Map<number, ResidueAccumulator>>;

export function createResidueAccumulators(moduli: number[]): ResidueAccMap {
  const accMap: ResidueAccMap = new Map();
  for (const m of moduli) {
    const residueMap = new Map<number, ResidueAccumulator>();
    for (let r = 0; r < m; r++) {
      residueMap.set(r, {
        count: 0,
        sumSteps: 0,
        maxSteps: 0,
        sumPeakRatio: 0,
        maxPeakRatio: 0,
        sumFirstDescent: 0,
        countFirstDescent: 0,
      });
    }
    accMap.set(m, residueMap);
  }
  return accMap;
}

export function accumulateResidue(
  accMap: ResidueAccMap,
  n: number,
  stepsTo1: number,
  peakRatio: number,
  firstDescentStep: number | null,
): void {
  for (const [m, residueMap] of accMap) {
    const r = n % m;
    const acc = residueMap.get(r)!;
    acc.count++;
    acc.sumSteps += stepsTo1;
    if (stepsTo1 > acc.maxSteps) acc.maxSteps = stepsTo1;
    acc.sumPeakRatio += peakRatio;
    if (peakRatio > acc.maxPeakRatio) acc.maxPeakRatio = peakRatio;
    if (firstDescentStep !== null) {
      acc.sumFirstDescent += firstDescentStep;
      acc.countFirstDescent++;
    }
  }
}

export function finalizeResidueStats(accMap: ResidueAccMap): ResidueClassStats[] {
  const result: ResidueClassStats[] = [];
  for (const [m, residueMap] of accMap) {
    for (const [r, acc] of residueMap) {
      if (acc.count === 0) continue;
      result.push({
        modulus: m,
        residue: r,
        count: acc.count,
        avg_steps: acc.sumSteps / acc.count,
        max_steps: acc.maxSteps,
        avg_peak_ratio: acc.sumPeakRatio / acc.count,
        max_peak_ratio: acc.maxPeakRatio,
        avg_first_descent_delay:
          acc.countFirstDescent > 0 ? acc.sumFirstDescent / acc.countFirstDescent : null,
      });
    }
  }
  return result.sort((a, b) => a.modulus - b.modulus || a.residue - b.residue);
}
