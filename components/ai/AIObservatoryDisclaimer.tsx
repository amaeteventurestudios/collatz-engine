import { GlowingInfoIcon } from "@/components/ai/GlowingInfoIcon";

export function AIObservatoryDisclaimer() {
  return (
    <div className="mt-6 flex items-center gap-3 rounded-lg border border-slate-700/60 bg-slate-900/60 px-4 py-3">
      <GlowingInfoIcon
        tooltip="Computation can provide evidence, but it does not prove the conjecture."
        align="left"
      />
      <p className="text-xs leading-relaxed text-slate-400">
        AI notes summarize verified engine data. They do not constitute a proof of the Collatz
        Conjecture.
      </p>
    </div>
  );
}
