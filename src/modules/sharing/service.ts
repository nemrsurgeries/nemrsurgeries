import { db } from "@/lib/db";

export async function searchRegisteredDoctors(
  requesterId: string,
  query: string,
) {
  const q = query.trim();
  if (q.length < 2) return [];

  return db.user.findMany({
    where: {
      id: { not: requesterId },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      professionalTitle: true,
      hospital: true,
    },
    take: 10,
    orderBy: { name: "asc" },
  });
}

export async function listSharedWithMeCases(userId: string, query?: string) {
  const q = query?.trim();

  return db.caseShare.findMany({
    where: {
      sharedWithUserId: userId,
      revokedAt: null,
      surgicalCase: q
        ? {
            OR: [
              { caseNumber: { contains: q, mode: "insensitive" } },
              { diagnosis: { contains: q, mode: "insensitive" } },
              { procedure: { contains: q, mode: "insensitive" } },
              { fractureClassification: { contains: q, mode: "insensitive" } },
              { hospital: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
    },
    orderBy: { createdAt: "desc" },
    include: {
      surgicalCase: {
        select: {
          id: true,
          caseNumber: true,
          diagnosis: true,
          procedure: true,
          fractureClassification: true,
          classificationSystem: true,
          operationDate: true,
          hospital: true,
          status: true,
          updatedAt: true,
          owner: {
            select: {
              id: true,
              name: true,
              professionalTitle: true,
              hospital: true,
            },
          },
        },
      },
    },
  });
}

export async function listSharedByMeCases(userId: string) {
  return db.surgicalCase.findMany({
    where: {
      ownerId: userId,
      OR: [
        { shares: { some: { revokedAt: null } } },
        {
          pendingShares: {
            some: {
              activatedAt: null,
              cancelledAt: null,
              invitation: { status: "PENDING" },
            },
          },
        },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      caseNumber: true,
      diagnosis: true,
      procedure: true,
      status: true,
      operationDate: true,
      shares: {
        where: { revokedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          permission: true,
          createdAt: true,
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
          createdAt: true,
          invitation: {
            select: {
              id: true,
              email: true,
              expiresAt: true,
            },
          },
        },
      },
    },
  });
}
