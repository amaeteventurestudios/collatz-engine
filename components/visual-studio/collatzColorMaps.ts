import type { VisualPathTone } from "./visualStudioTypes";

export const VISUAL_STUDIO_COLORS: Record<VisualPathTone, string> = {
  latest: "#f8c44f",
  recent: "#22d3ee",
  older: "#8b5cf6",
  record: "#fb923c",
};

export const VISUAL_STUDIO_GLOW: Record<VisualPathTone, string> = {
  latest: "rgba(248, 196, 79, 0.45)",
  recent: "rgba(34, 211, 238, 0.28)",
  older: "rgba(139, 92, 246, 0.23)",
  record: "rgba(251, 146, 60, 0.36)",
};

export function toneForTrajectory(
  index: number,
  total: number,
  isRecord: boolean,
  highlightRecords: boolean,
): VisualPathTone {
  if (index === 0) return "latest";
  if (isRecord && highlightRecords) return "record";
  const recentCutoff = Math.max(8, Math.ceil(total * 0.32));
  if (index < recentCutoff) return "recent";
  return "older";
}

export function opacityForTone(tone: VisualPathTone, selected: boolean): number {
  if (selected) return 1;
  if (tone === "latest") return 0.96;
  if (tone === "record") return 0.9;
  if (tone === "recent") return 0.62;
  return 0.4;
}
