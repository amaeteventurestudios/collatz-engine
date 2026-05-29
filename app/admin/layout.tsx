import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Admin | The Collatz Engine",
  robots: { index: false, follow: false },
};

// Minimal wrapper — layout per-section is handled by route groups:
//   app/admin/(dashboard)/layout.tsx  → authenticated pages (sidebar)
//   app/admin/login/page.tsx          → login page (no sidebar)
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
