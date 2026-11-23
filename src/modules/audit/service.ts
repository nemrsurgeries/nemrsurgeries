import type { AuditAction, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const FORBIDDEN_METADATA_KEYS = new Set([
  "password",
  "token",
  "tokenhash",
  "signedurl",
  "patientname",
  "nationalid",
  "phone",
  "intraoperativenotes",
  "postoperativeplan",
  "learningpoints",
  "diagnosis",
  "clinicaloutcome",
  "radiologicaloutcome",
]);

/**
 * Strips any potentially sensitive keys before persisting operational audit metadata.
 */
export function sanitizeAuditMetadata(
  metadata?: Record<string, unknown> | null,
): Prisma.InputJsonValue | undefined {
  if (!metadata) return undefined;

  const clean: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (FORBIDDEN_METADATA_KEYS.has(key.toLowerCase())) {
      continue;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      clean[key] = value;
    }
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

export async function recordAuditLog(params: {
  userId?: string | null;
  caseId?: string | null;
  action: AuditAction;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  await db.auditLog.create({
    data: {
      userId: params.userId ?? null,
      caseId: params.caseId ?? null,
      action: params.action,
      metadata: sanitizeAuditMetadata(params.metadata),
    },
  });
}
