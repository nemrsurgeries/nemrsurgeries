import Link from "next/link";
import { GitCompareArrows, Plus } from "lucide-react";
import { requireSession } from "@/modules/auth/session";
import { caseListFilterSchema } from "@/modules/cases/schemas";
import { listOwnedCases } from "@/modules/cases/service";
import { CaseLibraryClient } from "@/components/cases/case-library-client";
import { Button } from "@/components/ui/button";

export default async function MyCasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireSession();
  const rawParams = await searchParams;

  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    flat[key] = Array.isArray(value) ? value[0] : value;
  }

  const parsed = caseListFilterSchema.safeParse(flat);
  const filters = parsed.success
    ? parsed.data
    : { sort: "updated_desc" as const, page: 1, pageSize: 12 };

  const result = await listOwnedCases(user.id, filters);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            My Cases
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Your private surgical case library. Only cases owned by you appear
            here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/cases/compare">
              <GitCompareArrows className="h-4 w-4" />
              Compare
            </Link>
          </Button>
          <Button asChild>
            <Link href="/cases/new">
              <Plus className="h-4 w-4" />
              New Surgical Case
            </Link>
          </Button>
        </div>
      </div>

      <CaseLibraryClient
        items={result.items}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        hospitals={result.hospitals}
        initialFilters={{
          q: filters.q,
          status: filters.status,
          myRole: filters.myRole,
          hospital: filters.hospital,
          surgeon: filters.surgeon,
          procedure: filters.procedure,
          dateFrom: filters.dateFrom ?? undefined,
          dateTo: filters.dateTo ?? undefined,
          sort: filters.sort,
        }}
      />
    </div>
  );
}
