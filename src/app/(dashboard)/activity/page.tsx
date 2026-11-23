import Link from "next/link";
import { Activity } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/modules/auth/session";
import { AUDIT_ACTION_LABELS } from "@/modules/cases/labels";
import { formatDate } from "@/lib/utils";
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
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Activity Log
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Operational audit trail for your account, invitations, sharing events,
          and owned surgical cases. Patient and clinical details are excluded
          from audit metadata.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-slate-800">
            <Activity className="h-4 w-4 text-blue-700" />
            <CardTitle>Recent Security &amp; Case Events</CardTitle>
          </div>
          <CardDescription>Showing up to the latest 60 events.</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No activity recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="text-sm">
                    <span className="font-medium text-slate-900">
                      {AUDIT_ACTION_LABELS[log.action]}
                    </span>
                    {log.surgicalCase && (
                      <>
                        {" "}
                        &middot;{" "}
                        <Link
                          href={`/cases/${log.surgicalCase.id}`}
                          className="font-mono text-xs font-semibold text-blue-700 hover:underline"
                        >
                          {log.surgicalCase.caseNumber}
                        </Link>
                      </>
                    )}
                    <span className="text-xs text-slate-500 ms-2">
                      by {log.user?.name ?? "System"}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {formatDate(log.createdAt, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
