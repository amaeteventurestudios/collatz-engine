import type { Metadata } from "next";
import { VisualStudioPage } from "@/components/visual-studio/VisualStudioPage";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Collatz Visual Studio",
  description:
    "Interactive 3D views of computed Collatz trajectory behavior from the public engine.",
};

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col dark:bg-slate-950">
      <Header />
      <main className="flex-1">
        <VisualStudioPage />
      </main>
      <Footer />
    </div>
  );
}
