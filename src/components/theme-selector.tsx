"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    accent: string;
    secondary: string;
  };
}

const themes: Theme[] = [
  {
    id: "vibrant",
    name: "Vibrant",
    colors: {
      primary: "oklch(0.65 0.22 280)",
      accent: "oklch(0.68 0.2 15)",
      secondary: "oklch(0.72 0.18 45)",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    colors: {
      primary: "oklch(0.55 0.2 250)",
      accent: "oklch(0.6 0.18 200)",
      secondary: "oklch(0.65 0.15 180)",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    colors: {
      primary: "oklch(0.65 0.22 30)",
      accent: "oklch(0.7 0.2 50)",
      secondary: "oklch(0.6 0.18 10)",
    },
  },
  {
    id: "forest",
    name: "Forest",
    colors: {
      primary: "oklch(0.5 0.2 140)",
      accent: "oklch(0.6 0.18 120)",
      secondary: "oklch(0.55 0.15 100)",
    },
  },
  {
    id: "lavender",
    name: "Lavender",
    colors: {
      primary: "oklch(0.6 0.18 290)",
      accent: "oklch(0.65 0.15 310)",
      secondary: "oklch(0.7 0.12 270)",
    },
  },
  {
    id: "mint",
    name: "Mint",
    colors: {
      primary: "oklch(0.55 0.2 160)",
      accent: "oklch(0.65 0.18 140)",
      secondary: "oklch(0.6 0.15 180)",
    },
  },
];

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeSelector({ isOpen, onClose }: ThemeSelectorProps) {
  const [currentTheme, setCurrentTheme] = useState("vibrant");

  useEffect(() => {
    const saved = localStorage.getItem("selectedTheme");
    if (saved) {
      setCurrentTheme(saved);
      applyTheme(saved);
    }
  }, []);

  const applyTheme = (themeId: string) => {
    const theme = themes.find((t) => t.id === themeId);
    if (!theme) return;

    const root = document.documentElement;
    root.style.setProperty("--primary", theme.colors.primary);
    root.style.setProperty("--accent", theme.colors.accent);
    root.style.setProperty("--secondary", theme.colors.secondary);

    localStorage.setItem("selectedTheme", themeId);
    setCurrentTheme(themeId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-start">
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative m-6 w-80 backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Choose Theme
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => applyTheme(theme.id)}
              className={`p-4 rounded-lg transition-all duration-300 border-2 ${
                currentTheme === theme.id
                  ? "border-primary bg-primary/20"
                  : "border-white/10 hover:border-white/20 bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: `hsl(${theme.colors.primary})` }}
                />
                <span className="text-sm font-medium text-foreground">
                  {theme.name}
                </span>
              </div>
              <div className="flex gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: `hsl(${theme.colors.primary})` }}
                />
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: `hsl(${theme.colors.accent})` }}
                />
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: `hsl(${theme.colors.secondary})` }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
