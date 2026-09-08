import type { Metadata, Viewport } from "next";

import { getAppConfig } from "@/lib/server/config";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const config = getAppConfig();
  return {
    title: {
      default: `${config.tagline} | ${config.brandName}`,
      template: `%s | ${config.brandName}`,
    },
    description:
      "Measure your connection: download, upload, latency and jitter. Self-hosted, and it never talks to anything but this server.",
    applicationName: config.brandName,
    manifest: "/manifest.webmanifest",
    icons: { icon: "/favicon.svg" },
    // Nothing here is meant for a search index; instances are usually internal.
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#141526",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
