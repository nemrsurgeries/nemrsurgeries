import { db } from "@/lib/db";
import { authorizeCaseAccess } from "@/modules/authorization/policy";

/**
 * Fetches up to 4 surgical cases for side-by-side comparison.
 * Verifies CASE_VIEW authorization for every requested ID individually so
 * unauthorized or revoked cases can never be compared.
 */
export async function getAuthorizedCasesForComparison(
  userId: string,
  caseIds: string[],
) {
  const uniqueIds = Array.from(new Set(caseIds.filter(Boolean))).slice(0, 4);
  if (uniqueIds.length === 0) return [];

  const checks = await Promise.all(
    uniqueIds.map(async (id) => ({
      id,
      authz: await authorizeCaseAccess(userId, id, "CASE_VIEW"),
    })),
  );

  const authorizedIds = checks
    .filter((c) => c.authz.allowed)
    .map((c) => c.id);

  if (authorizedIds.length === 0) return [];

  return db.surgicalCase.findMany({
    where: { id: { in: authorizedIds } },
    select: {
      id: true,
      caseNumber: true,
      operationDate: true,
      diagnosis: true,
      procedure: true,
      fractureClassification: true,
      classificationSystem: true,
      surgeon: true,
      myRole: true,
      hospital: true,
      status: true,
      learningPoints: true,
      owner: { select: { name: true } },
      implants: {
        select: {
          id: true,
          implantType: true,
          manufacturer: true,
          model: true,
          specifications: true,
        },
      },
      followups: {
        orderBy: { followupDate: "desc" },
        take: 3,
        select: {
          id: true,
          followupDate: true,
          clinicalOutcome: true,
          radiologicalOutcome: true,
          complications: true,
        },
      },
    },
  });
}

export async function listSelectableCasesForComparison(userId: string) {
  const [owned, shared] = await Promise.all([
    db.surgicalCase.findMany({
      where: { ownerId: userId, status: { not: "ARCHIVED" } },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        caseNumber: true,
        diagnosis: true,
        procedure: true,
      },
    }),
    db.caseShare.findMany({
      where: { sharedWithUserId: userId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        surgicalCase: {
          select: {
            id: true,
            caseNumber: true,
            diagnosis: true,
            procedure: true,
          },
        },
      },
    }),
  ]);

  return [
    ...owned.map((c) => ({ ...c, source: "Owned" as const })),
    ...shared.map((s) => ({ ...s.surgicalCase, source: "Shared" as const })),
  ];
}
