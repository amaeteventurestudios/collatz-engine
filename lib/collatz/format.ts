const BILLION_BIG = 1_000_000_000n;
const TRILLION_BIG = 1_000_000_000_000n;
const BILLION = 1_000_000_000;
const TRILLION = 1_000_000_000_000;

const MILESTONE_LABELS = new Map<number, string>([
  [1_000_000, "1M"],
  [10_000_000, "10M"],
  [100_000_000, "100M"],
  [1_000_000_000, "1B"],
  [10_000_000_000, "10B"],
  [100_000_000_000, "100B"],
  [1_000_000_000_000, "1T"],
  [10_000_000_000_000, "10T"],
  [100_000_000_000_000, "100T"],
  [1_000_000_000_000_000, "1 Quadrillion"],
  [10_000_000_000_000_000, "10 Quadrillion"],
  [100_000_000_000_000_000, "100 Quadrillion"],
  [1_000_000_000_000_000_000, "1 Quintillion"],
]);

const MILESTONE_FULL_LABELS = new Map<number, string>([
  [1_000_000, "1,000,000"],
  [10_000_000, "10,000,000"],
  [100_000_000, "100,000,000"],
  [1_000_000_000, "1,000,000,000"],
  [10_000_000_000, "10,000,000,000"],
  [100_000_000_000, "100,000,000,000"],
  [1_000_000_000_000, "1,000,000,000,000"],
  [10_000_000_000_000, "10,000,000,000,000"],
  [100_000_000_000_000, "100,000,000,000,000"],
  [1_000_000_000_000_000, "1,000,000,000,000,000"],
  [10_000_000_000_000_000, "10,000,000,000,000,000"],
  [100_000_000_000_000_000, "100,000,000,000,000,000"],
  [1_000_000_000_000_000_000, "1,000,000,000,000,000,000"],
]);

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
 *   ≥ 1 T   → compact trillions            (e.g. 60.34T)
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
    const whole = abs / TRILLION_BIG;
    const hundredths = ((abs % TRILLION_BIG) * 100n) / TRILLION_BIG;
    return `${sign}${whole}.${hundredths.toString().padStart(2, "0")}T`;
  }

  if (!Number.isFinite(n) || Number.isNaN(n)) return "Pending";
  const v = Math.trunc(n);
  const abs = Math.abs(v);
  if (abs < BILLION) return v.toLocaleString("en-US");
  if (abs < TRILLION) return `${(v / BILLION).toFixed(2)}B`;
  return `${(v / TRILLION).toFixed(2)}T`;
}

/**
 * Full comma-separated value for use as a title/tooltip attribute.
 * Returns empty string for non-finite values.
 */
export function formatLargeNumberTitle(n: number | bigint): string {
  return exactIntegerString(n);
}

export function formatMilestone(n: number): string {
  return MILESTONE_LABELS.get(n) ?? n.toLocaleString("en-US");
}

export function formatMilestoneFull(n: number): string {
  return MILESTONE_FULL_LABELS.get(n) ?? n.toLocaleString("en-US");
}

export function formatMilestonePower(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  const exponent = Math.round(Math.log10(n));
  if (10 ** exponent !== n) return "";
  return `10^${exponent}`;
}

export function formatDurationApprox(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "Pending";
  if (seconds < 60) return "< 1 minute";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.ceil(minutes)} minutes`;
  const hours = minutes / 60;
  if (hours < 48) return `${Math.ceil(hours)} hours`;
  const days = hours / 24;
  if (days < 90) return `${Math.ceil(days)} days`;
  const months = days / 30.4375;
  if (months < 24) return `${Math.ceil(months)} months`;
  const years = days / 365.25;
  if (years < 1_000) return `${years.toFixed(years < 10 ? 1 : 0)} years`;
  return `${(years / 1_000).toFixed(1)}K years`;
}
