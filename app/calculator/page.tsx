import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CollatzCalculatorPage } from "@/components/calculator/CollatzCalculatorPage";

export const metadata: Metadata = {
  title: "Collatz Calculator | 3n + 1 Sequence Visualizer",
  description:
    "Use the Collatz Calculator to explore any 3n + 1 sequence with step-by-step results, trajectory graphs, stopping time, peak value, and parity analysis.",
  keywords: [
    "Collatz calculator",
    "Collatz Conjecture calculator",
    "3n+1 calculator",
    "3n + 1 sequence",
    "Collatz sequence",
    "hailstone sequence calculator",
    "stopping time calculator",
    "Collatz trajectory graph",
    "Syracuse problem calculator",
  ],
  openGraph: {
    title: "Collatz Calculator | The Collatz Engine",
    description:
      "Explore Collatz sequences with detailed steps, trajectory graphs, stopping time, highest peak, and parity analysis.",
    images: [{ url: "/images/collatz-preview.jpg" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Collatz Calculator | The Collatz Engine",
    description:
      "Explore Collatz sequences with detailed steps, trajectory graphs, stopping time, highest peak, and parity analysis.",
    images: ["/images/collatz-preview.jpg"],
  },
  alternates: {
    canonical: "/calculator",
  },
};

export default function CalculatorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#020617]">
      <Header />
      <main className="flex-1">
        <CollatzCalculatorPage />
      </main>
      <Footer />
    </div>
  );
}
