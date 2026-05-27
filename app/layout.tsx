import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
  : undefined;

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "The Collatz Engine",
    template: "%s | The Collatz Engine",
  },
  description:
    "A public autonomous system exploring the Collatz Conjecture through persistent computation, live trajectory visualization, and transparent engine records.",
  keywords: [
    "Collatz Conjecture",
    "3n + 1 problem",
    "mathematics",
    "computational exploration",
    "autonomous engine",
    "trajectory visualization",
    "stopping time",
    "number theory",
    "public research dashboard",
    "mathematical observatory",
  ],
  applicationName: "The Collatz Engine",
  authors: [{ name: "Amaete Umanah" }],
  creator: "Amaete Umanah",
  publisher: "The Collatz Engine",
  openGraph: {
    title: "The Collatz Engine",
    description:
      "A public autonomous system exploring one of mathematics' most famous unsolved problems through live computation, persistent records, and transparent visualizations.",
    url: siteUrl,
    siteName: "The Collatz Engine",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Collatz Engine",
    description:
      "Live computation, trajectory visualization, and public records from an autonomous Collatz Conjecture exploration engine.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
