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
import { CASE_STATUS_META, getCaseStatusLabel } from "@/modules/cases/labels";
import { getServerI18n } from "@/lib/i18n/server";
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
  const [{ user }, { locale, dict }] = await Promise.all([
    requireSession(),
    getServerI18n(),
  ]);
  const [{ stats, recentCreated, recentUpdated }, analytics] = await Promise.all(
    [getDashboardOverview(user.id), getOwnedCaseAnalytics(user.id)],
  );

  const ownedMetrics = [
    { label: dict.dashboard.totalOwned, value: stats.totalOwned, href: "/cases" },
    {
      label: dict.dashboard.completedCases,
      value: stats.completedOwned,
      href: "/cases?status=COMPLETED",
    },
    {
      label: dict.dashboard.draftCases,
      value: stats.draftOwned,
      href: "/cases?status=DRAFT",
    },
    {
      label: dict.dashboard.awaitingFollowup,
      value: stats.awaitingFollowup,
      href: "/cases?status=AWAITING_FOLLOWUP",
    },
  ];

  const collabAndFollowupMetrics = [
    {
      label: dict.dashboard.upcomingFollowups30d,
      value: stats.upcomingFollowups,
      href: "/follow-ups",
      icon: CalendarClock,
      tone: "text-blue-700 dark:text-blue-400",
    },
    {
      label: dict.dashboard.overdueFollowups,
      value: stats.overdueFollowups,
      href: "/follow-ups",
      icon: AlertCircle,
      tone: stats.overdueFollowups > 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400",
    },
    {
      label: dict.dashboard.sharedWithMe,
      value: stats.sharedWithMeCount,
      href: "/shared",
      icon: FolderKanban,
      tone: "text-slate-600 dark:text-slate-300",
    },
    {
      label: dict.dashboard.sharedByMe,
      value: stats.sharedByMeCount,
      href: "/shared-by-me",
      icon: Clock,
      tone: "text-slate-600 dark:text-slate-300",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {dict.dashboard.welcomeBack} {user.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {dict.dashboard.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/invitations">
              <MailPlus className="h-4 w-4" />
              {dict.dashboard.inviteColleague}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/cases/new">
              <Plus className="h-4 w-4" />
              {dict.dashboard.newCase}
            </Link>
          </Button>
        </div>
      </div>

      {/* Personal Owned Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ownedMetrics.map((m) => (
          <Link key={m.label} href={m.href} className="group block">
            <Card className="transition-colors group-hover:border-blue-300 dark:group-hover:border-blue-700">
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
              <Card className="transition-colors group-hover:border-blue-300 dark:group-hover:border-blue-700">
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
              <CardTitle>{dict.dashboard.recentlyCreated}</CardTitle>
              <CardDescription>
                {dict.dashboard.recentlyCreatedDesc}
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/cases">{dict.common.viewAll}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentCreated.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {dict.dashboard.noCasesYet}.{" "}
                <Link
                  href="/cases/new"
                  className="font-medium text-blue-700 dark:text-blue-400 hover:underline"
                >
                  {dict.dashboard.createFirstCase}
                </Link>
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentCreated.map((c) => {
                  const meta = CASE_STATUS_META[c.status];
                  return (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 -mx-2 px-2 rounded-md transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                            {c.caseNumber}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {formatDate(c.operationDate ?? c.createdAt, undefined, locale)}
                          </span>
                        </div>
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                          {c.diagnosis || dict.dashboard.untitledDiagnosis}
                        </p>
                      </div>
                      <Badge variant={meta.variant}>
                        {getCaseStatusLabel(c.status, locale)}
                      </Badge>
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
              <CardTitle>{dict.dashboard.recentlyUpdated}</CardTitle>
              <CardDescription>
                {dict.dashboard.recentlyUpdatedDesc}
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/cases?sort=updated_desc">{dict.common.viewAll}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentUpdated.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {dict.dashboard.noCasesYet}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentUpdated.map((c) => {
                  const meta = CASE_STATUS_META[c.status];
                  return (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 -mx-2 px-2 rounded-md transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                            {c.caseNumber}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {formatDate(c.updatedAt, undefined, locale)}
                          </span>
                        </div>
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                          {c.diagnosis || dict.dashboard.untitledDiagnosis}
                        </p>
                      </div>
                      <Badge variant={meta.variant}>
                        {getCaseStatusLabel(c.status, locale)}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Personal Analytics Charts */}
      <DashboardAnalyticsCharts analytics={analytics} dict={dict} />
    </div>
  );
}
