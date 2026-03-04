import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThemeColor = {
  id: string;
  label: string;
  primary: string; // HSL values only (no "hsl()")
  primaryForeground: string;
  ring: string;
  accent: string;
  accentForeground: string;
};

export const THEMES: ThemeColor[] = [
  {
    id: "orange",
    label: "Laranja",
    primary: "10 99% 55%",
    primaryForeground: "0 0% 100%",
    ring: "10 99% 55%",
    accent: "10 99% 55%",
    accentForeground: "0 0% 100%",
  },
  {
    id: "pink",
    label: "Rosa",
    primary: "330 100% 71%",
    primaryForeground: "0 0% 10%",
    ring: "330 100% 71%",
    accent: "330 100% 71%",
    accentForeground: "0 0% 10%",
  },
  {
    id: "cyan",
    label: "Ciano",
    primary: "191 100% 50%",
    primaryForeground: "0 0% 5%",
    ring: "191 100% 50%",
    accent: "191 100% 50%",
    accentForeground: "0 0% 5%",
  },
  {
    id: "mint",
    label: "Menta",
    primary: "160 100% 45%",
    primaryForeground: "0 0% 5%",
    ring: "160 100% 45%",
    accent: "160 100% 45%",
    accentForeground: "0 0% 5%",
  },
  {
    id: "yellow",
    label: "Amarelo",
    primary: "48 100% 50%",
    primaryForeground: "0 0% 5%",
    ring: "48 100% 50%",
    accent: "48 100% 50%",
    accentForeground: "0 0% 5%",
  },
  {
    id: "purple",
    label: "Roxo",
    primary: "248 100% 60%",
    primaryForeground: "0 0% 100%",
    ring: "248 100% 60%",
    accent: "248 100% 60%",
    accentForeground: "0 0% 100%",
  },
  {
    id: "lime",
    label: "Lima",
    primary: "84 100% 50%",
    primaryForeground: "0 0% 5%",
    ring: "84 100% 50%",
    accent: "84 100% 50%",
    accentForeground: "0 0% 5%",
  },
];

const THEME_KEY = "fitsoul-theme";
const MODE_KEY = "fitsoul-mode"; // "dark" | "light"

export function applyThemeToCss(theme: ThemeColor) {
  const root = document.documentElement;
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--primary-foreground", theme.primaryForeground);
  root.style.setProperty("--ring", theme.ring);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-foreground", theme.accentForeground);
  root.style.setProperty("--sidebar-primary", theme.primary);
  root.style.setProperty("--sidebar-ring", theme.ring);
}

export function applyModeToCss(mode: "dark" | "light") {
  const root = document.documentElement;
  if (mode === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
  }
}

export function useTheme() {
  const [activeThemeId, setActiveThemeId] = useState<string>(() => {
    return localStorage.getItem(THEME_KEY) ?? "orange";
  });
  const [mode, setModeState] = useState<"dark" | "light">(() => {
    return (localStorage.getItem(MODE_KEY) as "dark" | "light") ?? "dark";
  });

  // Apply CSS on mount from localStorage (fast — no flicker)
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) ?? "orange";
    const savedMode = (localStorage.getItem(MODE_KEY) as "dark" | "light") ?? "dark";
    const theme = THEMES.find((t) => t.id === savedTheme) ?? THEMES[0];
    applyThemeToCss(theme);
    applyModeToCss(savedMode);
    setActiveThemeId(savedTheme);
    setModeState(savedMode);
  }, []);

  // Load from DB on mount and sync localStorage
  useEffect(() => {
    let cancelled = false;
    async function loadFromDb() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data } = await supabase
        .from("profiles")
        .select("theme_color")
        .eq("user_id", user.id)
        .single();

      if (cancelled || !data?.theme_color) return;

      const dbTheme = data.theme_color;
      const localTheme = localStorage.getItem(THEME_KEY) ?? "orange";

      // DB is the source of truth when they differ
      if (dbTheme !== localTheme) {
        localStorage.setItem(THEME_KEY, dbTheme);
        setActiveThemeId(dbTheme);
        const theme = THEMES.find((t) => t.id === dbTheme) ?? THEMES[0];
        applyThemeToCss(theme);
      }
    }
    loadFromDb();
    return () => { cancelled = true; };
  }, []);

  const setTheme = useCallback(async (id: string) => {
    // Apply immediately — no wait for DB
    localStorage.setItem(THEME_KEY, id);
    setActiveThemeId(id);
    const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
    applyThemeToCss(theme);

    // Persist to DB in background
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ theme_color: id })
      .eq("user_id", user.id);
  }, []);

  const setMode = useCallback((newMode: "dark" | "light") => {
    localStorage.setItem(MODE_KEY, newMode);
    setModeState(newMode);
    applyModeToCss(newMode);
  }, []);

  return { activeThemeId, setTheme, themes: THEMES, mode, setMode };
}
