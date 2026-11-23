import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/env";
import { getEmailService } from "@/lib/email";
import { buildInvitationEmail } from "@/lib/email/templates";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateSecureToken, hashToken } from "@/lib/security/tokens";
import { recordAuditLog } from "@/modules/audit/service";
import { requireCaseAccess } from "@/modules/authorization/policy";
import type { SharePermission } from "@prisma/client";

export type InvitationValidationResult =
  | {
      valid: true;
      invitation: {
        id: string;
        email: string;
        expiresAt: Date;
        inviterName: string;
        inviterHospital: string | null;
        pendingShareCount: number;
      };
    }
  | {
      valid: false;
      reason: "NOT_FOUND" | "EXPIRED" | "ALREADY_USED" | "REVOKED";
      message: string;
    };

const INVITE_RATE_LIMIT_MAX = 15;
const INVITE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function getInvitationExpiryDate(now = new Date()): Date {
  const days = Number(process.env.INVITATION_EXPIRY_DAYS ?? "7") || 7;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Validates a raw invitation token against its stored SHA-256 hash.
 */
export async function validateInvitationToken(
  rawToken: string,
  now = new Date(),
): Promise<InvitationValidationResult> {
  if (!rawToken || rawToken.length < 16) {
    return {
      valid: false,
      reason: "NOT_FOUND",
      message: "This invitation link is invalid.",
    };
  }

  const tokenHash = hashToken(rawToken);
  const invitation = await db.invitation.findUnique({
    where: { tokenHash },
    include: {
      inviter: { select: { name: true, hospital: true } },
      pendingShares: {
        where: { cancelledAt: null, activatedAt: null },
        select: { id: true },
      },
    },
  });

  if (!invitation) {
    return {
      valid: false,
      reason: "NOT_FOUND",
      message: "This invitation link is invalid.",
    };
  }

  if (invitation.status === "ACCEPTED") {
    return {
      valid: false,
      reason: "ALREADY_USED",
      message: "This invitation has already been used.",
    };
  }

  if (invitation.status === "REVOKED") {
    return {
      valid: false,
      reason: "REVOKED",
      message: "This invitation has been revoked.",
    };
  }

  if (invitation.status === "EXPIRED" || invitation.expiresAt <= now) {
    if (invitation.status === "PENDING") {
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
    }
    return {
      valid: false,
      reason: "EXPIRED",
      message: "This invitation has expired. Please request a new invitation.",
    };
  }

  return {
    valid: true,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      inviterName: invitation.inviter.name,
      inviterHospital: invitation.inviter.hospital,
      pendingShareCount: invitation.pendingShares.length,
    },
  };
}

/**
 * Creates a single-use invitation (and optional PendingCaseShare if triggered from a case).
 */
export async function createInvitation(params: {
  inviterUserId: string;
  email: string;
  caseId?: string;
  permission?: SharePermission;
}) {
  const normalizedEmail = params.email.trim().toLowerCase();

  const rate = checkRateLimit(
    `invite:${params.inviterUserId}`,
    INVITE_RATE_LIMIT_MAX,
    INVITE_RATE_LIMIT_WINDOW_MS,
  );
  if (!rate.allowed) {
    throw new Error(
      "You have reached the hourly invitation limit. Please try again later.",
    );
  }

  const inviter = await db.user.findUnique({
    where: { id: params.inviterUserId },
    select: { id: true, name: true, email: true, hospital: true },
  });
  if (!inviter) {
    throw new Error("Inviter account not found.");
  }

  if (inviter.email.toLowerCase() === normalizedEmail) {
    throw new Error("You cannot invite your own email address.");
  }

  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existingUser) {
    throw new Error(
      "A doctor with this email already has an account. You can share cases with them directly.",
    );
  }

  if (params.caseId) {
    await requireCaseAccess(params.inviterUserId, params.caseId, "CASE_SHARE");
  }

  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = getInvitationExpiryDate();

  const invitation = await db.$transaction(async (tx) => {
    // Revoke any older pending invitations from the same inviter to the same email
    await tx.invitation.updateMany({
      where: {
        invitedBy: params.inviterUserId,
        email: normalizedEmail,
        status: "PENDING",
      },
      data: { status: "REVOKED" },
    });

    const created = await tx.invitation.create({
      data: {
        invitedBy: params.inviterUserId,
        email: normalizedEmail,
        tokenHash,
        status: "PENDING",
        expiresAt,
      },
    });

    if (params.caseId) {
      await tx.pendingCaseShare.create({
        data: {
          caseId: params.caseId,
          invitationId: created.id,
          grantedBy: params.inviterUserId,
          permission: params.permission ?? "VIEWER",
        },
      });
    }

    return created;
  });

  const inviteUrl = `${getAppUrl()}/invite/${rawToken}`;

  await getEmailService().send(
    buildInvitationEmail({
      to: normalizedEmail,
      inviterName: inviter.name,
      inviterHospital: inviter.hospital,
      inviteUrl,
      expiresAt,
      includesSharedCase: Boolean(params.caseId),
    }),
  );

  await recordAuditLog({
    userId: params.inviterUserId,
    caseId: params.caseId ?? null,
    action: "INVITATION_SENT",
    metadata: {
      invitationId: invitation.id,
      includesPendingShare: Boolean(params.caseId),
    },
  });

  return {
    id: invitation.id,
    email: invitation.email,
    expiresAt: invitation.expiresAt,
    inviteUrl: process.env.NODE_ENV === "development" ? inviteUrl : undefined,
  };
}

export async function revokeInvitation(
  inviterUserId: string,
  invitationId: string,
) {
  const invitation = await db.invitation.findFirst({
    where: {
      id: invitationId,
      invitedBy: inviterUserId,
      status: "PENDING",
    },
  });

  if (!invitation) {
    throw new Error("Pending invitation not found.");
  }

  await db.$transaction(async (tx) => {
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: "REVOKED" },
    });

    await tx.pendingCaseShare.updateMany({
      where: { invitationId: invitation.id, activatedAt: null },
      data: { cancelledAt: new Date() },
    });
  });

  await recordAuditLog({
    userId: inviterUserId,
    action: "INVITATION_REVOKED",
    metadata: { invitationId: invitation.id },
  });
}

/**
 * Marks an invitation accepted and activates any explicitly attached PendingCaseShares.
 * Regular invitations without PendingCaseShares grant zero access to the inviter's cases.
 */
export async function finalizeInvitationAcceptance(params: {
  invitationId: string;
  newUserId: string;
}) {
  const now = new Date();

  await db.$transaction(async (tx) => {
    const updated = await tx.invitation.updateMany({
      where: {
        id: params.invitationId,
        status: "PENDING",
        expiresAt: { gt: now },
      },
      data: {
        status: "ACCEPTED",
        acceptedAt: now,
      },
    });

    if (updated.count !== 1) {
      throw new Error("Invitation is no longer valid or has already been used.");
    }

    const pendingShares = await tx.pendingCaseShare.findMany({
      where: {
        invitationId: params.invitationId,
        activatedAt: null,
        cancelledAt: null,
      },
    });

    for (const pending of pendingShares) {
      await tx.caseShare.create({
        data: {
          caseId: pending.caseId,
          sharedWithUserId: params.newUserId,
          grantedBy: pending.grantedBy,
          permission: pending.permission,
        },
      });

      await tx.pendingCaseShare.update({
        where: { id: pending.id },
        data: { activatedAt: now },
      });

      await tx.notification.create({
        data: {
          userId: params.newUserId,
          type: "CASE_SHARED",
          title: "Surgical case shared with you",
          message: `You were granted ${pending.permission.toLowerCase()} access to a shared case.`,
          caseId: pending.caseId,
        },
      });
    }
  });

  await recordAuditLog({
    userId: params.newUserId,
    action: "INVITATION_ACCEPTED",
    metadata: { invitationId: params.invitationId },
  });
}

export async function listUserInvitations(userId: string) {
  return db.invitation.findMany({
    where: { invitedBy: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      status: true,
      expiresAt: true,
      acceptedAt: true,
      createdAt: true,
      pendingShares: {
        where: { cancelledAt: null },
        select: {
          id: true,
          permission: true,
          surgicalCase: { select: { id: true, caseNumber: true } },
        },
      },
    },
  });
}
