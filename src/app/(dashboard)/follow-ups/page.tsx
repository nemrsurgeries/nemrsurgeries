import Link from "next/link";
import { AlertCircle, CalendarClock, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/modules/auth/session";
import { CASE_STATUS_META } from "@/modules/cases/labels";
import { Bilingual, CaseStatusText, LocalizedDate, T } from "@/components/i18n/t";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function FollowupsPage() {
  const { user } = await requireSession();
  const now = new Date();

  const [overdueCases, upcomingCases, recentFollowups] = await Promise.all([
    db.surgicalCase.findMany({
      where: {
        ownerId: user.id,
        status: { notIn: ["COMPLETED", "ARCHIVED"] },
        nextFollowupDate: { lt: now },
      },
      orderBy: { nextFollowupDate: "asc" },
      select: {
        id: true,
        caseNumber: true,
        diagnosis: true,
        procedure: true,
        status: true,
        nextFollowupDate: true,
      },
    }),
    db.surgicalCase.findMany({
      where: {
        ownerId: user.id,
        status: { notIn: ["COMPLETED", "ARCHIVED"] },
        nextFollowupDate: { gte: now },
      },
      orderBy: { nextFollowupDate: "asc" },
      take: 25,
      select: {
        id: true,
        caseNumber: true,
        diagnosis: true,
        procedure: true,
        status: true,
        nextFollowupDate: true,
      },
    }),
    db.caseFollowup.findMany({
      where: {
        surgicalCase: { ownerId: user.id },
      },
      orderBy: { followupDate: "desc" },
      take: 20,
      include: {
        surgicalCase: {
          select: { id: true, caseNumber: true, diagnosis: true },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          <T k="pages.followupsTitle" />
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          <T k="pages.followupsDesc" />
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className={overdueCases.length > 0 ? "border-red-200 dark:border-red-800/70" : undefined}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <CardTitle>
                <T k="pages.overdueSection" /> ({overdueCases.length})
              </CardTitle>
            </div>
            <CardDescription>
              <T k="pages.followupsDesc" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overdueCases.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                <T k="pages.noOverdue" />
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {overdueCases.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 -mx-2 px-2 rounded"
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                        {c.caseNumber}
                      </span>
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {c.diagnosis || <T k="dashboard.untitledDiagnosis" />}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      <LocalizedDate value={c.nextFollowupDate} />
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <CalendarClock className="h-4 w-4" />
              <CardTitle>
                <T k="pages.upcomingSection" /> ({upcomingCases.length})
              </CardTitle>
            </div>
            <CardDescription>
              <T k="pages.followupsDesc" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingCases.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                <T k="pages.noUpcoming" />
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {upcomingCases.map((c) => {
                  const meta = CASE_STATUS_META[c.status];
                  return (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 -mx-2 px-2 rounded"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                            {c.caseNumber}
                          </span>
                          <Badge variant={meta.variant}>
                            <CaseStatusText status={c.status} />
                          </Badge>
                        </div>
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                          {c.diagnosis || <T k="dashboard.untitledDiagnosis" />}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <LocalizedDate value={c.nextFollowupDate} />
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <CardTitle>
              <Bilingual
                en="Recent Follow-up Entries"
                ar="أحدث زيارات المتابعة المسجلة"
              />
            </CardTitle>
          </div>
          <CardDescription>
            <Bilingual
              en="Latest documented clinical and radiological follow-up outcomes."
              ar="آخر النتائج الإكلينيكية ونتائج الأشعة المسجلة في المتابعات."
            />
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentFollowups.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              <Bilingual
                en="No follow-up visits recorded yet. Open any case to add a follow-up entry."
                ar="لم تُسجل زيارات متابعة بعد. افتح أي حالة لإضافة زيارة متابعة."
              />
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentFollowups.map((f) => (
                <Link
                  key={f.id}
                  href={`/cases/${f.surgicalCase.id}`}
                  className="block py-3 hover:bg-slate-50 dark:hover:bg-slate-800/70 -mx-2 px-2 rounded"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                      {f.surgicalCase.caseNumber} —{" "}
                      {f.surgicalCase.diagnosis || (
                        <T k="dashboard.untitledDiagnosis" />
                      )}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      <LocalizedDate value={f.followupDate} />
                    </span>
                  </div>
                  {f.clinicalOutcome && (
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                      {f.clinicalOutcome}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
