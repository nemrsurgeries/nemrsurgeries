"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireApiSession } from "@/modules/auth/session";
import {
  AuthorizationError,
  requireCaseAccess,
} from "@/modules/authorization/policy";
import { recordAuditLog } from "@/modules/audit/service";
import {
  doctorSearchSchema,
  grantCaseShareSchema,
  revokeCaseShareSchema,
  updateSharePermissionSchema,
} from "./schemas";
import { searchRegisteredDoctors } from "./service";

export interface ShareActionResult<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export async function searchDoctorsAction(query: string) {
  const { userId } = await requireApiSession();
  const parsed = doctorSearchSchema.safeParse({ query });
  if (!parsed.success) {
    return { doctors: [] };
  }
  const doctors = await searchRegisteredDoctors(userId, parsed.data.query);
  return { doctors };
}

export async function grantCaseShareAction(
  input: unknown,
): Promise<ShareActionResult> {
  const { userId } = await requireApiSession();
  const parsed = grantCaseShareSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid sharing input.",
    };
  }

  const { caseId, recipientUserId, permission } = parsed.data;

  if (recipientUserId === userId) {
    return {
      success: false,
      error: "You already own this surgical case.",
    };
  }

  try {
    await requireCaseAccess(userId, caseId, "CASE_SHARE");

    const recipient = await db.user.findUnique({
      where: { id: recipientUserId },
      select: { id: true, name: true },
    });
    if (!recipient) {
      return { success: false, error: "Recipient doctor account not found." };
    }

    const existingActive = await db.caseShare.findFirst({
      where: {
        caseId,
        sharedWithUserId: recipientUserId,
        revokedAt: null,
      },
      select: { id: true },
    });

    if (existingActive) {
      return {
        success: false,
        error:
          "This case is already shared with that colleague. You can update their permission below.",
      };
    }

    const surgicalCase = await db.surgicalCase.findUnique({
      where: { id: caseId },
      select: { caseNumber: true },
    });

    await db.$transaction(async (tx) => {
      await tx.caseShare.create({
        data: {
          caseId,
          sharedWithUserId: recipientUserId,
          grantedBy: userId,
          permission,
        },
      });

      await tx.notification.create({
        data: {
          userId: recipientUserId,
          type: "CASE_SHARED",
          title: "Surgical case shared with you",
          message: `Case ${surgicalCase?.caseNumber ?? ""} has been shared with you (${permission.toLowerCase()} access).`,
          caseId,
        },
      });
    });

    await recordAuditLog({
      userId,
      caseId,
      action: "CASE_SHARED",
      metadata: {
        recipientUserId,
        permission,
      },
    });

    revalidatePath(`/cases/${caseId}`);
    revalidatePath("/shared");
    revalidatePath("/shared-by-me");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Unable to share surgical case." };
  }
}

export async function updateCaseSharePermissionAction(
  input: unknown,
): Promise<ShareActionResult> {
  const { userId } = await requireApiSession();
  const parsed = updateSharePermissionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid permission update request." };
  }

  const { caseId, shareId, permission } = parsed.data;

  try {
    await requireCaseAccess(userId, caseId, "CASE_MANAGE_SHARES");

    const share = await db.caseShare.findFirst({
      where: { id: shareId, caseId, revokedAt: null },
      select: { id: true, sharedWithUserId: true, permission: true },
    });

    if (!share) {
      return { success: false, error: "Active sharing record not found." };
    }

    if (share.permission === permission) {
      return { success: true };
    }

    await db.$transaction(async (tx) => {
      await tx.caseShare.update({
        where: { id: share.id },
        data: { permission },
      });

      await tx.notification.create({
        data: {
          userId: share.sharedWithUserId,
          type: "PERMISSION_CHANGED",
          title: "Case permission updated",
          message: `Your access level on a shared surgical case was updated to ${permission.toLowerCase()}.`,
          caseId,
        },
      });
    });

    await recordAuditLog({
      userId,
      caseId,
      action: "PERMISSION_CHANGED",
      metadata: {
        recipientUserId: share.sharedWithUserId,
        previousPermission: share.permission,
        newPermission: permission,
      },
    });

    revalidatePath(`/cases/${caseId}`);
    revalidatePath("/shared");
    revalidatePath("/shared-by-me");

    return { success: true };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Unable to update permission." };
  }
}

export async function revokeCaseShareAction(
  input: unknown,
): Promise<ShareActionResult> {
  const { userId } = await requireApiSession();
  const parsed = revokeCaseShareSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid revocation request." };
  }

  const { caseId, shareId } = parsed.data;

  try {
    await requireCaseAccess(userId, caseId, "CASE_MANAGE_SHARES");

    const share = await db.caseShare.findFirst({
      where: { id: shareId, caseId, revokedAt: null },
      select: { id: true, sharedWithUserId: true },
    });

    if (!share) {
      return { success: false, error: "Active sharing record not found." };
    }

    await db.$transaction(async (tx) => {
      await tx.caseShare.update({
        where: { id: share.id },
        data: { revokedAt: new Date() },
      });

      await tx.notification.create({
        data: {
          userId: share.sharedWithUserId,
          type: "ACCESS_REVOKED",
          title: "Case access revoked",
          message:
            "The case owner revoked your access to a shared surgical case.",
          caseId: null,
        },
      });
    });

    await recordAuditLog({
      userId,
      caseId,
      action: "ACCESS_REVOKED",
      metadata: {
        recipientUserId: share.sharedWithUserId,
      },
    });

    revalidatePath(`/cases/${caseId}`);
    revalidatePath("/shared");
    revalidatePath("/shared-by-me");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Unable to revoke access." };
  }
}
