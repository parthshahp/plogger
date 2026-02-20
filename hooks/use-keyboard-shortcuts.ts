"use client";

import { useEffect } from "react";
import type { ShortcutCombo } from "@/lib/shortcuts";

type KeyboardShortcut = ShortcutCombo & {
  onKeyDown: (event: KeyboardEvent) => void;
};

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]'
    )
  );
}

function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut) {
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }

  if (shortcut.metaOrCtrl && !(event.metaKey || event.ctrlKey)) {
    return false;
  }

  if (shortcut.metaKey !== undefined && event.metaKey !== shortcut.metaKey) {
    return false;
  }

  if (shortcut.ctrlKey !== undefined && event.ctrlKey !== shortcut.ctrlKey) {
    return false;
  }

  if (shortcut.altKey !== undefined && event.altKey !== shortcut.altKey) {
    return false;
  }

  if (shortcut.shiftKey !== undefined && event.shiftKey !== shortcut.shiftKey) {
    return false;
  }

  return true;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        if (shortcut.allowInInput !== true && isEditableElement(event.target)) {
          continue;
        }

        if (!matchesShortcut(event, shortcut)) {
          continue;
        }

        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }

        shortcut.onKeyDown(event);
        break;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shortcuts]);
}
