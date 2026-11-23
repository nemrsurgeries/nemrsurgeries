"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { useTheme, type Theme } from "./theme-provider";

export function ThemeToggle({ className }: { className?: string }) {
  const { toggleTheme } = useTheme();
  const { dict } = useLocale();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dict.common.toggleTheme}
      title={dict.common.toggleTheme}
      className={cn(
        "relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer",
        className,
      )}
    >
      <Moon className="h-4 w-4 transition-all duration-300 rotate-0 scale-100 opacity-100 dark:-rotate-90 dark:scale-0 dark:opacity-0" />
      <Sun className="absolute h-4 w-4 transition-all duration-300 rotate-90 scale-0 opacity-0 dark:rotate-0 dark:scale-100 dark:opacity-100" />
    </button>
  );
}

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const { dict } = useLocale();

  const options: {
    value: Theme;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { value: "light", label: dict.common.light, icon: Sun },
    { value: "dark", label: dict.common.dark, icon: Moon },
    { value: "system", label: dict.common.system, icon: Monitor },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={dict.pages.appearanceTitle}
      className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800/80"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
              active
                ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-950 dark:text-slate-100"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
