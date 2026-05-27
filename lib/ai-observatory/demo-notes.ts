export const TAB_IDS = ["latest", "batch", "pattern", "theoretical", "digest"] as const;
export type TabId = (typeof TAB_IDS)[number];

export const TAB_LABELS: Record<TabId, string> = {
  latest: "Latest Note",
  batch: "Batch Analysis",
  pattern: "Pattern Report",
  theoretical: "Theoretical Lens",
  digest: "Weekly Digest",
};

export const TAB_TOOLTIPS: Record<TabId, string> = {
  latest: "The most recent approved public AI summary.",
  batch: "A summary of one verified computation range.",
  pattern: "A plain-language explanation of observed behavior in stored data.",
  theoretical: "An interpretive mathematical view, not a proof.",
  digest: "A shareable weekly summary of verified engine activity.",
};

export type ReportType = "Weekly Digest" | "Batch Analysis" | "Pattern Report" | "Theoretical Lens";

export interface ReportTypeMeta {
  label: string;
  badgeClass: string;
}

export const REPORT_TYPE_META: Record<ReportType, ReportTypeMeta> = {
  "Weekly Digest": {
    label: "WEEKLY DIGEST",
    badgeClass: "bg-teal-500/15 text-teal-400 ring-1 ring-teal-400/25",
  },
  "Batch Analysis": {
    label: "BATCH ANALYSIS",
    badgeClass: "bg-blue-500/15 text-blue-400 ring-1 ring-blue-400/25",
  },
  "Pattern Report": {
    label: "PATTERN REPORT",
    badgeClass: "bg-violet-500/15 text-violet-400 ring-1 ring-violet-400/25",
  },
  "Theoretical Lens": {
    label: "THEORETICAL LENS",
    badgeClass: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-400/25",
  },
};

export interface NoteStat {
  value: string;
  label: string;
  sublabel: string;
  iconVariant: "check" | "trend" | "peak" | "record" | "count" | "merge" | "lens" | "drift";
  highlight?: boolean;
}

export interface DemoNote {
  id: string;
  reportType: ReportType;
  tabCategory: TabId;
  title: string;
  summary: string;
  body: string[];
  publishedAt: string;
  reviewedBy: string;
  stats: NoteStat[];
  isPublic: true;
}

export const DEMO_NOTES: DemoNote[] = [
  {
    id: "weekly-digest-may-19-26",
    reportType: "Weekly Digest",
    tabCategory: "digest",
    title: "Weekly Digest: May 19–May 26, 2026",
    summary:
      "This week, the engine verified 1,240,000 additional starting numbers. All tested trajectories reached 1. The longest trajectory remains 596 steps. No new highest peak record was set.",
    body: [
      "Between May 19 and May 26, the Collatz Engine processed 1,240,000 consecutive integers, extending the verified catalog to n = 3,866,700.",
      "All trajectories in this range confirmed the expected behavior: every starting integer eventually reaches 1 under repeated application of the Collatz function.",
      "The longest trajectory record of 596 steps (set at n = 3,732,423) was not broken this week. The highest peak value remains 622,717,901,620.",
      "Two new trajectory-length records were logged within subranges, though neither surpassed the global record. The catalog integrity check passed with 11/11 checks.",
    ],
    publishedAt: "May 26, 2026",
    reviewedBy: "Admin",
    stats: [
      { value: "1.24M", label: "Numbers Checked", sublabel: "Total verified", iconVariant: "check" },
      { value: "596", label: "Longest Trajectory", sublabel: "Steps", iconVariant: "trend" },
      { value: "622.7B", label: "Highest Peak", sublabel: "Value", iconVariant: "peak" },
      { value: "2", label: "New Records", sublabel: "This week", iconVariant: "record", highlight: true },
    ],
    isPublic: true,
  },
  {
    id: "batch-3800001-3830400",
    reportType: "Batch Analysis",
    tabCategory: "batch",
    title: "Batch Analysis: 3,800,001 – 3,830,400",
    summary:
      "30,400 trajectories processed in this batch. All trajectories reached 1. No new longest or highest peak record.",
    body: [
      "This batch covers integers 3,800,001 through 3,830,400, representing 30,400 consecutive starting values processed in a single verified computation run.",
      "Every trajectory in this range converged to 1. The batch was completed in 78ms with a throughput of approximately 389 numbers per second.",
      "No new global records were set: the longest trajectory in this range peaked at 412 steps, below the current record of 596 steps.",
      "The highest peak value encountered was 2,891,430,016, well below the catalog’s global peak of 622,717,901,620.",
      "Batch integrity was confirmed via read-back verification before the engine state counter was advanced.",
    ],
    publishedAt: "May 25, 2026",
    reviewedBy: "Admin",
    stats: [
      { value: "30,400", label: "Processed", sublabel: "Trajectories", iconVariant: "count" },
      { value: "0", label: "New Longest", sublabel: "No record broken", iconVariant: "trend" },
      { value: "0", label: "New Peak", sublabel: "No record broken", iconVariant: "peak" },
      { value: "1", label: "Verified Range", sublabel: "Integrity passed", iconVariant: "check" },
    ],
    isPublic: true,
  },
  {
    id: "descent-merging-behavior",
    reportType: "Pattern Report",
    tabCategory: "pattern",
    title: "Descent & Merging Behavior",
    summary:
      "Analysis of merging behavior across the current catalog. Most trajectories eventually merge into previously observed paths.",
    body: [
      "Across the 3.83 million verified starting integers, a clear merging pattern is observed: trajectories from distinct starting values frequently converge to the same value before reaching 1.",
      "Approximately 72.4% of starting integers in the current catalog merge into a trajectory first observed at a lower starting value within 50 steps.",
      "This merging behavior is a well-known property of the Collatz function and is consistent with the current catalog. It does not constitute evidence for or against the conjecture.",
      "The most frequently visited intermediate values include 2, 4, 16, and sequences in the descent path of powers of two.",
    ],
    publishedAt: "May 24, 2026",
    reviewedBy: "Admin",
    stats: [
      { value: "3.83M", label: "Catalog Size", sublabel: "Verified integers", iconVariant: "count" },
      { value: "72.4%", label: "Merged", sublabel: "Within 50 steps", iconVariant: "merge" },
      { value: "596", label: "Longest", sublabel: "Steps (global)", iconVariant: "trend" },
      { value: "0", label: "Proof Claims", sublabel: "None made", iconVariant: "lens" },
    ],
    isPublic: true,
  },
  {
    id: "logarithmic-view-trajectories",
    reportType: "Theoretical Lens",
    tabCategory: "theoretical",
    title: "Logarithmic View of Trajectories",
    summary:
      "Interpreting trajectory growth and contraction through logarithmic transformation. Highlights phase behavior and descent moments.",
    body: [
      "Viewing Collatz trajectories on a logarithmic scale reveals a characteristic saw-tooth pattern: odd steps produce a brief rise proportional to log₂(3), while even steps produce descents proportional to log₂(2).",
      "Because log₂(3) ≈ 1.585 and each odd step is followed (on average) by more than one even step, the long-term drift of most trajectories is downward in log-space.",
      "This logarithmic drift argument is often cited as informal intuition for why trajectories should converge, but it does not constitute a proof. The argument fails to account for the structured dependence between step types.",
      "The current catalog of 3.83 million verified integers is entirely consistent with this log-scale interpretation, though consistency is not proof.",
    ],
    publishedAt: "May 23, 2026",
    reviewedBy: "Admin",
    stats: [
      { value: "Lens", label: "Interpretive Lens", sublabel: "Not a proof", iconVariant: "lens" },
      { value: "✓", label: "Odd-only view", sublabel: "Compatible", iconVariant: "check" },
      { value: "log₂", label: "Scale used", sublabel: "Log base 2", iconVariant: "trend" },
      { value: "↓", label: "Drift view", sublabel: "Downward avg.", iconVariant: "drift" },
    ],
    isPublic: true,
  },
  {
    id: "weekly-digest-may-12-18",
    reportType: "Weekly Digest",
    tabCategory: "digest",
    title: "Weekly Digest: May 12–May 18, 2026",
    summary:
      "This week, the engine verified 980,000 additional starting numbers. All tested trajectories reached 1.",
    body: [
      "Between May 12 and May 18, the Collatz Engine processed 980,000 consecutive integers, extending the verified catalog from n = 2,646,700 to n = 3,626,700.",
      "All trajectories confirmed convergence to 1. One new trajectory-length record was logged at n = 3,732,423 with 596 steps.",
      "The peak value record remained unchanged at 622,717,901,620. Catalog integrity checks passed with 11/11 checks throughout the week.",
    ],
    publishedAt: "May 19, 2026",
    reviewedBy: "Admin",
    stats: [
      { value: "980K", label: "Numbers Checked", sublabel: "This week", iconVariant: "check" },
      { value: "596", label: "New Record", sublabel: "Steps (trajectory)", iconVariant: "trend" },
      { value: "622.7B", label: "Highest Peak", sublabel: "Unchanged", iconVariant: "peak" },
      { value: "1", label: "New Record", sublabel: "Trajectory length", iconVariant: "record" },
    ],
    isPublic: true,
  },
  {
    id: "batch-3700001-3800000",
    reportType: "Batch Analysis",
    tabCategory: "batch",
    title: "Batch Analysis: 3,700,001 – 3,800,000",
    summary:
      "100,000 trajectories processed across this range. One trajectory-length record set at n = 3,732,423 with 596 steps.",
    body: [
      "This batch covers integers 3,700,001 through 3,800,000, representing the largest single contiguous range analyzed in a recent digest period.",
      "All 100,000 trajectories converged to 1. One new global trajectory-length record was logged: n = 3,732,423 reached 1 in 596 steps.",
      "The highest peak value in this range was 622,717,901,620, which also set a new global peak record.",
    ],
    publishedAt: "May 17, 2026",
    reviewedBy: "Admin",
    stats: [
      { value: "100K", label: "Processed", sublabel: "Trajectories", iconVariant: "count" },
      { value: "596", label: "Record Steps", sublabel: "New global record", iconVariant: "trend" },
      { value: "622.7B", label: "New Peak", sublabel: "Global record", iconVariant: "peak" },
      { value: "2", label: "New Records", sublabel: "Set in range", iconVariant: "record", highlight: true },
    ],
    isPublic: true,
  },
];

export const FEATURED_NOTE_IDS: Record<TabId, string> = {
  latest: "weekly-digest-may-19-26",
  batch: "batch-3800001-3830400",
  pattern: "descent-merging-behavior",
  theoretical: "logarithmic-view-trajectories",
  digest: "weekly-digest-may-19-26",
};

export const SUPPORTING_NOTE_IDS: string[] = [
  "batch-3800001-3830400",
  "descent-merging-behavior",
  "logarithmic-view-trajectories",
  "weekly-digest-may-12-18",
];

export function getNoteById(id: string): DemoNote | undefined {
  return DEMO_NOTES.find((note) => note.id === id);
}

export function getFeaturedNote(tab: TabId): DemoNote | undefined {
  return getNoteById(FEATURED_NOTE_IDS[tab]);
}

export function getSupportingNotes(featuredId: string): DemoNote[] {
  return SUPPORTING_NOTE_IDS.filter((id) => id !== featuredId)
    .map(getNoteById)
    .filter((n): n is DemoNote => n !== undefined)
    .slice(0, 4);
}
