"use client";

import { Activity, BarChart3, Flower2, Network } from "lucide-react";
import type { VisualStudioTab, VisualStudioTabId } from "./visualStudioTypes";

const tabs: VisualStudioTab[] = [
  {
    id: "live-sequence-stack",
    label: "Live Sequence Stack",
    Icon: Activity,
  },
  {
    id: "convergence-tree",
    label: "Convergence Tree",
    Icon: Network,
  },
  {
    id: "collatz-bloom",
    label: "Collatz Bloom",
    status: "Coming soon",
    Icon: Flower2,
  },
  {
    id: "records-extremes",
    label: "Records & Extremes",
    status: "Coming soon",
    Icon: BarChart3,
  },
];

interface VisualStudioTabsProps {
  activeTab: VisualStudioTabId;
  onTabChange: (tab: VisualStudioTabId) => void;
}

export function VisualStudioTabs({
  activeTab,
  onTabChange,
}: VisualStudioTabsProps) {
  return (
    <nav
      className="overflow-hidden rounded-lg border border-slate-700/60 bg-slate-950/70 shadow-2xl shadow-cyan-950/10 backdrop-blur"
      aria-label="Visual Studio modes"
    >
      <div className="no-scrollbar flex overflow-x-auto">
        {tabs.map(({ id, label, status, Icon }) => {
          const active = id === activeTab;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`group relative flex min-w-[17rem] flex-1 items-center gap-4 border-r border-slate-800/80 px-6 py-5 text-left transition-colors last:border-r-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                active
                  ? "bg-cyan-400/[0.035] text-slate-50"
                  : "text-slate-500 hover:bg-slate-900/80 hover:text-slate-200"
              }`}
            >
              <Icon
                className={`h-6 w-6 shrink-0 ${
                  active ? "text-cyan-300" : "text-slate-500 group-hover:text-cyan-300"
                }`}
                aria-hidden
              />
              <span>
                <span className="block text-sm font-semibold tracking-tight">
                  {label}
                </span>
                {status && (
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    {status}
                  </span>
                )}
              </span>
              {active && (
                <span className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-cyan-400 via-blue-400 to-transparent" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
