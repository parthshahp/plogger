"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { applyTheme, getPreferredTheme, toggleTheme, type Theme } from "@/lib/theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getPreferredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const onToggle = () => {
    setTheme((prevTheme) => toggleTheme(prevTheme));
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onToggle}
      aria-label="Toggle theme"
    >
      Theme
    </Button>
  );
}
