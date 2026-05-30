"use client";

import { useCollatzSelectedTrajectory } from "@/hooks/useCollatzSelectedTrajectory";
import { useCollatzAnalyticsData } from "@/hooks/useCollatzAnalyticsData";
import { LiveDescentProfile } from "@/components/collatz/LiveDescentProfile";
import { PeakGrowthGraph } from "@/components/collatz/PeakGrowthGraph";
import { StoppingTimeGraph } from "@/components/collatz/StoppingTimeGraph";
import { OddEvenTransitionGraph } from "@/components/collatz/OddEvenTransitionGraph";
import {
  AllTimeEngineRecords,
  RecordBreakerTimeline,
  RecordLeaderboards,
} from "@/components/collatz/RecordBreakerTimeline";

export function TrajectoryIntelligenceSection() {
  const { result, loading: trajectoryLoading } = useCollatzSelectedTrajectory();

  const {
    chartResults,
    topBySteps,
    topByPeak,
    loading: analyticsLoading,
  } = useCollatzAnalyticsData(500, 100);

  return (
    <>
      <LiveDescentProfile result={result} loading={trajectoryLoading} />
      <PeakGrowthGraph
        results={chartResults}
        topByPeak={topByPeak}
        loading={analyticsLoading}
      />
      <StoppingTimeGraph
        results={chartResults}
        topBySteps={topBySteps}
        loading={analyticsLoading}
      />
      <OddEvenTransitionGraph result={result} loading={trajectoryLoading} />
      <RecordBreakerTimeline
        topBySteps={topBySteps}
        topByPeak={topByPeak}
        loading={analyticsLoading}
      />
      <AllTimeEngineRecords />
      <RecordLeaderboards
        topBySteps={topBySteps}
        topByPeak={topByPeak}
        loading={analyticsLoading}
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
