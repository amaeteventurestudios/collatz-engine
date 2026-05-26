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

// ─── Large number formatting ────────────────────────────────────────────────

const BILLION = 1_000_000_000;
const TRILLION = 1_000_000_000_000;

/**
 * Format a potentially large integer for public display.
 *
 * Thresholds:
 *   < 1 B   → full comma-separated number  (e.g. 76,778,008)
 *   1 B–1 T → compact billions             (e.g. 24.65B)
 *   ≥ 1 T   → scientific notation          (e.g. 1.24 × 10^12)
 */
export function formatLargeNumber(n: number | bigint): string {
  const v = typeof n === "bigint" ? Number(n) : n;
  if (!isFinite(v) || isNaN(v)) return "—";
  if (v < BILLION) return v.toLocaleString("en-US");
  if (v < TRILLION) return `${(v / BILLION).toFixed(2)}B`;
  const exp = Math.floor(Math.log10(v));
  const mantissa = v / Math.pow(10, exp);
  return `${mantissa.toFixed(2)} × 10ⁿ`.replace(
    "ⁿ",
    String(exp)
      .split("")
      .map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(c)] ?? c)
      .join(""),
  );
}

/**
 * Full comma-separated value for use as a title/tooltip attribute.
 * Returns empty string for non-finite values.
 */
export function formatLargeNumberTitle(n: number | bigint): string {
  const v = typeof n === "bigint" ? Number(n) : n;
  if (!isFinite(v) || isNaN(v)) return "";
  return v.toLocaleString("en-US");
}
