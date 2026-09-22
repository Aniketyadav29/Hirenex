import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HireNex — AI Career Intelligence Platform",
    template: "%s | HireNex",
  },
  description:
    "Prepare for your career with AI-powered mock interviews, resume analysis, skill gap detection, and personalized learning roadmaps.",
  keywords: [
    "AI interview practice",
    "resume analyzer",
    "skill gap analysis",
    "mock interview",
    "career intelligence",
    "job preparation",
  ],
  openGraph: {
    title: "HireNex — AI Career Intelligence Platform",
    description:
      "Ace your next interview with AI-powered coaching, resume analysis, and skill gap detection.",
    type: "website",
    locale: "en_US",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
