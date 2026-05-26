import { supabase } from "@/lib/supabase";

export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;
export const EXPORT_DEFAULT_LIMIT = 1_000;
export const EXPORT_MAX_LIMIT = 10_000;

export interface PublicResultRow {
  n: number;
  steps: number;
  peak: number;
  reached_one?: boolean;
  created_at?: string | null;
}

export function getClient() {
  if (!supabase) {
    throw new Error("Live catalog is unavailable.");
  }
  return supabase;
}

export function jsonError(message: string, status = 400): Response {
  return Response.json({ ok: false, error: message }, { status });
}

export function parseLimit(
  value: string | null,
  defaultLimit = DEFAULT_LIMIT,
  maxLimit = MAX_LIMIT,
): { limit: number; error: string | null } {
  if (value == null || value.trim() === "") return { limit: defaultLimit, error: null };
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return { limit: defaultLimit, error: "limit must be a positive integer." };
  }
  if (parsed > maxLimit) {
    return { limit: defaultLimit, error: `limit must be ${maxLimit} or lower.` };
  }
  return { limit: parsed, error: null };
}

export function parseOffset(value: string | null): { offset: number; error: string | null } {
  if (value == null || value.trim() === "") return { offset: 0, error: null };
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return { offset: 0, error: "offset must be a non-negative integer." };
  }
  return { offset: parsed, error: null };
}

export function parseOrder(value: string | null): { order: "asc" | "desc"; error: string | null } {
  if (value == null || value.trim() === "") return { order: "desc", error: null };
  if (value === "asc" || value === "desc") return { order: value, error: null };
  return { order: "desc", error: "order must be asc or desc." };
}

export function toPublicResult(row: PublicResultRow) {
  const peakRatio = row.n > 0 ? row.peak / row.n : null;
  return {
    n: row.n,
    steps_to_one: row.steps,
    highest_peak: row.peak,
    peak_ratio: peakRatio,
    reached_one: row.reached_one ?? true,
    cataloged_at: row.created_at ?? null,
  };
}

export function secondsSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1_000));
}

export function runtimeSeconds(startedAt: string | null | undefined): number {
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1_000));
}
