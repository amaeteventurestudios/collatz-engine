"use client";

import { useState, useCallback } from "react";
import { runCalculator, type CalcResult } from "@/lib/collatz/calculator";
import { CalculatorHero } from "./CalculatorHero";
import { CalculatorInputPanel } from "./CalculatorInputPanel";
import { CalculatorMetricCards } from "./CalculatorMetricCards";
import { TrajectoryGraph } from "./TrajectoryGraph";
import { SequenceTable } from "./SequenceTable";
import { SequenceSummary } from "./SequenceSummary";
import { CustomConjectureLab } from "./CustomConjectureLab";

// ─── Educational cards data ───────────────────────────────────────────────────

const EDU_CARDS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
    ),
    color: "text-teal-400",
    bg: "bg-teal-500/10",
    ring: "ring-teal-500/20",
    title: "Billions Tested",
    body: "The conjecture has been verified computationally for very large ranges of positive integers.",
    badge: "All systems operational",
    badgeColor: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    ring: "ring-blue-500/20",
    title: "Unproven",
    body: "No complete mathematical proof exists yet for all positive integers.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    ring: "ring-pink-500/20",
    title: "Simple to State",
    body: "Easy to explain to anyone, yet incredibly difficult to prove for the general case.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/20",
    title: "Infinite Curiosity",
    body: "A problem that continues to fascinate mathematicians and computational researchers worldwide.",
  },
];

// ─── Default result for 27 ────────────────────────────────────────────────────

function getDefaultResult(): CalcResult {
  const r = runCalculator("27", 10000, false);
  if ("error" in r) throw new Error("Default calc failed");
  return r;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CollatzCalculatorPage() {
  const [inputValue, setInputValue] = useState("27");
  const [maxSteps, setMaxSteps] = useState(10000);
  const [shortcutMode, setShortcutMode] = useState(false);
  const [logScale, setLogScale] = useState(false);
  const [result, setResult] = useState<CalcResult>(() => getDefaultResult());
  const [error, setError] = useState<string | null>(null);
  const [isComputing, setIsComputing] = useState(false);

  const handleCalculate = useCallback(() => {
    setError(null);
    setIsComputing(true);

    // Yield to browser for UI update before heavy computation
    setTimeout(() => {
      const r = runCalculator(inputValue, maxSteps, shortcutMode);
      setIsComputing(false);
      if ("error" in r) {
        setError(r.error);
      } else {
        setResult(r);
        // Scroll to results smoothly
        document.getElementById("calc-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 0);
  }, [inputValue, maxSteps, shortcutMode]);

  return (
    <div className="bg-[#020617] text-slate-100">
      {/* Hero */}
      <CalculatorHero />

      {/* Main content */}
      <div className="mx-auto max-w-7xl space-y-5 px-4 pb-16 pt-5 sm:px-6 lg:px-8">

        {/* Input panel */}
        <CalculatorInputPanel
          inputValue={inputValue}
          onInputChange={setInputValue}
          maxSteps={maxSteps}
          onMaxStepsChange={setMaxSteps}
          shortcutMode={shortcutMode}
          onShortcutModeChange={setShortcutMode}
          logScale={logScale}
          onLogScaleChange={setLogScale}
          isComputing={isComputing}
          error={error}
          onCalculate={handleCalculate}
        />

        {/* Results area */}
        <div id="calc-results">
          {/* Metric cards */}
          <CalculatorMetricCards result={result} />

          {/* Trajectory graph */}
          <div className="mt-5">
            <TrajectoryGraph result={result} logScale={logScale} onLogScaleChange={setLogScale} />
          </div>

          {/* Table + summary */}
          <div className="mt-5 flex flex-col gap-5 lg:flex-row">
            <SequenceTable result={result} />
            <SequenceSummary result={result} />
          </div>
        </div>

        {/* Custom Conjecture Lab */}
        <div className="pt-2">
          <CustomConjectureLab currentInput={inputValue} />
        </div>

        {/* Educational cards */}
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-4">
          {EDU_CARDS.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 text-center transition-colors hover:border-slate-700 sm:text-left"
            >
              <div className={`mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-xl ring-1 sm:mx-0 ${card.bg} ${card.ring}`}>
                <span className={card.color}>{card.icon}</span>
              </div>
              <p className="text-sm font-semibold text-slate-200">{card.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{card.body}</p>
              {card.badge && (
                <span className={`mt-3 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${card.badgeColor}`}>
                  {card.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
