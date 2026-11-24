"use client";

import type { ComponentProps } from "react";
import type { AuditAction, CaseStatus, MediaCategory } from "@prisma/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  getAuditActionLabel,
  getCaseStatusLabel,
  getMediaCategoryLabel,
} from "@/modules/cases/labels";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useLocale } from "./locale-provider";

type DictSection = keyof Dictionary;
export type TranslationKey = {
  [S in DictSection]: `${S}.${Extract<keyof Dictionary[S], string>}`;
}[DictSection];

function lookupKey(dict: Dictionary, key: TranslationKey): string {
  const [section, field] = key.split(".") as [DictSection, string];
  const group = dict[section] as Record<string, string>;
  return group[field] ?? key;
}

/**
 * Renders a dictionary string reactively from LocaleProvider so language
 * switches happen instantaneously without re-running Server Components.
 */
export function T({ k }: { k: TranslationKey }) {
  const { dict } = useLocale();
  return <>{lookupKey(dict, k)}</>;
}

/**
 * Inline bilingual text helper for strings not in the shared dictionary.
 */
export function Bilingual({ en, ar }: { en: string; ar: string }) {
  const { locale } = useLocale();
  return <>{locale === "ar" ? ar : en}</>;
}

export function LocalizedDate({
  value,
  options,
}: {
  value: Date | string | null | undefined;
  options?: Intl.DateTimeFormatOptions;
}) {
  const { locale } = useLocale();
  return <>{formatDate(value, options, locale)}</>;
}

export function CaseStatusText({ status }: { status: CaseStatus }) {
  const { locale } = useLocale();
  return <>{getCaseStatusLabel(status, locale)}</>;
}

export function MediaCategoryText({ category }: { category: MediaCategory }) {
  const { locale } = useLocale();
  return <>{getMediaCategoryLabel(category, locale)}</>;
}

export function AuditActionText({ action }: { action: AuditAction }) {
  const { locale } = useLocale();
  return <>{getAuditActionLabel(action, locale)}</>;
}

export function LocalizedInput({
  placeholderKey,
  ariaLabelKey,
  ...props
}: Omit<ComponentProps<typeof Input>, "placeholder" | "aria-label"> & {
  placeholderKey?: TranslationKey;
  ariaLabelKey?: TranslationKey;
}) {
  const { dict } = useLocale();
  return (
    <Input
      {...props}
      placeholder={placeholderKey ? lookupKey(dict, placeholderKey) : undefined}
      aria-label={ariaLabelKey ? lookupKey(dict, ariaLabelKey) : undefined}
    />
  );
}
