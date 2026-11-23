import type {
  AnalyticsBucket,
  DashboardAnalytics,
} from "@/modules/dashboard/analytics";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function HorizontalBarCard({
  title,
  description,
  emptyLabel,
  buckets,
}: {
  title: string;
  description: string;
  emptyLabel: string;
  buckets: AnalyticsBucket[];
}) {
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {buckets.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            {emptyLabel}
          </p>
        ) : (
          <div className="space-y-2.5">
            {buckets.map((b) => {
              const pct = Math.max(6, Math.round((b.count / max) * 100));
              return (
                <div key={b.label} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                      {b.label}
                    </span>
                    <span className="shrink-0 tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {b.count}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-blue-700/85 dark:bg-blue-500/85"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardAnalyticsCharts({
  analytics,
  dict = getDictionary("en"),
}: {
  analytics: DashboardAnalytics;
  dict?: Dictionary;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {dict.dashboard.analyticsTitle}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {dict.dashboard.analyticsDesc}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <HorizontalBarCard
          title={dict.dashboard.byProcedure}
          description={dict.dashboard.byProcedureDesc}
          emptyLabel={dict.dashboard.noDataYet}
          buckets={analytics.byProcedure}
        />
        <HorizontalBarCard
          title={dict.dashboard.byClassification}
          description={dict.dashboard.byClassificationDesc}
          emptyLabel={dict.dashboard.noDataYet}
          buckets={analytics.byClassification}
        />
        <HorizontalBarCard
          title={dict.dashboard.byRole}
          description={dict.dashboard.byRoleDesc}
          emptyLabel={dict.dashboard.noDataYet}
          buckets={analytics.byRole}
        />
        <HorizontalBarCard
          title={dict.dashboard.byHospital}
          description={dict.dashboard.byHospitalDesc}
          emptyLabel={dict.dashboard.noDataYet}
          buckets={analytics.byHospital}
        />
        <HorizontalBarCard
          title={dict.dashboard.byYear}
          description={dict.dashboard.byYearDesc}
          emptyLabel={dict.dashboard.noDataYet}
          buckets={analytics.byYear}
        />
      </div>
    </div>
  );
}
