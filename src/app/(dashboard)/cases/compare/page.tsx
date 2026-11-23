import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/modules/auth/session";
import {
  getAuthorizedCasesForComparison,
  listSelectableCasesForComparison,
} from "@/modules/cases/comparison";
import { CaseComparisonClient } from "@/components/cases/case-comparison-client";
import { Button } from "@/components/ui/button";

export default async function CompareCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { user } = await requireSession();
  const { ids } = await searchParams;
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
            <ArrowLeft className="h-4 w-4" />
            Back to My Cases
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Case Comparison
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Compare diagnoses, fracture classifications, implants, follow-up
          outcomes, and learning points side by side.
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
