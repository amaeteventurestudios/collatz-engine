import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { StatusStrip } from "@/components/home/StatusStrip";
import { TrajectoryVisualizer } from "@/components/home/TrajectoryVisualizer";
import { SequenceTrace } from "@/components/home/SequenceTrace";
import { RecordsPreview } from "@/components/home/RecordsPreview";
import { AIResearchLog } from "@/components/home/AIResearchLog";
import { PatternViews } from "@/components/home/PatternViews";
import { AboutSection } from "@/components/home/AboutSection";
import { ContributeSection } from "@/components/home/ContributeSection";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <HeroSection />
        <StatusStrip />
        <TrajectoryVisualizer />
        <SequenceTrace />
        <RecordsPreview />
        <AIResearchLog />
        <PatternViews />
        <AboutSection />
        <ContributeSection />
      </main>

      <Footer />
    </div>
  );
}
