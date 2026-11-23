import Link from "next/link";
import {
  AlertCircle,
  CalendarClock,
  Clock,
  FolderKanban,
  MailPlus,
  Plus,
} from "lucide-react";
import { requireSession } from "@/modules/auth/session";
import { getDashboardOverview } from "@/modules/cases/service";
import { getOwnedCaseAnalytics } from "@/modules/dashboard/analytics";
import { DashboardAnalyticsCharts } from "@/components/charts/dashboard-analytics-charts";
import { CASE_STATUS_META } from "@/modules/cases/labels";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const { user } = await requireSession();
  const [{ stats, recentCreated, recentUpdated }, analytics] = await Promise.all(
    [getDashboardOverview(user.id), getOwnedCaseAnalytics(user.id)],
  );

  const ownedMetrics = [
    { label: "Total Cases Owned", value: stats.totalOwned, href: "/cases" },
    {
      label: "Completed Cases",
      value: stats.completedOwned,
      href: "/cases?status=COMPLETED",
    },
    {
      label: "Draft Cases",
      value: stats.draftOwned,
      href: "/cases?status=DRAFT",
    },
    {
      label: "Awaiting Follow-up",
      value: stats.awaitingFollowup,
      href: "/cases?status=AWAITING_FOLLOWUP",
    },
  ];

  const collabAndFollowupMetrics = [
    {
      label: "Upcoming Follow-ups (30d)",
      value: stats.upcomingFollowups,
      href: "/follow-ups",
      icon: CalendarClock,
      tone: "text-blue-700",
    },
    {
      label: "Overdue Follow-ups",
      value: stats.overdueFollowups,
      href: "/follow-ups",
      icon: AlertCircle,
      tone: stats.overdueFollowups > 0 ? "text-red-600" : "text-slate-500",
    },
    {
      label: "Shared with Me",
      value: stats.sharedWithMeCount,
      href: "/shared",
      icon: FolderKanban,
      tone: "text-slate-600",
    },
    {
      label: "Shared by Me",
      value: stats.sharedByMeCount,
      href: "/shared-by-me",
      icon: Clock,
      tone: "text-slate-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back, {user.name}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Personal surgical case overview. Shared cases are tracked separately
            from your owned statistics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/invitations">
              <MailPlus className="h-4 w-4" />
              Invite Colleague
            </Link>
          </Button>
          <Button asChild>
            <Link href="/cases/new">
              <Plus className="h-4 w-4" />
              New Case
            </Link>
          </Button>
        </div>
      </div>

      {/* Personal Owned Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ownedMetrics.map((m) => (
          <Link key={m.label} href={m.href} className="group block">
            <Card className="transition-colors group-hover:border-blue-300">
              <CardHeader className="pb-3">
                <CardDescription>{m.label}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {m.value}
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {/* Follow-up & Collaboration Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {collabAndFollowupMetrics.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.label} href={m.href} className="group block">
              <Card className="transition-colors group-hover:border-blue-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardDescription>{m.label}</CardDescription>
                    <Icon className={`h-4 w-4 ${m.tone}`} />
                  </div>
                  <CardTitle className="text-2xl font-semibold tabular-nums">
                    {m.value}
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recently Created & Recently Updated */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Recently Created Cases</CardTitle>
              <CardDescription>
                Latest surgical cases added to your personal library.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/cases">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentCreated.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No cases documented yet.{" "}
                <Link
                  href="/cases/new"
                  className="font-medium text-blue-700 hover:underline"
                >
                  Create your first case
                </Link>
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentCreated.map((c) => {
                  const meta = CASE_STATUS_META[c.status];
                  return (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-md transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-blue-700">
                            {c.caseNumber}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatDate(c.operationDate ?? c.createdAt)}
                          </span>
                        </div>
                        <p className="truncate text-sm font-medium text-slate-900 mt-0.5">
                          {c.diagnosis || "Untitled diagnosis"}
                        </p>
                      </div>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Recently Updated Cases</CardTitle>
              <CardDescription>
                Cases with the latest documentation or status changes.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/cases?sort=updated_desc">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentUpdated.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Updated cases will appear here as you document your work.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentUpdated.map((c) => {
                  const meta = CASE_STATUS_META[c.status];
                  return (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-md transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-blue-700">
                            {c.caseNumber}
                          </span>
                          <span className="text-xs text-slate-400">
                            Updated {formatDate(c.updatedAt)}
                          </span>
                        </div>
                        <p className="truncate text-sm font-medium text-slate-900 mt-0.5">
                          {c.diagnosis || "Untitled diagnosis"}
                        </p>
                      </div>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Personal Analytics Charts */}
      <DashboardAnalyticsCharts analytics={analytics} />
    </div>
  );
}
