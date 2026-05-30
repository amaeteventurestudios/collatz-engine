"use client";

import { useCollatzVisualization } from "@/components/home/CollatzVisualizationProvider";
import { LiveDescentProfile } from "@/components/collatz/LiveDescentProfile";
import { PeakGrowthGraph } from "@/components/collatz/PeakGrowthGraph";
import { StoppingTimeGraph } from "@/components/collatz/StoppingTimeGraph";
import { OddEvenTransitionGraph } from "@/components/collatz/OddEvenTransitionGraph";
import {
  AllTimeEngineRecords,
  RecordLeaderboards,
} from "@/components/collatz/RecordBreakerTimeline";

export function TrajectoryIntelligenceSection() {
  const {
    mode,
    result,
    label,
    helperCopy,
    isEstimated,
    peakGrowthWindow,
    stoppingTimeWindow,
    topBySteps,
    topByPeak,
    loading,
  } = useCollatzVisualization();

  return (
    <>
      <LiveDescentProfile
        result={result}
        mode={mode}
        displayLabel={label}
        helperCopy={helperCopy}
        isEstimated={isEstimated}
        loading={loading}
      />
      <PeakGrowthGraph
        results={peakGrowthWindow}
        mode={mode}
        displayLabel={label}
        isEstimated={isEstimated}
        loading={loading}
      />
      <StoppingTimeGraph
        results={stoppingTimeWindow}
        mode={mode}
        displayLabel={label}
        isEstimated={isEstimated}
        loading={loading}
      />
      <OddEvenTransitionGraph
        result={result}
        mode={mode}
        displayLabel={label}
        isEstimated={isEstimated}
        loading={loading}
      />
      <AllTimeEngineRecords />
      <RecordLeaderboards
        topBySteps={topBySteps}
        topByPeak={topByPeak}
        loading={loading}
      />

      {/* Section integrity note */}
      <div className="px-4 pb-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
            This engine records computational observations only. It does not claim to prove the Collatz Conjecture.
          </p>
        </div>
      </div>
    </>
  );
}
