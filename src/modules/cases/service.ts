import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { CaseListFilters, PostoperativePlan } from "./schemas";

/**
 * Formats a per-owner sequential case number, e.g. ORTHO-2026-0001.
 */
export function formatCaseNumber(year: number, sequence: number): string {
  return `ORTHO-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Atomically increments the owner's yearly sequence inside a Prisma transaction.
 */
export async function generateNextCaseNumber(
  tx: Prisma.TransactionClient,
  ownerId: string,
  operationDate?: Date | null,
): Promise<string> {
  const year = (operationDate ?? new Date()).getFullYear();

  const counter = await tx.caseSequence.upsert({
    where: { ownerId_year: { ownerId, year } },
    create: { ownerId, year, lastSeq: 1 },
    update: { lastSeq: { increment: 1 } },
    select: { lastSeq: true },
  });

  return formatCaseNumber(year, counter.lastSeq);
}

/**
 * Safely parses stored JSON postoperativePlan into typed fields.
 */
export function parsePostoperativePlan(
  raw: Prisma.JsonValue | null | undefined,
): PostoperativePlan {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      weightBearing: "",
      rehabilitationPlan: "",
      medicationNotes: "",
      followupInstructions: "",
      additionalNotes: "",
    };
  }
  const obj = raw as Record<string, unknown>;
  return {
    weightBearing:
      typeof obj.weightBearing === "string" ? obj.weightBearing : "",
    rehabilitationPlan:
      typeof obj.rehabilitationPlan === "string" ? obj.rehabilitationPlan : "",
    medicationNotes:
      typeof obj.medicationNotes === "string" ? obj.medicationNotes : "",
    followupInstructions:
      typeof obj.followupInstructions === "string"
        ? obj.followupInstructions
        : "",
    additionalNotes:
      typeof obj.additionalNotes === "string" ? obj.additionalNotes : "",
  };
}

/**
 * Builds Prisma WHERE clause for owned cases with search & filter criteria.
 */
export function buildOwnedCasesWhere(
  ownerId: string,
  filters: CaseListFilters,
): Prisma.SurgicalCaseWhereInput {
  const where: Prisma.SurgicalCaseWhereInput = {
    ownerId,
  };

  if (filters.status) {
    where.status = filters.status;
  } else {
    where.status = { not: "ARCHIVED" };
  }

  if (filters.myRole) {
    where.myRole = filters.myRole;
  }

  if (filters.hospital) {
    where.hospital = { contains: filters.hospital, mode: "insensitive" };
  }

  if (filters.surgeon) {
    where.surgeon = { contains: filters.surgeon, mode: "insensitive" };
  }

  if (filters.procedure) {
    where.procedure = { contains: filters.procedure, mode: "insensitive" };
  }

  if (filters.dateFrom || filters.dateTo) {
    where.operationDate = {};
    if (filters.dateFrom) {
      where.operationDate.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      where.operationDate.lte = end;
    }
  }

  if (filters.q) {
    where.OR = [
      { caseNumber: { contains: filters.q, mode: "insensitive" } },
      { diagnosis: { contains: filters.q, mode: "insensitive" } },
      { procedure: { contains: filters.q, mode: "insensitive" } },
      { surgeon: { contains: filters.q, mode: "insensitive" } },
      { hospital: { contains: filters.q, mode: "insensitive" } },
      {
        fractureClassification: {
          contains: filters.q,
          mode: "insensitive",
        },
      },
    ];
  }

  return where;
}

export function buildCasesOrderBy(
  sort: CaseListFilters["sort"],
): Prisma.SurgicalCaseOrderByWithRelationInput[] {
  switch (sort) {
    case "operation_desc":
      return [{ operationDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
    case "operation_asc":
      return [{ operationDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];
    case "case_number_desc":
      return [{ caseNumber: "desc" }];
    case "updated_desc":
    default:
      return [{ updatedAt: "desc" }];
  }
}

export async function listOwnedCases(
  ownerId: string,
  filters: CaseListFilters,
) {
  const where = buildOwnedCasesWhere(ownerId, filters);
  const orderBy = buildCasesOrderBy(filters.sort);
  const skip = (filters.page - 1) * filters.pageSize;

  const [items, total, distinctHospitals] = await Promise.all([
    db.surgicalCase.findMany({
      where,
      orderBy,
      skip,
      take: filters.pageSize,
      select: {
        id: true,
        caseNumber: true,
        operationDate: true,
        patientAge: true,
        patientSex: true,
        diagnosis: true,
        procedure: true,
        fractureClassification: true,
        classificationSystem: true,
        surgeon: true,
        myRole: true,
        hospital: true,
        status: true,
        nextFollowupDate: true,
        updatedAt: true,
        createdAt: true,
        _count: {
          select: {
            media: true,
            followups: true,
            implants: true,
            shares: { where: { revokedAt: null } },
          },
        },
      },
    }),
    db.surgicalCase.count({ where }),
    db.surgicalCase.findMany({
      where: { ownerId, hospital: { not: null } },
      distinct: ["hospital"],
      select: { hospital: true },
      take: 30,
    }),
  ]);

  return {
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    hospitals: distinctHospitals
      .map((h) => h.hospital)
      .filter((h): h is string => Boolean(h)),
  };
}

export async function getCaseDetails(caseId: string) {
  return db.surgicalCase.findUnique({
    where: { id: caseId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          professionalTitle: true,
          hospital: true,
        },
      },
      implants: {
        orderBy: { createdAt: "asc" },
      },
      followups: {
        orderBy: { followupDate: "desc" },
        include: {
          author: { select: { id: true, name: true } },
          attachments: {
            select: {
              id: true,
              originalFilename: true,
              category: true,
              mimeType: true,
            },
          },
        },
      },
      media: {
        orderBy: { createdAt: "desc" },
        include: {
          uploader: { select: { id: true, name: true } },
        },
      },
      labResults: {
        orderBy: { testDate: "desc" },
        include: {
          attachment: {
            select: { id: true, originalFilename: true, mimeType: true },
          },
        },
      },
      shares: {
        where: { revokedAt: null },
        include: {
          sharedWith: {
            select: {
              id: true,
              name: true,
              email: true,
              professionalTitle: true,
              hospital: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      pendingShares: {
        where: {
          activatedAt: null,
          cancelledAt: null,
          invitation: { status: "PENDING" },
        },
        select: {
          id: true,
          permission: true,
          invitation: {
            select: {
              id: true,
              email: true,
              expiresAt: true,
            },
          },
        },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 40,
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function getDashboardOverview(userId: string) {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    totalOwned,
    completedOwned,
    draftOwned,
    awaitingFollowup,
    upcomingFollowups,
    overdueFollowups,
    sharedWithMeCount,
    sharedByMeCount,
    recentCreated,
    recentUpdated,
  ] = await Promise.all([
    db.surgicalCase.count({
      where: { ownerId: userId, status: { not: "ARCHIVED" } },
    }),
    db.surgicalCase.count({
      where: { ownerId: userId, status: "COMPLETED" },
    }),
    db.surgicalCase.count({
      where: { ownerId: userId, status: "DRAFT" },
    }),
    db.surgicalCase.count({
      where: { ownerId: userId, status: "AWAITING_FOLLOWUP" },
    }),
    db.surgicalCase.count({
      where: {
        ownerId: userId,
        status: { notIn: ["COMPLETED", "ARCHIVED"] },
        nextFollowupDate: { gte: now, lte: in30Days },
      },
    }),
    db.surgicalCase.count({
      where: {
        ownerId: userId,
        status: { notIn: ["COMPLETED", "ARCHIVED"] },
        nextFollowupDate: { lt: now },
      },
    }),
    db.caseShare.count({
      where: { sharedWithUserId: userId, revokedAt: null },
    }),
    db.caseShare.count({
      where: { grantedBy: userId, revokedAt: null },
    }),
    db.surgicalCase.findMany({
      where: { ownerId: userId, status: { not: "ARCHIVED" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        caseNumber: true,
        diagnosis: true,
        procedure: true,
        operationDate: true,
        status: true,
        createdAt: true,
      },
    }),
    db.surgicalCase.findMany({
      where: { ownerId: userId, status: { not: "ARCHIVED" } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        caseNumber: true,
        diagnosis: true,
        procedure: true,
        status: true,
        updatedAt: true,
      },
    }),
  ]);

  return {
    stats: {
      totalOwned,
      completedOwned,
      draftOwned,
      awaitingFollowup,
      upcomingFollowups,
      overdueFollowups,
      sharedWithMeCount,
      sharedByMeCount,
    },
    recentCreated,
    recentUpdated,
  };
}
