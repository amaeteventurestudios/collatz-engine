import type { ReactNode } from "react";

interface AdminCardProps {
  icon: string;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: "green" | "yellow" | "blue" | "red" | "slate";
  actions?: ReactNode;
}

const badgeStyles: Record<string, string> = {
  green: "bg-green-500/15 text-green-600 dark:text-green-400",
  yellow: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  red: "bg-red-500/15 text-red-600 dark:text-red-400",
  slate: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
};

export function AdminCard({
  icon,
  title,
  description,
  badge,
  badgeColor = "slate",
  actions,
}: AdminCardProps) {
  return (
    <div className="engine-card flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-lg dark:bg-slate-800">
            {icon}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
            {badge && (
              <span
                className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeStyles[badgeColor]}`}
              >
                {badge}
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
      {actions && <div className="mt-auto">{actions}</div>}
    </div>
  );
}
