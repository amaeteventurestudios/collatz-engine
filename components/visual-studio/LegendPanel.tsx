import { VISUAL_STUDIO_COLORS } from "./collatzColorMaps";

interface LegendPanelProps {
  showRecord: boolean;
}

export function LegendPanel({ showRecord }: LegendPanelProps) {
  const items = [
    ["Latest Path", VISUAL_STUDIO_COLORS.latest],
    ["Recent Paths", VISUAL_STUDIO_COLORS.recent],
    ["Older Paths", VISUAL_STUDIO_COLORS.older],
    ...(showRecord ? [["Record Path", VISUAL_STUDIO_COLORS.record] as const] : []),
  ] as const;

  return (
    <div className="absolute right-4 top-4 z-10 hidden rounded-md border border-slate-600/70 bg-slate-950/78 p-3 shadow-2xl shadow-black/40 backdrop-blur md:block">
      <div className="space-y-2">
        {items.map(([label, color]) => (
          <div key={label} className="flex items-center gap-3">
            <span
              className="h-px w-6 rounded-full"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 12px ${color}`,
              }}
            />
            <span className="text-xs font-medium text-slate-200">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
