import type React from "react";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepoDownloader - Download GitHub Repositories Instantly",
  description:
    "Search, sort, and download GitHub repositories with ease. Sort by stars or name, preview details, and download as ZIP. Built with Next.js.",
  generator: "v0.app",
  keywords: [
    "GitHub repo downloader",
    "download github repo",
    "repo search",
    "sort by stars",
    "sort by name",
    "nextjs",
    "open source",
  ],
  openGraph: {
    title: "RepoDownloader - Download GitHub Repositories Instantly",
    description:
      "Search, sort, and download GitHub repositories with ease. Sort by stars or name, preview details, and download as ZIP.",
    url: "https://repodownloader.app/",
    siteName: "RepoDownloader",
    images: [
      {
        url: "/favicon.png",
        width: 1200,
        height: 630,
        alt: "RepoDownloader preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RepoDownloader - Download GitHub Repositories Instantly",
    description:
      "Search, sort, and download GitHub repositories with ease. Sort by stars or name, preview details, and download as ZIP.",
    images: ["/favicon.png"],
  },
  icons: {
    icon: "/favicon.png",
  },
  appleWebApp: {
    title: "RepoDownloader",
    statusBarStyle: "default",
  },
  metadataBase: new URL("https://repodownloader.vercel.app/"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`antialiased`}>
      <body className="font-sans">
        <Suspense fallback={<div>Loading...</div>}>
          <Toaster position="bottom-right" richColors />
          {children}
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
