"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarIcon,
  ChartColumnIcon,
  HomeIcon,
  MoonStarIcon,
  SearchIcon,
  SunIcon,
  TagsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { SHORTCUTS } from "@/lib/shortcuts";
import { getPreferredTheme, toggleTheme } from "@/lib/theme";

export default function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [themeLabel, setThemeLabel] = useState<"Dark" | "Light">(() => {
    const preferredTheme = getPreferredTheme();
    return preferredTheme === "light" ? "Dark" : "Light";
  });

  const shortcutLabel = useMemo(() => {
    if (typeof navigator === "undefined") return "Ctrl+K";
    return navigator.platform.toLowerCase().includes("mac") ? "⌘K" : "Ctrl+K";
  }, []);

  useKeyboardShortcuts(
    useMemo(
      () => [
        {
          ...SHORTCUTS.openCommandMenu,
          onKeyDown: () => {
            setOpen((isOpen) => !isOpen);
          },
        },
      ],
      []
    )
  );

  const goTo = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onToggleTheme = () => {
    const nextTheme = toggleTheme(getPreferredTheme());
    setThemeLabel(nextTheme === "light" ? "Dark" : "Light");
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        aria-label="Open command menu"
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="size-4" />
        <span className="hidden md:inline">Command</span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
          {shortcutLabel}
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command Menu"
        description="Search for a page or action."
      >
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => goTo("/?view=list")}>
              <HomeIcon className="size-4" />
              Workspace
            </CommandItem>
            <CommandItem onSelect={() => goTo("/tags")}>
              <TagsIcon className="size-4" />
              Tags
            </CommandItem>
            <CommandItem onSelect={() => goTo("/report")}>
              <ChartColumnIcon className="size-4" />
              Report
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Workspace Views">
            <CommandItem onSelect={() => goTo("/?view=list")}>
              <CalendarIcon className="size-4" />
              List view
            </CommandItem>
            <CommandItem onSelect={() => goTo("/?view=week")}>
              <CalendarIcon className="size-4" />
              Week view
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Appearance">
            <CommandItem onSelect={onToggleTheme}>
              {themeLabel === "Dark" ? (
                <MoonStarIcon className="size-4" />
              ) : (
                <SunIcon className="size-4" />
              )}
              Toggle theme
              <CommandShortcut>{themeLabel}</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
