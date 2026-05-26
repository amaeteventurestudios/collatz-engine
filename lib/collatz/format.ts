export function formatBigInt(n: bigint): string {
  return Number(n).toLocaleString("en-US");
}

export function formatSteps(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatRatio(r: number, decimals = 2): string {
  return r.toFixed(decimals);
}

export function formatDensity(d: number): string {
  return `${(d * 100).toFixed(1)}%`;
}

export function formatSequenceSummary(steps: number, peak: bigint): string {
  return `${formatSteps(steps)} steps · peak ${formatBigInt(peak)}`;
}
