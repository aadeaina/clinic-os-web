"use client";
import { useEffect } from "react";
import { useSettings, type Background, type Theme } from "@/lib/settings-store";

const DARK_BG: Record<Background, string> = {
  "default":        "none",
  "gradient-tidal": "linear-gradient(135deg, #051122 0%, #0a2240 30%, #0D7377 100%)",
  "gradient-dusk":  "linear-gradient(135deg, #1a0a2e 0%, #2d1b69 50%, #0c1414 100%)",
  "gradient-stone": "linear-gradient(180deg, #1c1c1e 0%, #2c2c2e 60%, #1a1a2a 100%)",
  "mesh":           "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(13,115,119,0.55) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 90%, rgba(20,184,166,0.3) 0%, transparent 55%)",
  "custom":         "none",
};

const LIGHT_BG: Record<Background, string> = {
  "default":        "none",
  "gradient-tidal": "linear-gradient(135deg, #e0f7f5 0%, #b2ebe6 40%, #80d8d1 100%)",
  "gradient-dusk":  "linear-gradient(135deg, #f5eeff 0%, #ddd6fe 50%, #c4b5fd 100%)",
  "gradient-stone": "linear-gradient(180deg, #f5f5f7 0%, #e8e8eb 60%, #d5d5da 100%)",
  "mesh":           "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(13,115,119,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 90%, rgba(20,184,166,0.08) 0%, transparent 55%)",
  "custom":         "none",
};

function getBgCss(theme: Theme, background: Background, customBgImage: string | null): string {
  if (background === "custom" && customBgImage) return `url("${customBgImage}")`;
  return theme === "light" ? LIGHT_BG[background] : DARK_BG[background];
}

export default function ThemeManager() {
  const { theme, background, customBgImage, accentColor } = useSettings();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accentColor);
  }, [accentColor]);

  useEffect(() => {
    document.body.style.backgroundImage = getBgCss(theme, background, customBgImage);
  }, [theme, background, customBgImage]);

  return null;
}
