import type { SharePermission } from "@prisma/client";
import { db } from "@/lib/db";

export type EffectiveCaseRole = "OWNER" | "EDITOR" | "VIEWER" | "NONE";

export type CaseAction =
  | "CASE_VIEW"
  | "CASE_EDIT"
  | "CASE_DELETE"
  | "CASE_ARCHIVE"
  | "CASE_SHARE"
  | "CASE_MANAGE_SHARES"
  | "CASE_EXPORT_PDF"
  | "MEDIA_UPLOAD"
  | "MEDIA_VIEW"
  | "MEDIA_DELETE"
  | "FOLLOWUP_MANAGE"
  | "LAB_MANAGE"
  | "IMPLANT_MANAGE";

export interface CaseAuthorizationResult {
  allowed: boolean;
  role: EffectiveCaseRole;
  /** HTTP status to return when denied: 404 hides case existence (anti-IDOR), 403 for known shared users lacking permission */
  statusCode: 200 | 403 | 404;
  caseOwnerId?: string;
}

const ROLE_ACTIONS: Record<Exclude<EffectiveCaseRole, "NONE">, ReadonlySet<CaseAction>> = {
  OWNER: new Set<CaseAction>([
    "CASE_VIEW",
    "CASE_EDIT",
    "CASE_DELETE",
    "CASE_ARCHIVE",
    "CASE_SHARE",
    "CASE_MANAGE_SHARES",
    "CASE_EXPORT_PDF",
    "MEDIA_UPLOAD",
    "MEDIA_VIEW",
    "MEDIA_DELETE",
    "FOLLOWUP_MANAGE",
    "LAB_MANAGE",
    "IMPLANT_MANAGE",
  ]),
  EDITOR: new Set<CaseAction>([
    "CASE_VIEW",
    "CASE_EDIT",
    "CASE_EXPORT_PDF",
    "MEDIA_UPLOAD",
    "MEDIA_VIEW",
    "MEDIA_DELETE",
    "FOLLOWUP_MANAGE",
    "LAB_MANAGE",
    "IMPLANT_MANAGE",
  ]),
  VIEWER: new Set<CaseAction>(["CASE_VIEW", "CASE_EXPORT_PDF", "MEDIA_VIEW"]),
};

/**
 * Pure permission evaluation helper (easily unit-tested without DB).
 */
export function evaluateCasePermission(params: {
  userId: string;
  caseOwnerId: string | null;
  activeSharePermission: SharePermission | null;
  action: CaseAction;
  mediaUploadedBy?: string | null;
}): CaseAuthorizationResult {
  const { userId, caseOwnerId, activeSharePermission, action, mediaUploadedBy } = params;

  if (!caseOwnerId) {
    return { allowed: false, role: "NONE", statusCode: 404 };
  }

  let role: EffectiveCaseRole = "NONE";
  if (caseOwnerId === userId) {
    role = "OWNER";
  } else if (activeSharePermission === "EDITOR") {
    role = "EDITOR";
  } else if (activeSharePermission === "VIEWER") {
    role = "VIEWER";
  }

  if (role === "NONE") {
    // Return 404 instead of 403 so unauthorized users cannot enumerate case IDs
    return { allowed: false, role: "NONE", statusCode: 404 };
  }

  // Additional guard: Editors can only delete attachments they uploaded themselves
  if (
    role === "EDITOR" &&
    action === "MEDIA_DELETE" &&
    mediaUploadedBy !== undefined &&
    mediaUploadedBy !== userId
  ) {
    return { allowed: false, role, statusCode: 403, caseOwnerId };
  }

  const allowed = ROLE_ACTIONS[role].has(action);
  return {
    allowed,
    role,
    statusCode: allowed ? 200 : 403,
    caseOwnerId,
  };
}

export class AuthorizationError extends Error {
  readonly statusCode: 401 | 403 | 404;

  constructor(message: string, statusCode: 401 | 403 | 404) {
    super(message);
    this.name = "AuthorizationError";
    this.statusCode = statusCode;
  }
}

/**
 * Centralized server-side case authorization check against PostgreSQL.
 * Always derives ownership and active sharing directly from the database.
 */
export async function authorizeCaseAccess(
  userId: string,
  caseId: string,
  action: CaseAction,
  options?: { mediaUploadedBy?: string | null },
): Promise<CaseAuthorizationResult> {
  if (!userId || !caseId) {
    return { allowed: false, role: "NONE", statusCode: 404 };
  }

  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      ownerId: true,
      shares: {
        where: {
          sharedWithUserId: userId,
          revokedAt: null,
        },
        select: { permission: true },
        take: 1,
      },
    },
  });

  if (!surgicalCase) {
    return { allowed: false, role: "NONE", statusCode: 404 };
  }

  const activeSharePermission = surgicalCase.shares[0]?.permission ?? null;

  return evaluateCasePermission({
    userId,
    caseOwnerId: surgicalCase.ownerId,
    activeSharePermission,
    action,
    mediaUploadedBy: options?.mediaUploadedBy,
  });
}

/**
 * Throws AuthorizationError (404 or 403) if the user is not authorized.
 */
export async function requireCaseAccess(
  userId: string,
  caseId: string,
  action: CaseAction,
  options?: { mediaUploadedBy?: string | null },
): Promise<CaseAuthorizationResult> {
  const result = await authorizeCaseAccess(userId, caseId, action, options);
  if (!result.allowed) {
    throw new AuthorizationError(
      result.statusCode === 404
        ? "Surgical case not found"
        : "You do not have permission to perform this action on this case",
      result.statusCode === 404 ? 404 : 403,
    );
  }
  return result;
}
