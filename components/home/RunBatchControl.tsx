"use client";

import { useState } from "react";

type RunState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; batchStart: number; batchEnd: number }
  | { status: "error"; message: string };

export function RunBatchControl() {
  const [runState, setRunState] = useState<RunState>({ status: "idle" });

  async function handleRun() {
    if (runState.status === "loading") return;
    setRunState({ status: "loading" });

    try {
      const res = await fetch("/api/collatz/run-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 100 }),
      });

      const data: {
        ok: boolean;
        batchStart?: number;
        batchEnd?: number;
        numbersProcessed?: number;
        error?: string;
      } = await res.json();

      if (!res.ok || !data.ok) {
        setRunState({
          status: "error",
          message: data.error ?? `Request failed (${res.status})`,
        });
        return;
      }

      setRunState({
        status: "success",
        batchStart: data.batchStart!,
        batchEnd: data.batchEnd!,
      });

      // Signal StatusStrip (and any other listeners) to reload immediately
      window.dispatchEvent(new Event("collatz-state-updated"));
    } catch (err) {
      setRunState({
        status: "error",
        message: err instanceof Error ? err.message : "Unexpected error",
      });
    }
  }

  const isLoading = runState.status === "loading";

  return (
    <div className="flex items-center gap-2">
      {runState.status === "success" && (
        <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400">
          Processed {runState.batchStart.toLocaleString("en-US")}–
          {runState.batchEnd.toLocaleString("en-US")}
        </span>
      )}

      {runState.status === "error" && (
        <span
          className="max-w-[160px] truncate text-[11px] font-medium text-red-500 dark:text-red-400"
          title={runState.message}
        >
          {runState.message}
        </span>
      )}

      <button
        onClick={handleRun}
        disabled={isLoading}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
          isLoading
            ? "cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
            : "bg-teal-500 text-white shadow-sm hover:bg-teal-600 active:bg-teal-700 dark:hover:bg-teal-400"
        }`}
      >
        {isLoading ? "Running…" : "Run Next 100"}
      </button>
    </div>
  );
}
