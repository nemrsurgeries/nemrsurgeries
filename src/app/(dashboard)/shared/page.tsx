import Link from "next/link";
import { Search, Users } from "lucide-react";
import { requireSession } from "@/modules/auth/session";
import { listSharedWithMeCases } from "@/modules/sharing/service";
import { CASE_STATUS_META } from "@/modules/cases/labels";
import {
  CaseStatusText,
  LocalizedDate,
  LocalizedInput,
  T,
} from "@/components/i18n/t";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function SharedWithMePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ user }, { q }] = await Promise.all([requireSession(), searchParams]);
  const shares = await listSharedWithMeCases(user.id, q);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          <T k="pages.sharedTitle" />
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          <T k="pages.sharedDesc" />
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form action="/shared" method="GET" className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <LocalizedInput
                id="shared-search"
                name="q"
                defaultValue={q ?? ""}
                placeholderKey="cases.searchPlaceholder"
                ariaLabelKey="common.search"
                className="ps-9"
              />
            </div>
            <Button type="submit" size="sm">
              <T k="common.search" />
            </Button>
            {q && (
              <Button asChild variant="outline" size="sm">
                <Link href="/shared">
                  <T k="common.clear" />
                </Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {shares.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mb-3">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {q ? (
                <T k="cases.noMatchingCases" />
              ) : (
                <T k="pages.sharedEmpty" />
              )}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              <T k="pages.sharedDesc" />
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shares.map((share) => {
            const c = share.surgicalCase;
            const statusMeta = CASE_STATUS_META[c.status];
            return (
              <Link key={share.id} href={`/cases/${c.id}`} className="group block">
                <Card className="h-full transition-colors group-hover:border-blue-300 dark:group-hover:border-blue-700">
                  <CardContent className="flex h-full flex-col justify-between gap-3 p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                          {c.caseNumber}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              share.permission === "EDITOR"
                                ? "default"
                                : "outline"
                            }
                          >
                            {share.permission === "EDITOR" ? (
                              <T k="common.editor" />
                            ) : (
                              <T k="common.viewer" />
                            )}
                          </Badge>
                          <Badge variant={statusMeta.variant}>
                            <CaseStatusText status={c.status} />
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 line-clamp-2">
                          {c.diagnosis || <T k="dashboard.untitledDiagnosis" />}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {c.procedure || <T k="common.none" />}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>
                          <T k="common.owner" />: {c.owner.name}
                        </span>
                        <span>
                          <LocalizedDate value={c.operationDate} />
                        </span>
                      </div>
                      {c.fractureClassification && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {c.fractureClassification}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
