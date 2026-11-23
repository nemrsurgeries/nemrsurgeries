"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LOCALE_COOKIE,
  getDirection,
  type Locale,
} from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";

interface LocaleContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  isRtl: boolean;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);

  const setLocale = React.useCallback(
    (next: Locale) => {
      if (next === locale) return;
      setLocaleState(next);
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
      document.documentElement.dir = getDirection(next);
      router.refresh();
    },
    [locale, router],
  );

  const toggleLocale = React.useCallback(() => {
    setLocale(locale === "ar" ? "en" : "ar");
  }, [locale, setLocale]);

  const value = React.useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: getDirection(locale),
      isRtl: locale === "ar",
      dict: getDictionary(locale),
      setLocale,
      toggleLocale,
    }),
    [locale, setLocale, toggleLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = React.useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}
