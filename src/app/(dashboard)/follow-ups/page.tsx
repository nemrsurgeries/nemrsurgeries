import Link from "next/link";
import { AlertCircle, CalendarClock, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/modules/auth/session";
import { CASE_STATUS_META } from "@/modules/cases/labels";
import { formatDate } from "@/lib/utils";
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
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Follow-ups
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Track overdue schedules, upcoming postoperative visits, and recent
          recorded outcomes for your owned cases.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className={overdueCases.length > 0 ? "border-red-200" : undefined}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <CardTitle>Overdue Follow-ups ({overdueCases.length})</CardTitle>
            </div>
            <CardDescription>
              Cases whose scheduled follow-up date has passed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overdueCases.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No overdue follow-ups.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {overdueCases.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded"
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-semibold text-blue-700">
                        {c.caseNumber}
                      </span>
                      <p className="truncate text-sm font-medium text-slate-900">
                        {c.diagnosis || "Untitled diagnosis"}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      Due {formatDate(c.nextFollowupDate)}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-blue-700">
              <CalendarClock className="h-4 w-4" />
              <CardTitle>
                Upcoming Follow-ups ({upcomingCases.length})
              </CardTitle>
            </div>
            <CardDescription>
              Scheduled postoperative follow-up visits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingCases.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No upcoming follow-up dates scheduled.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {upcomingCases.map((c) => {
                  const meta = CASE_STATUS_META[c.status];
                  return (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-blue-700">
                            {c.caseNumber}
                          </span>
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </div>
                        <p className="truncate text-sm font-medium text-slate-900 mt-0.5">
                          {c.diagnosis || "Untitled diagnosis"}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                        {formatDate(c.nextFollowupDate)}
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
          <div className="flex items-center gap-2 text-slate-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <CardTitle>Recent Follow-up Entries</CardTitle>
          </div>
          <CardDescription>
            Latest documented clinical and radiological follow-up outcomes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentFollowups.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No follow-up visits recorded yet. Open any case to add a follow-up
              entry.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentFollowups.map((f) => (
                <Link
                  key={f.id}
                  href={`/cases/${f.surgicalCase.id}`}
                  className="block py-3 hover:bg-slate-50 -mx-2 px-2 rounded"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-semibold text-blue-700">
                      {f.surgicalCase.caseNumber} —{" "}
                      {f.surgicalCase.diagnosis || "Untitled"}
                    </span>
                    <span className="text-slate-500">
                      {formatDate(f.followupDate)}
                    </span>
                  </div>
                  {f.clinicalOutcome && (
                    <p className="mt-1 text-sm text-slate-700 line-clamp-2">
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
