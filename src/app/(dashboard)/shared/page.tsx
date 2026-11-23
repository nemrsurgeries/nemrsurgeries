import Link from "next/link";
import { Search, Users } from "lucide-react";
import { requireSession } from "@/modules/auth/session";
import { listSharedWithMeCases } from "@/modules/sharing/service";
import { CASE_STATUS_META } from "@/modules/cases/labels";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default async function SharedWithMePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { user } = await requireSession();
  const { q } = await searchParams;
  const shares = await listSharedWithMeCases(user.id, q);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Shared with Me
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Surgical cases explicitly shared with you by colleagues. These remain
          owned by their respective doctors and are kept separate from your
          personal library.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form action="/shared" method="GET" className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search shared cases by Case ID, diagnosis, procedure, or classification..."
                className="ps-9"
              />
            </div>
            <Button type="submit" size="sm">
              Search
            </Button>
            {q && (
              <Button asChild variant="outline" size="sm">
                <Link href="/shared">Clear</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {shares.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-3">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              {q ? "No matching shared cases" : "No cases shared with you yet"}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              When a colleague explicitly shares an individual surgical case
              with you, it will appear here with your assigned Viewer or Editor
              permission.
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
                <Card className="h-full transition-colors group-hover:border-blue-300">
                  <CardContent className="flex h-full flex-col justify-between gap-3 p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-blue-700">
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
                            {share.permission}
                          </Badge>
                          <Badge variant={statusMeta.variant}>
                            {statusMeta.label}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 line-clamp-2">
                          {c.diagnosis || "Untitled diagnosis"}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {c.procedure || "No procedure recorded"}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-2.5 text-xs text-slate-500 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Owner: {c.owner.name}</span>
                        <span>{formatDate(c.operationDate)}</span>
                      </div>
                      {c.fractureClassification && (
                        <p className="text-[11px] text-slate-400">
                          Classification: {c.fractureClassification}
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
