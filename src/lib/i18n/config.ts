export type Locale = "en" | "ar";

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "orthocase-locale";
export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "ar"] as const;

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ar";
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}
