import type { Metadata, Viewport } from "next";
import { Geist, Newsreader } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";
import { getSiteUrl } from "@/lib/env";
import { cn } from "@/lib/utils";

import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: "Afgekia — Thoughtful business assistance", template: "%s — Afgekia" },
  description: "Calm project support, practical business assistance, and clear communication for work that matters.",
  applicationName: "Afgekia",
  openGraph: { type: "website", siteName: "Afgekia", locale: "en_US" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#f7f2e8", colorScheme: "light" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn(geist.variable, newsreader.variable)}>
      <body><TooltipProvider>{children}</TooltipProvider></body>
    </html>
  );
}
