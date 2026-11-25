import Link from "next/link";
import { Activity } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/modules/auth/session";
import { AuditActionText, LocalizedDate, T } from "@/components/i18n/t";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ActivityLogPage() {
  const { user } = await requireSession();

  const logs = await db.auditLog.findMany({
    where: {
      OR: [{ userId: user.id }, { surgicalCase: { ownerId: user.id } }],
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      user: { select: { id: true, name: true } },
      surgicalCase: { select: { id: true, caseNumber: true } },
    },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          <T k="pages.activityTitle" />
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          <T k="pages.activityDesc" />
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Activity className="h-4 w-4 text-blue-700 dark:text-blue-400" />
            <CardTitle>
              <T k="pages.activityTitle" />
            </CardTitle>
          </div>
          <CardDescription>
            <T k="pages.activityDesc" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              <T k="pages.noActivity" />
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="text-sm">
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      <AuditActionText action={log.action} />
                    </span>
                    {log.surgicalCase && (
                      <>
                        {" "}
                        &middot;{" "}
                        <Link
                          href={`/cases/${log.surgicalCase.id}`}
                          className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                        >
                          {log.surgicalCase.caseNumber}
                        </Link>
                      </>
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-400 ms-2">
                      {log.user?.name ?? <T k="common.system" />}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                    <LocalizedDate
                      value={log.createdAt}
                      options={{
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }}
                    />
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
