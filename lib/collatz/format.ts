const BILLION_BIG = 1_000_000_000n;
const TRILLION_BIG = 1_000_000_000_000n;
const BILLION = 1_000_000_000;
const TRILLION = 1_000_000_000_000;

function commaString(raw: string): string {
  const sign = raw.startsWith("-") ? "-" : "";
  const digits = sign ? raw.slice(1) : raw;
  return `${sign}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function exactIntegerString(n: number | bigint): string {
  if (typeof n === "bigint") return commaString(n.toString());
  if (!Number.isFinite(n) || Number.isNaN(n)) return "";
  return Math.trunc(n).toLocaleString("en-US");
}

export function formatBigInt(n: bigint): string {
  return exactIntegerString(n);
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

/**
 * Format a potentially large integer for public display.
 *
 * Thresholds:
 *   < 1 B   → full comma-separated number  (e.g. 76,778,008)
 *   1 B–1 T → compact billions             (e.g. 24.65B)
 *   ≥ 1 T   → scientific notation          (e.g. 1.24 × 10^12)
 */
export function formatLargeNumber(n: number | bigint): string {
  if (typeof n === "bigint") {
    const abs = n < 0n ? -n : n;
    const sign = n < 0n ? "-" : "";
    if (abs < BILLION_BIG) return commaString(n.toString());
    if (abs < TRILLION_BIG) {
      const whole = abs / BILLION_BIG;
      const hundredths = ((abs % BILLION_BIG) * 100n) / BILLION_BIG;
      return `${sign}${whole}.${hundredths.toString().padStart(2, "0")}B`;
    }
    const digits = abs.toString();
    const exp = digits.length - 1;
    const decimal = digits.slice(1, 3).padEnd(2, "0");
    return `${sign}${digits[0]}.${decimal} × 10^${exp}`;
  }

  if (!Number.isFinite(n) || Number.isNaN(n)) return "—";
  const v = Math.trunc(n);
  const abs = Math.abs(v);
  if (abs < BILLION) return v.toLocaleString("en-US");
  if (abs < TRILLION) return `${(v / BILLION).toFixed(2)}B`;
  const exp = Math.floor(Math.log10(abs));
  const mantissa = v / Math.pow(10, exp);
  return `${mantissa.toFixed(2)} × 10^${exp}`;
}

/**
 * Full comma-separated value for use as a title/tooltip attribute.
 * Returns empty string for non-finite values.
 */
export function formatLargeNumberTitle(n: number | bigint): string {
  return exactIntegerString(n);
}
