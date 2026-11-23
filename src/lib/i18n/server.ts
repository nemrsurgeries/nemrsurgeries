import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  getDirection,
  isLocale,
  type Locale,
} from "./config";
import { getDictionary, type Dictionary } from "./dictionaries";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getServerI18n(): Promise<{
  locale: Locale;
  dir: "ltr" | "rtl";
  isRtl: boolean;
  dict: Dictionary;
}> {
  const locale = await getServerLocale();
  const dir = getDirection(locale);
  return {
    locale,
    dir,
    isRtl: locale === "ar",
    dict: getDictionary(locale),
  };
}
