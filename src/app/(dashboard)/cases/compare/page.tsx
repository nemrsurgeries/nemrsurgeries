import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/modules/auth/session";
import {
  getAuthorizedCasesForComparison,
  listSelectableCasesForComparison,
} from "@/modules/cases/comparison";
import { CaseComparisonClient } from "@/components/cases/case-comparison-client";
import { getServerI18n } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";

export default async function CompareCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const [{ user }, { ids }, { dict }] = await Promise.all([
    requireSession(),
    searchParams,
    getServerI18n(),
  ]);
  const requestedIds = (ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const [selectable, compared] = await Promise.all([
    listSelectableCasesForComparison(user.id),
    getAuthorizedCasesForComparison(user.id, requestedIds),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ms-2 mb-1">
          <Link href="/cases">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {dict.detail.backToCases}
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {dict.pages.compareTitle}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {dict.pages.compareDesc}
        </p>
      </div>

      <CaseComparisonClient
        selectable={selectable}
        selectedIds={compared.map((c) => c.id)}
        compared={compared}
      />
    </div>
  );
}
