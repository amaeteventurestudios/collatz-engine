import { supabase } from "@/lib/supabase";
import {
  REPORT_TYPE_META,
  type DemoNote,
  type ReportType,
  type NoteStat,
} from "./demo-notes";

// Shape of a row in the ai_observatory_notes Supabase table.
// If the table does not exist or the query fails, all functions fall back
// to the static DEMO_NOTES array so local/dev always works without Supabase.
interface SupabaseNote {
  id: string;
  report_type: string;
  title: string;
  summary: string;
  body: string | string[] | null;
  status: string;
  published_at: string | null;
  reviewed_by: string | null;
  source_start_number?: number | null;
  source_end_number?: number | null;
  total_checked?: number | null;
  longest_sequence_length?: number | null;
  highest_peak_value?: number | null;
  report_data?: Record<string, unknown> | null;
}

interface PublicDraft {
  id: string;
  title: string;
  content_type: string;
  excerpt: string | null;
  body_markdown: string | null;
  body_plain_text: string | null;
  status: string;
  source_data: Record<string, unknown> | null;
  approved_at: string | null;
  published_at: string | null;
  updated_at: string;
}

function formatPublishedDate(iso: string | null): string {
  if (!iso) return "Unknown date";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function mapReportType(raw: string): ReportType {
  const clean = raw.trim();
  if ((Object.keys(REPORT_TYPE_META) as string[]).includes(clean)) {
    return clean as ReportType;
  }
  const lower = clean.toLowerCase();
  if (lower.includes("batch")) return "Batch Analysis";
  if (lower.includes("pattern")) return "Pattern Report";
  if (lower.includes("theoretical") || lower.includes("lens")) return "Theoretical Lens";
  return "Weekly Digest";
}

function mapTabCategory(reportType: ReportType): DemoNote["tabCategory"] {
  switch (reportType) {
    case "Batch Analysis":   return "batch";
    case "Pattern Report":   return "pattern";
    case "Theoretical Lens": return "theoretical";
    case "Weekly Digest":    return "digest";
    default:                 return "latest";
  }
}

function fmtLarge(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("en-US");
}

function buildStats(row: SupabaseNote): NoteStat[] {
  const rd = row.report_data as Record<string, unknown> | null;
  if (rd && Array.isArray(rd.stats)) return rd.stats as NoteStat[];

  const stats: NoteStat[] = [];
  if (row.total_checked) {
    stats.push({
      value: fmtLarge(Number(row.total_checked)),
      label: "Numbers Checked",
      sublabel: "Total verified",
      iconVariant: "check",
    });
  }
  if (row.longest_sequence_length) {
    stats.push({
      value: String(row.longest_sequence_length),
      label: "Longest Trajectory",
      sublabel: "Steps",
      iconVariant: "trend",
    });
  }
  if (row.highest_peak_value) {
    stats.push({
      value: fmtLarge(Number(row.highest_peak_value)),
      label: "Highest Peak",
      sublabel: "Value",
      iconVariant: "peak",
    });
  }
  return stats;
}

function mapToDemoNote(row: SupabaseNote): DemoNote {
  const reportType = mapReportType(row.report_type);
  const body: string[] = Array.isArray(row.body)
    ? (row.body as string[])
    : typeof row.body === "string" && row.body.length > 0
    ? [row.body]
    : [];

  return {
    id: row.id,
    reportType,
    tabCategory: mapTabCategory(reportType),
    title: row.title,
    summary: row.summary,
    body,
    publishedAt: formatPublishedDate(row.published_at),
    reviewedBy: row.reviewed_by ?? "Admin",
    stats: buildStats(row),
    isPublic: true,
  };
}

function mapDraftToNote(row: PublicDraft): DemoNote {
  const reportType = mapReportType(row.content_type);
  const bodyText = row.body_markdown ?? row.body_plain_text ?? "";
  const body = bodyText
    ? bodyText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    : [];
  const source = row.source_data ?? {};

  return {
    id: row.id,
    reportType,
    tabCategory: mapTabCategory(reportType),
    title: row.title,
    summary: row.excerpt ?? body[0] ?? "Reviewed Observatory content from verified Collatz Engine data.",
    body,
    publishedAt: formatPublishedDate(row.published_at ?? row.approved_at ?? row.updated_at),
    reviewedBy: "Admin",
    stats: buildStats({
      id: row.id,
      report_type: reportType,
      title: row.title,
      summary: row.excerpt ?? "",
      body: bodyText,
      status: row.status,
      published_at: row.published_at ?? row.approved_at,
      reviewed_by: "Admin",
      total_checked: Number(source.total_checked ?? source.numbers_checked ?? 0) || null,
      longest_sequence_length: Number(source.longest_sequence_length ?? source.longest_trajectory ?? 0) || null,
      highest_peak_value: Number(source.highest_peak_value ?? source.highest_peak ?? 0) || null,
      report_data: source,
    }),
    isPublic: true,
  };
}

/**
 * Fetch approved/published Observatory content.
 * No demo fallback is used here: public content must come from approved data.
 */
export async function getPublishedNotes(): Promise<DemoNote[]> {
  if (!supabase) return [];
  try {
    const drafts = await supabase
      .from("ai_drafts")
      .select("id,title,content_type,excerpt,body_markdown,body_plain_text,status,source_data,approved_at,published_at,updated_at")
      .in("status", ["approved", "published"])
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("approved_at", { ascending: false, nullsFirst: false });

    if (!drafts.error && drafts.data && drafts.data.length > 0) {
      return (drafts.data as PublicDraft[]).map(mapDraftToNote);
    }

    const { data, error } = await supabase
      .from("ai_observatory_notes")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error || !data || data.length === 0) return [];
    return (data as SupabaseNote[]).map(mapToDemoNote);
  } catch {
    return [];
  }
}

/**
 * Fetch a single published Observatory note by id.
 * Returns null (→ 404) if the note does not exist or is not published.
 */
export async function getPublishedNoteById(id: string): Promise<DemoNote | null> {
  if (supabase) {
    try {
      const draft = await supabase
        .from("ai_drafts")
        .select("id,title,content_type,excerpt,body_markdown,body_plain_text,status,source_data,approved_at,published_at,updated_at")
        .eq("id", id)
        .in("status", ["approved", "published"])
        .maybeSingle();
      if (!draft.error && draft.data) return mapDraftToNote(draft.data as PublicDraft);

      const { data, error } = await supabase
        .from("ai_observatory_notes")
        .select("*")
        .eq("id", id)
        .eq("status", "published")
        .maybeSingle();

      if (!error && data) return mapToDemoNote(data as SupabaseNote);
      if (!error && !data) return null; // exists but not published → 404
    } catch { return null; }
  }
  return null;
}
