"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChartColumnIcon,
  HomeIcon,
  TagsIcon,
} from "lucide-react";
import CommandMenu from "@/components/command-menu";
import ThemeToggle from "@/components/theme-toggle";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { SHORTCUTS } from "@/lib/shortcuts";
import { Kbd } from "@/components/ui/kbd";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

function isActive(pathname: string, href: string) {
  const normalizedHref = href.split("?")[0];
  if (normalizedHref === "/") return pathname === normalizedHref;
  return pathname === normalizedHref || pathname.startsWith(`${normalizedHref}/`);
}

const NAV_ITEMS = [
  { href: "/?view=list", label: "Workspace", icon: HomeIcon, shortcut: "W" },
  { href: "/tags", label: "Tags", icon: TagsIcon, shortcut: "T" },
  { href: "/report", label: "Report", icon: ChartColumnIcon, shortcut: "R" },
];

export default function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  useKeyboardShortcuts(
    useMemo(
      () => [
        {
          ...SHORTCUTS.toggleSidebar,
          onKeyDown: () => {
            toggleSidebar();
          },
        },
        {
          ...SHORTCUTS.goToWorkspace,
          onKeyDown: () => {
            router.push("/?view=list");
          },
        },
        {
          ...SHORTCUTS.goToTags,
          onKeyDown: () => {
            router.push("/tags");
          },
        },
        {
          ...SHORTCUTS.goToReport,
          onKeyDown: () => {
            router.push("/report");
          },
        },
      ],
      [router, toggleSidebar]
    )
  );

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg border bg-card" />
          <div>
            <p className="text-sm font-semibold">Plogger</p>
            <p className="text-xs text-sidebar-foreground/70">Local-first time tracking</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          {NAV_ITEMS.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={isActive(pathname, item.href)}>
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                  <Kbd className="ml-auto opacity-0 transition-opacity group-hover/menu-item:opacity-100 group-focus-within/menu-item:opacity-100">
                    {item.shortcut}
                  </Kbd>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2">
          <CommandMenu />
          <ThemeToggle />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
