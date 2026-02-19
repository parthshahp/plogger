export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

export function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function setStoredTheme(theme: Theme) {
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function toggleTheme(theme: Theme): Theme {
  const nextTheme: Theme = theme === "light" ? "dark" : "light";
  applyTheme(nextTheme);
  setStoredTheme(nextTheme);
  return nextTheme;
}
