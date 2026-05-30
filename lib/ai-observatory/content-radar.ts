import type { EngineAdminState } from "@/lib/admin/types";
import type { AIDraftRow, AINoteRow } from "./types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TopicPriority = "high" | "medium" | "low";
export type TopicCategory =
  | "record"
  | "progress"
  | "near_escape"
  | "infrastructure"
  | "education"
  | "visual";

export interface TopicSeed {
  /** Deterministic ID derived from topic content — stable across reloads. */
  id: string;
  title: string;
  summary: string;
  category: TopicCategory;
  priority: TopicPriority;
  confidence: TopicPriority;
  /** Machine-readable source identifier. */
  source_type: string;
  /** Structured data from engine state or notes attached to drafts created from this topic. */
  source_data: Record<string, unknown>;
  /** Short-form content format suggestions (match ContentType values). */
  suggested_formats: string[];
  /** One-line metadata shown in the card footer. */
  detail: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stableId(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return `topic-${(h >>> 0).toString(16)}`;
}

function fmtN(n: number | null | undefined): string {
  const v = n ?? 0;
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString("en-US");
}

function hasDraftWith(drafts: AIDraftRow[], ...keywords: string[]): boolean {
  return drafts.some((d) => {
    const hay = [d.title, d.content_type, String(d.source_data?.source_type ?? "")]
      .join(" ")
      .toLowerCase();
    return keywords.every((k) => hay.includes(k.toLowerCase()));
  });
}

function uptimeStr(startedAt: string | null): string {
  if (!startedAt) return "Active";
  const ms = Date.now() - new Date(startedAt).getTime();
  const totalH = Math.floor(ms / 3_600_000);
  const d = Math.floor(totalH / 24);
  const h = totalH % 24;
  if (d > 0) return `${d}d ${h}h`;
  return `${totalH}h`;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generates Content Radar topic suggestions from live engine state, existing
 * drafts (to avoid duplication), and AI notes. Rule-based only — no AI calls.
 *
 * Topics are not persisted; they regenerate each page load. Once a matching
 * draft exists the topic no longer appears.
 */
export function generateTopicSuggestions(
  engineState: EngineAdminState | null,
  drafts: AIDraftRow[],
  notes: AINoteRow[],
): TopicSeed[] {
  if (!engineState) return [];

  const topics: TopicSeed[] = [];
  const current = engineState.currentNumber ?? engineState.lastProcessed ?? 0;
  const total = engineState.totalChecked ?? 0;
  const longest = engineState.longestSteps ?? 0;
  const peak = engineState.highestPeak ?? 0;
  const running = engineState.status === "running";

  const baseSource = {
    current_number: current,
    total_checked: total,
    longest_steps: longest,
    highest_peak: peak,
    engine_status: engineState.status,
  };

  // ── 1. New Trajectory Record ────────────────────────────────────────────────
  if (longest > 0 && !hasDraftWith(drafts, "trajectory", "record") && !hasDraftWith(drafts, "trajectory", "steps")) {
    topics.push({
      id: stableId(`record-trajectory-${longest}`),
      title: `New Longest Trajectory: ${longest.toLocaleString()} Steps Reached`,
      summary:
        `A new longest Collatz trajectory has been recorded with ${longest.toLocaleString()} steps, ` +
        `detected at or near n=${fmtN(current)}. ` +
        `${fmtN(total)} total numbers have been verified.`,
      category: "record",
      priority: "high",
      confidence: "high",
      source_type: "engine_record",
      source_data: { ...baseSource, source_type: "trajectory_record" },
      suggested_formats: ["blog_post", "linkedin_post", "x_thread"],
      detail: `Length: ${longest.toLocaleString()} steps  Number: ${fmtN(current)}  Confidence: High`,
    });
  }

  // ── 2. Weekly Observatory Report ────────────────────────────────────────────
  const hasWeekly = drafts.some((d) => d.content_type === "weekly_report") || hasDraftWith(drafts, "weekly");
  if (!hasWeekly && total > 0) {
    topics.push({
      id: stableId(`weekly-${Math.floor(total / 1_000_000)}`),
      title: "Weekly Observatory Report",
      summary:
        `Summarize this week's verified progress and records. ` +
        `Range: +${fmtN(total)} numbers checked. ` +
        `Records: ${longest > 0 ? 1 : 0}. ` +
        `Engine status: ${running ? "Running nominally" : (engineState.status ?? "unknown")}.`,
      category: "progress",
      priority: "medium",
      confidence: "high",
      source_type: "weekly_progress",
      source_data: { ...baseSource, source_type: "weekly_report" },
      suggested_formats: ["weekly_report", "blog_post"],
      detail: `Range: +${fmtN(total)} numbers  Records: ${longest > 0 ? 1 : 0}  Integrity: Verified`,
    });
  }

  // ── 3. Near-Escape Candidates (from AI Notes) ────────────────────────────────
  const nearEscapes = notes.filter((n) => n.note_type === "near_escape" && n.status === "new");
  if (nearEscapes.length > 0 && !hasDraftWith(drafts, "near-escape") && !hasDraftWith(drafts, "peak-ratio")) {
    const n = nearEscapes[0];
    const sd = n.source_data ?? {};
    const numVal = sd.number ?? sd.candidate_number ?? current;
    const prVal = typeof sd.peak_ratio === "number" ? `${sd.peak_ratio.toFixed(2)}` : "";
    topics.push({
      id: stableId(`near-escape-${n.id}`),
      title: `Near-Escape Candidate: High Peak-Ratio`,
      summary: n.body.slice(0, 200) + (n.body.length > 200 ? "…" : ""),
      category: "near_escape",
      priority: "medium",
      confidence: "medium",
      source_type: "near_escape_event",
      source_data: { ...sd, source_type: "near_escape_event", note_id: n.id },
      suggested_formats: ["blog_post", "x_thread"],
      detail: `Number: ${fmtN(Number(numVal))}${prVal ? `  Peak Ratio: ${prVal}` : ""}  Delayed descent`,
    });
  }

  // ── 4. Infrastructure & Trust Update ────────────────────────────────────────
  if (total > 0 && !hasDraftWith(drafts, "integrity") && !hasDraftWith(drafts, "trust", "update")) {
    topics.push({
      id: stableId(`infra-trust-${Math.floor(total / 500_000)}`),
      title: "Integrity & Trust Update",
      summary:
        `Transparency note on system integrity and uptime. ` +
        `${fmtN(total)} numbers verified sequentially. ` +
        `All trajectories reached 1. ` +
        `Status: ${running ? "All systems nominal" : (engineState.status ?? "active")}.`,
      category: "infrastructure",
      priority: "low",
      confidence: "high",
      source_type: "system_status",
      source_data: {
        ...baseSource,
        source_type: "infrastructure",
        uptime: uptimeStr(engineState.startedAt),
        is_running: running,
      },
      suggested_formats: ["blog_post", "linkedin_post"],
      detail: `Uptime: ${uptimeStr(engineState.startedAt)}  Status: All systems nominal  Confidence: High`,
    });
  }

  // ── 5. Educational Content ───────────────────────────────────────────────────
  if (!hasDraftWith(drafts, "stopping", "time") && !hasDraftWith(drafts, "education")) {
    topics.push({
      id: stableId("education-stopping-time"),
      title: "What stopping time means in the Collatz Conjecture",
      summary:
        "An accessible explanation of stopping time, trajectory length, and why long trajectories are mathematically interesting — without claiming proof. " +
        `Context: the engine has verified ${fmtN(total)} consecutive integers.`,
      category: "education",
      priority: "low",
      confidence: "high",
      source_type: "educational",
      source_data: { source_type: "educational", topic: "stopping_time", longest_steps: longest },
      suggested_formats: ["blog_post", "linkedin_article"],
      detail: `Audience: Technical public  Format: Blog Post  Disclaimer required`,
    });
  }

  // ── 6. Visual Studio Showcase ───────────────────────────────────────────────
  if (!hasDraftWith(drafts, "visual", "3d") && !hasDraftWith(drafts, "visual studio")) {
    topics.push({
      id: stableId("visual-studio-feature"),
      title: "Seeing Collatz Trajectories in 3D",
      summary:
        "Showcase the Visual Studio feature — a 3D trajectory explorer that reveals the structural patterns the Collatz Conjecture creates across large verified datasets.",
      category: "visual",
      priority: "low",
      confidence: "medium",
      source_type: "feature_showcase",
      source_data: { source_type: "visual_feature", feature: "visual_studio" },
      suggested_formats: ["blog_post", "x_thread"],
      detail: `Feature: Visual Studio  Format: Blog + social  No proof claims`,
    });
  }

  return topics;
}
