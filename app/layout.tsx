import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
  themeColor: "#0c121c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100`}
      >
        <SwRegister />
        <SyncClient />
        <div className="min-h-screen">
          <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-800" />
                <div>
                  <p className="text-lg font-semibold">Plogger</p>
                  <p className="text-xs text-slate-400">
                    Local-first time tracking
                  </p>
                </div>
              </div>
              <nav className="flex items-center gap-4 text-sm">
                <Link className="text-slate-200 hover:text-white" href="/">
                  Dashboard
                </Link>
                <Link className="text-slate-200 hover:text-white" href="/entries">
                  Entries
                </Link>
                <Link className="text-slate-200 hover:text-white" href="/tags">
                  Tags
                </Link>
                <Link className="text-slate-200 hover:text-white" href="/report">
                  Report
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
