import type { Metadata } from "next";
import { VisualStudioPage } from "@/components/visual-studio/VisualStudioPage";

export const metadata: Metadata = {
  title: "Collatz Visual Studio",
  description:
    "Interactive 3D views of computed Collatz trajectory behavior from the public engine.",
};

export default function Page() {
  return <VisualStudioPage />;
}
