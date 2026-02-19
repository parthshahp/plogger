"use client";

import { useEffect, useMemo, useState } from "react";
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
import { getPreferredTheme, toggleTheme } from "@/lib/theme";

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]'
    )
  );
}

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k") return;
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.altKey || event.shiftKey) return;
      if (isEditableElement(event.target)) return;

      event.preventDefault();
      setOpen((isOpen) => !isOpen);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

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
            <CommandItem onSelect={() => goTo("/")}>
              <HomeIcon className="size-4" />
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => goTo("/entries")}>
              <CalendarIcon className="size-4" />
              Entries
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

          <CommandGroup heading="Entries Views">
            <CommandItem onSelect={() => goTo("/entries?view=list")}>
              <CalendarIcon className="size-4" />
              Entries list view
            </CommandItem>
            <CommandItem onSelect={() => goTo("/entries?view=week")}>
              <CalendarIcon className="size-4" />
              Entries week view
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
