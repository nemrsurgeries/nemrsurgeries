"use client";

import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";
import { useLocale } from "./locale-provider";

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, dict, toggleLocale } = useLocale();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={dict.common.toggleLanguage}
      title={dict.common.toggleLanguage}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer",
        className,
      )}
    >
      <Languages className="h-3.5 w-3.5 shrink-0" />
      <span>
        {locale === "ar"
          ? dict.common.switchToEnglish
          : dict.common.switchToArabic}
      </span>
    </button>
  );
}

const LANGUAGE_OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
];

export function LanguageSelector() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800/80"
    >
      {LANGUAGE_OPTIONS.map((option) => {
        const active = locale === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLocale(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
              active
                ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-950 dark:text-slate-100"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
