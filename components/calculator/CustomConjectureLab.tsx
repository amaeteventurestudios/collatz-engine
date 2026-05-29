"use client";

import { useState } from "react";
import {
  runCustomCalculator,
  CLASSIC_PRESET,
  KNUTH_PRESET,
  type CustomRuleConfig,
  type CustomCalcResult,
  fmtBig,
  fmtNum,
} from "@/lib/collatz/calculator";

type Preset = "classic" | "syracuse" | "knuth" | "custom";

interface Props {
  currentInput: string;
}

export function CustomConjectureLab({ currentInput }: Props) {
  const [preset, setPreset] = useState<Preset>("classic");
  const [evenDivisor, setEvenDivisor] = useState(2);
  const [oddMultiplier, setOddMultiplier] = useState(3);
  const [oddAdder, setOddAdder] = useState(1);
  const [stopAfter, setStopAfter] = useState(10000);
  const [result, setResult] = useState<CustomCalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p === "classic" || p === "syracuse") {
      setEvenDivisor(CLASSIC_PRESET.evenDivisor);
      setOddMultiplier(CLASSIC_PRESET.oddMultiplier);
      setOddAdder(CLASSIC_PRESET.oddAdder);
    } else if (p === "knuth") {
      setEvenDivisor(KNUTH_PRESET.evenDivisor);
      setOddMultiplier(KNUTH_PRESET.oddMultiplier);
      setOddAdder(KNUTH_PRESET.oddAdder);
    }
  }

  function handleReset() {
    applyPreset("classic");
    setResult(null);
    setError(null);
  }

  function handleRun() {
    setError(null);
    setResult(null);
    setIsRunning(true);

    const cfg: CustomRuleConfig = { evenDivisor, oddMultiplier, oddAdder };
    const r = runCustomCalculator(currentInput || "27", stopAfter, cfg);

    setIsRunning(false);
    if ("error" in r) {
      setError(r.error);
    } else {
      setResult(r);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Custom Conjecture Lab</h2>
          <p className="mt-1 text-xs text-slate-500">
            Experiment with rule variants and see how sequences behave.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
        >
          <ResetIcon />
          Reset to default
        </button>
      </div>

      {/* Warning */}
      <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p className="text-[11px] leading-relaxed text-amber-300/80">
          Changing the rules creates a different problem. There is no guarantee that it will reach 1
          or behave like the classic Collatz sequence.
        </p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]">
        {/* Even rule */}
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            If n is even:
          </label>
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300">
              Divide by
            </span>
            <input
              type="number"
              min={1}
              max={100}
              value={evenDivisor}
              onChange={(e) => { setEvenDivisor(Number(e.target.value)); setPreset("custom"); }}
              className="w-16 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-center text-xs font-mono text-slate-200 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Odd rule */}
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            If n is odd:
          </label>
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300">
              Multiply by
            </span>
            <input
              type="number"
              min={1}
              max={100}
              value={oddMultiplier}
              onChange={(e) => { setOddMultiplier(Number(e.target.value)); setPreset("custom"); }}
              className="w-16 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-center text-xs font-mono text-slate-200 focus:border-teal-500 focus:outline-none"
            />
            <span className="text-xs text-slate-500">then add</span>
            <input
              type="number"
              min={-100}
              max={100}
              value={oddAdder}
              onChange={(e) => { setOddAdder(Number(e.target.value)); setPreset("custom"); }}
              className="w-16 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-center text-xs font-mono text-slate-200 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Stop after */}
        <div>
          <label htmlFor="lab-stop-after" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            Stop after
          </label>
          <div className="flex items-center gap-2">
            <input
              id="lab-stop-after"
              type="number"
              min={100}
              max={100000}
              step={1000}
              value={stopAfter}
              onChange={(e) => setStopAfter(Math.max(100, Number(e.target.value)))}
              className="w-24 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-right text-xs font-mono text-slate-200 focus:border-teal-500 focus:outline-none"
            />
            <span className="text-xs text-slate-500">steps</span>
          </div>
        </div>

        {/* Run button */}
        <div className="flex items-end">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition-all hover:from-teal-400 hover:to-cyan-400 disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Run Custom
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="mt-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
          Presets
        </p>
        <div className="flex flex-wrap gap-2">
          {(["classic", "syracuse", "knuth", "custom"] as const).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                preset === p
                  ? "border-teal-500/40 bg-teal-500/15 text-teal-400"
                  : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200"
              }`}
            >
              {p === "classic" ? "Classic (3n + 1)" : p === "syracuse" ? "Syracuse (3n + 1)" : p === "knuth" ? "Knuth (3n − 1)" : "Custom"}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-400">
          {error}
        </p>
      )}

      {/* Result */}
      {result && <LabResult result={result} />}
    </section>
  );
}

// ─── Lab result display ───────────────────────────────────────────────────────

function LabResult({ result }: { result: CustomCalcResult }) {
  return (
    <div className="mt-5 rounded-xl border border-slate-700 bg-slate-800/60 p-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        <LabStat label="Steps" value={fmtNum(result.steps)} />
        <LabStat label="Peak" value={fmtBig(result.peak)} />
        <LabStat label="Final Value" value={fmtBig(result.finalValue)} />
        <LabStat
          label="Status"
          value={result.reachedOne ? "Reached 1 ✓" : "Did not reach 1"}
          accent={result.reachedOne}
        />
      </div>
      {result.warning && (
        <p className="mt-3 text-[11px] text-amber-400">{result.warning}</p>
      )}
    </div>
  );
}

function LabStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${accent ? "text-green-400" : "text-slate-200"}`}>
        {value}
      </p>
    </div>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 12a9 9 0 109-9H3" />
      <polyline points="3 4 3 12 11 12" />
    </svg>
  );
}
