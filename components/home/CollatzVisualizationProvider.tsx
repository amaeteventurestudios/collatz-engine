"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  useEstimatedLiveCollatz,
  type DisplayMode,
  type EstimatedLiveCollatzResult,
} from "@/hooks/useEstimatedLiveCollatz";

const CollatzVisualizationContext =
  createContext<EstimatedLiveCollatzResult | null>(null);

export function CollatzVisualizationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [mode, setMode] = useState<DisplayMode>("estimated_live");
  const live = useEstimatedLiveCollatz(mode, setMode);
  const value = useMemo(() => live, [live]);

  return (
    <CollatzVisualizationContext.Provider value={value}>
      {children}
    </CollatzVisualizationContext.Provider>
  );
}

export function useCollatzVisualization(): EstimatedLiveCollatzResult {
  const context = useContext(CollatzVisualizationContext);
  if (!context) {
    throw new Error(
      "useCollatzVisualization must be used inside CollatzVisualizationProvider",
    );
  }
  return context;
}

export type { DisplayMode };
