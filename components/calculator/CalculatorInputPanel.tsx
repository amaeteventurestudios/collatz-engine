"use client";

import { useRef } from "react";

interface Props {
  inputValue: string;
  onInputChange: (v: string) => void;
  maxSteps: number;
  onMaxStepsChange: (v: number) => void;
  shortcutMode: boolean;
  onShortcutModeChange: (v: boolean) => void;
  logScale: boolean;
  onLogScaleChange: (v: boolean) => void;
  isComputing: boolean;
  error: string | null;
  onCalculate: () => void;
}

export function CalculatorInputPanel({
  inputValue,
  onInputChange,
  maxSteps,
  onMaxStepsChange,
  shortcutMode,
  onShortcutModeChange,
  logScale,
  onLogScaleChange,
  isComputing,
  error,
  onCalculate,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") onCalculate();
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm">
      <div className="grid grid-cols-1 gap-0 divide-y divide-slate-800 md:grid-cols-[1fr_auto] md:divide-x md:divide-y-0">

        {/* ── Left: input + calculate ─────────────────────────── */}
        <div className="p-5 text-center sm:p-6 md:text-left">
          <label
            htmlFor="collatz-input"
            className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-400"
          >
            Enter a positive integer
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="collatz-input"
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value.replace(/[^0-9]/g, ""))}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 27"
              aria-describedby={error ? "calc-error" : undefined}
              aria-invalid={!!error}
              className="w-full min-w-0 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-center font-mono text-xl font-semibold text-white placeholder-slate-600 transition-colors focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 sm:text-left"
            />
            <button
              onClick={onCalculate}
              disabled={isComputing}
              aria-label="Calculate Collatz sequence"
              className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-teal-500/25 transition-all hover:from-teal-400 hover:to-cyan-400 hover:shadow-teal-500/40 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 sm:w-auto"
            >
              <CalcIcon computing={isComputing} />
              Calculate
            </button>
          </div>
          {error && (
            <p id="calc-error" role="alert" className="mt-2 text-xs font-medium text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* ── Right: options ──────────────────────────────────── */}
        <div className="p-5 text-center sm:p-6 md:text-left">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
            Options
          </p>
          <div className="space-y-4">
            {/* Shortcut mode */}
            <ToggleRow
              id="shortcut-mode"
              label="Shortcut mode"
              helper="Use (3n + 1) / 2 for odd numbers"
              checked={shortcutMode}
              onChange={onShortcutModeChange}
            />
            {/* Log scale */}
            <ToggleRow
              id="log-scale"
              label="Logarithmic scale"
              helper="Use log scale on the graph"
              checked={logScale}
              onChange={onLogScaleChange}
            />
            {/* Max steps */}
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row sm:items-start sm:text-left">
              <div>
                <label
                  htmlFor="max-steps"
                  className="block text-xs font-semibold text-slate-300"
                >
                  Max steps (safety)
                </label>
                <p className="mt-0.5 text-[11px] text-slate-500">Safety limit to prevent freezing</p>
              </div>
              <input
                id="max-steps"
                type="number"
                min={100}
                max={100000}
                step={1000}
                value={maxSteps}
                onChange={(e) => onMaxStepsChange(Math.max(100, Math.min(100000, Number(e.target.value))))}
                className="w-24 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-center text-xs font-mono text-slate-200 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 sm:text-right"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToggleRow({
  id,
  label,
  helper,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  helper: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:items-start sm:text-left">
      <div>
        <label htmlFor={id} className="block text-xs font-semibold text-slate-300 cursor-pointer">
          {label}
        </label>
        <p className="mt-0.5 text-[11px] text-slate-500">{helper}</p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
          checked
            ? "border-teal-500 bg-teal-500"
            : "border-slate-600 bg-slate-700"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
      </button>
    </div>
  );
}

function CalcIcon({ computing }: { computing: boolean }) {
  if (computing) {
    return (
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M21 12a9 9 0 11-6.219-8.56" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
