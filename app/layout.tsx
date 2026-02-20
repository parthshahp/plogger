import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppSidebar from "@/components/app-sidebar";
import ThemeToggle from "@/components/theme-toggle";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="flex items-center justify-between px-4 py-3 md:px-6">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarTrigger />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <kbd className="inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                      [
                    </kbd>
                  </TooltipContent>
                </Tooltip>
                <div className="flex items-center gap-2 md:hidden">
                  <ThemeToggle />
                </div>
              </div>
            </header>
            <main className="mx-auto w-full max-w-5xl px-6 py-10">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
