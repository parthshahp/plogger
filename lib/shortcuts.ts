export type ShortcutCombo = {
  key: string;
  metaOrCtrl?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  preventDefault?: boolean;
  allowInInput?: boolean;
};

export const SHORTCUTS = {
  toggleSidebar: {
    key: "[",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    preventDefault: true,
    allowInInput: false,
  } satisfies ShortcutCombo,
  openCommandMenu: {
    key: "k",
    metaOrCtrl: true,
    altKey: false,
    shiftKey: false,
    preventDefault: true,
    allowInInput: false,
  } satisfies ShortcutCombo,
  openStartTimer: {
    key: "e",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    preventDefault: true,
    allowInInput: false,
  } satisfies ShortcutCombo,
  goToWorkspace: {
    key: "w",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    preventDefault: true,
    allowInInput: false,
  } satisfies ShortcutCombo,
  goToTags: {
    key: "t",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    preventDefault: true,
    allowInInput: false,
  } satisfies ShortcutCombo,
  goToReport: {
    key: "r",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    preventDefault: true,
    allowInInput: false,
  } satisfies ShortcutCombo,
} as const;
