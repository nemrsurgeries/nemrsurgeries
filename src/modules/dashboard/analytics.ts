import { db } from "@/lib/db";
import { SURGICAL_ROLE_LABELS } from "@/modules/cases/labels";

export interface AnalyticsBucket {
  label: string;
  count: number;
}

export interface DashboardAnalytics {
  byProcedure: AnalyticsBucket[];
  byClassification: AnalyticsBucket[];
  byHospital: AnalyticsBucket[];
  byYear: AnalyticsBucket[];
  byRole: AnalyticsBucket[];
}

export function aggregateCounts(
  values: (string | null | undefined)[],
  limit = 8,
): AnalyticsBucket[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

/**
 * Computes personal dashboard analytics strictly from cases owned by `userId`.
 * Shared cases are never included in personal ownership analytics.
 */
export async function getOwnedCaseAnalytics(
  userId: string,
): Promise<DashboardAnalytics> {
  const cases = await db.surgicalCase.findMany({
    where: {
      ownerId: userId,
      status: { not: "ARCHIVED" },
    },
    select: {
      procedure: true,
      fractureClassification: true,
      hospital: true,
      operationDate: true,
      createdAt: true,
      myRole: true,
    },
  });

  const years = cases.map((c) =>
    String((c.operationDate ?? c.createdAt).getFullYear()),
  );
  const roles = cases.map((c) =>
    c.myRole ? SURGICAL_ROLE_LABELS[c.myRole] : null,
  );

  const byYear = aggregateCounts(years, 10).sort((a, b) =>
    a.label.localeCompare(b.label),
  );

  return {
    byProcedure: aggregateCounts(
      cases.map((c) => c.procedure),
      8,
    ),
    byClassification: aggregateCounts(
      cases.map((c) => c.fractureClassification),
      8,
    ),
    byHospital: aggregateCounts(
      cases.map((c) => c.hospital),
      8,
    ),
    byYear,
    byRole: aggregateCounts(roles, 5),
  };
}
