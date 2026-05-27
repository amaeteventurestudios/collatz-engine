import { EVENT_COLORS, type EventColorKey } from "@/lib/collatz/event-visuals";

type EventColorLegendProps = {
  variant?: "full" | "compact";
  surface?: "default" | "dark";
  className?: string;
};

const LEGEND_ITEMS: Array<{
  color: EventColorKey;
  name: string;
  meaning: string;
  appears: string;
}> = [
  {
    color: "cyan",
    name: "Cyan / Teal",
    meaning: "Active engine, batch started, live stream",
    appears: "Discovery Feed, live status pills, active markers",
  },
  {
    color: "blue",
    name: "Electric Blue",
    meaning: "Batch completed, verified batch",
    appears: "Discovery Feed, verified activity, completed checks",
  },
  {
    color: "emerald",
    name: "Green",
    meaning: "Integrity, health, persistence, verification passed",
    appears: "System Integrity, health panels, verified chips",
  },
  {
    color: "amber",
    name: "Amber / Gold",
    meaning: "Highest peak record",
    appears: "Record Timeline, Record Leaderboards, Peak Growth Graph",
  },
  {
    color: "violet",
    name: "Purple / Violet",
    meaning: "Longest trajectory / stopping-time record",
    appears: "Record Timeline, Record Leaderboards, Stopping Time Graph",
  },
  {
    color: "slate",
    name: "Slate / Blue-gray",
    meaning: "Neutral engine event or metadata",
    appears: "timestamps, helper text, ordinary labels",
  },
];

export function EventColorLegend({
  variant = "full",
  surface = "default",
  className = "",
}: EventColorLegendProps) {
  const compact = variant === "compact";
  const surfaceClass =
    surface === "dark"
      ? "border-slate-700/70 bg-slate-950/70 text-slate-100"
      : "border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100";
  const meaningClass =
    surface === "dark" ? "text-slate-300" : "text-slate-600 dark:text-slate-300";
  const appearsClass =
    surface === "dark" ? "text-slate-500" : "text-slate-500 dark:text-slate-500";

  return (
    <aside
      aria-label="Color Legend, engine event color meanings"
      className={`rounded-xl border p-4 shadow-sm ${surfaceClass} ${className}`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-heading">Color Legend</p>
          {!compact && (
            <p className="panel-subtitle mt-1">
              How to read the engine event colors.
            </p>
          )}
        </div>
      </div>

      <div className={`mt-4 grid gap-2 ${compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
        {LEGEND_ITEMS.map((item) => {
          const color = EVENT_COLORS[item.color];
          return (
            <div
              key={item.color}
              className={`rounded-lg border px-3 py-3 ${color.border} ${color.bg}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${color.dot}`}
                  aria-hidden="true"
                />
                <p className={`text-xs font-semibold ${color.text}`}>{item.name}</p>
              </div>
              <p className={`mt-1.5 text-xs leading-relaxed ${meaningClass}`}>
                {item.meaning}
              </p>
              {!compact && (
                <p className={`mt-1 text-[11px] leading-relaxed ${appearsClass}`}>
                  Appears in: {item.appears}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
