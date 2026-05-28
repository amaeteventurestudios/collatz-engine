import type { ReactNode } from "react";

interface VisualMetricCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function VisualMetricCard({
  title,
  children,
  className = "",
  action,
}: VisualMetricCardProps) {
  return (
    <section
      className={`rounded-lg border border-cyan-300/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/20 ring-1 ring-white/[0.025] backdrop-blur ${className}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}
