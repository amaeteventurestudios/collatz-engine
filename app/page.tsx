import { Header } from "@/components/layout/Header";
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
import { AIResearchLog } from "@/components/home/AIResearchLog";
import { PatternViews } from "@/components/home/PatternViews";
import { NearEscapeCandidates } from "@/components/home/NearEscapeCandidates";
import { DiscoveryFeed } from "@/components/home/DiscoveryFeed";
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
        <AIResearchLog />
        <PatternViews />
        <NearEscapeCandidates />
        <DiscoveryFeed />
        <AboutSection />
        <DataMethodology />
        <PriorWork />
        <ContributeSection />
      </main>

      <Footer />
    </div>
  );
}
