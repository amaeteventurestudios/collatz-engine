import { Sparkles } from "lucide-react";
import type { VisualStudioTabId } from "../visualStudioTypes";

const copy: Record<Exclude<VisualStudioTabId, "live-sequence-stack">, string> = {
  "convergence-tree":
    "This view will map how Collatz paths merge into shared convergence structures.",
  "collatz-bloom":
    "This view will translate parity and trajectory behavior into generative 3D bloom forms.",
  "records-extremes":
    "This view will highlight longest trajectories, highest peaks, descent moments, and near-escape candidates.",
};

const labels: Record<Exclude<VisualStudioTabId, "live-sequence-stack">, string> = {
  "convergence-tree": "Convergence Tree",
  "collatz-bloom": "Collatz Bloom",
  "records-extremes": "Records & Extremes",
};

interface ComingSoonModeProps {
  tabId: Exclude<VisualStudioTabId, "live-sequence-stack">;
}

export function ComingSoonMode({ tabId }: ComingSoonModeProps) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-slate-700/70 bg-slate-950/72 p-8 shadow-2xl shadow-cyan-950/10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_32%_22%,rgba(34,211,238,0.13),transparent_28%),radial-gradient(circle_at_72%_20%,rgba(139,92,246,0.12),transparent_24%)]"
      />
      <div className="relative flex min-h-[420px] items-center justify-center">
        <div className="max-w-xl text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
            <Sparkles className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
            Coming Soon
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-50">
            {labels[tabId]}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            {copy[tabId]}
          </p>
        </div>
      </div>
    </section>
  );
}
