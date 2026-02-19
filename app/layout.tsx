import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import EntriesNavLink from "@/components/entries-nav-link";
import ThemeToggle from "@/components/theme-toggle";
import "./globals.css";
import SwRegister from "./sw-register";
import SyncClient from "./sync-client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Plogger",
    template: "%s | Plogger",
  },
  description: "Local-first time tracking with a single active timer.",
  applicationName: "Plogger",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Plogger",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SwRegister />
        <SyncClient />
        <div className="min-h-screen">
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg border bg-card" />
                <div>
                  <p className="text-lg font-semibold">Plogger</p>
                  <p className="text-xs text-muted-foreground">
                    Local-first time tracking
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <nav className="flex items-center gap-4 text-sm">
                  <Link
                    className="text-muted-foreground hover:text-foreground"
                    href="/"
                  >
                    Dashboard
                  </Link>
                  <EntriesNavLink />
                  <Link
                    className="text-muted-foreground hover:text-foreground"
                    href="/tags"
                  >
                    Tags
                  </Link>
                  <Link
                    className="text-muted-foreground hover:text-foreground"
                    href="/report"
                  >
                    Report
                  </Link>
                </nav>
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
