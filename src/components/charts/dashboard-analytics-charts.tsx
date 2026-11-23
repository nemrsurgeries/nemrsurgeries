import type {
  AnalyticsBucket,
  DashboardAnalytics,
} from "@/modules/dashboard/analytics";
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
  buckets,
}: {
  title: string;
  description: string;
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
          <p className="py-6 text-center text-xs text-slate-400">
            No data recorded yet
          </p>
        ) : (
          <div className="space-y-2.5">
            {buckets.map((b) => {
              const pct = Math.max(6, Math.round((b.count / max) * 100));
              return (
                <div key={b.label} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-slate-700">
                      {b.label}
                    </span>
                    <span className="shrink-0 tabular-nums font-semibold text-slate-900">
                      {b.count}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-700/85"
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
}: {
  analytics: DashboardAnalytics;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Personal Surgical Analytics
        </h2>
        <p className="text-xs text-slate-500">
          Aggregated exclusively from your personally owned cases.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <HorizontalBarCard
          title="Cases by Procedure"
          description="Most frequent procedures documented"
          buckets={analytics.byProcedure}
        />
        <HorizontalBarCard
          title="Cases by Fracture Classification"
          description="Distribution across recorded classifications"
          buckets={analytics.byClassification}
        />
        <HorizontalBarCard
          title="Cases by My Surgical Role"
          description="Operator, First Assistant, and Assistant breakdown"
          buckets={analytics.byRole}
        />
        <HorizontalBarCard
          title="Cases by Hospital"
          description="Institutional case volume"
          buckets={analytics.byHospital}
        />
        <HorizontalBarCard
          title="Cases by Year"
          description="Annual surgical volume"
          buckets={analytics.byYear}
        />
      </div>
    </div>
  );
}
