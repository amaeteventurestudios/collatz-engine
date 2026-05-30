import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "The Collatz Engine | Autonomous Collatz Conjecture Explorer",
  description:
    "A public autonomous system exploring the Collatz Conjecture through persistent computation, live telemetry, transparent records, and visual analysis.",
  openGraph: {
    title: "The Collatz Engine | Autonomous Collatz Conjecture Explorer",
    description:
      "A public autonomous system exploring the Collatz Conjecture through persistent computation, live telemetry, transparent records, and visual analysis.",
    images: [{ url: "/images/collatz-preview.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Collatz Engine | Autonomous Collatz Conjecture Explorer",
    description:
      "A public autonomous system exploring the Collatz Conjecture through persistent computation, live telemetry, transparent records, and visual analysis.",
    images: ["/images/collatz-preview.jpg"],
  },
};
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { StatusStrip } from "@/components/home/StatusStrip";
import { LiveEngineStatus } from "@/components/home/LiveEngineStatus";
import { TrajectorySection } from "@/components/home/TrajectorySection";
import { TrajectoryIntelligenceSection } from "@/components/collatz/TrajectoryIntelligenceSection";
import { RecordsPreview } from "@/components/home/RecordsPreview";
import { MilestoneFeed } from "@/components/home/MilestoneFeed";
import { VerificationPanel } from "@/components/home/VerificationPanel";
import { HowItWorks } from "@/components/home/HowItWorks";
import { AIObservatorySection } from "@/components/ai/AIObservatorySection";
import { PatternViews } from "@/components/home/PatternViews";
import { NearEscapeCandidates } from "@/components/home/NearEscapeCandidates";
import { LatestMeaningfulEvents } from "@/components/home/LatestMeaningfulEvents";
import { AboutSection } from "@/components/home/AboutSection";
import { DataMethodology } from "@/components/home/DataMethodology";
import { PriorWork } from "@/components/home/PriorWork";
import { ContributeSection } from "@/components/home/ContributeSection";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <HeroSection />
        <StatusStrip />
        <LiveEngineStatus />
        <TrajectorySection />
        <TrajectoryIntelligenceSection />
        <RecordsPreview />
        <MilestoneFeed />
        <VerificationPanel />
        <HowItWorks />
        <AIObservatorySection />
        <PatternViews />
        <NearEscapeCandidates />
        <LatestMeaningfulEvents />
        <AboutSection />
        <DataMethodology />
        <PriorWork />
        <ContributeSection />
      </main>

      <Footer />
    </div>
  );
}
