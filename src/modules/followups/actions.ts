"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireApiSession } from "@/modules/auth/session";
import {
  AuthorizationError,
  requireCaseAccess,
} from "@/modules/authorization/policy";
import { recordAuditLog } from "@/modules/audit/service";
import { followupSchema } from "./schemas";

export interface FollowupActionResult {
  success: boolean;
  error?: string;
}

export async function createFollowupAction(
  input: unknown,
): Promise<FollowupActionResult> {
  const { userId } = await requireApiSession();
  const parsed = followupSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid follow-up entry.",
    };
  }

  const data = parsed.data;

  try {
    await requireCaseAccess(userId, data.caseId, "FOLLOWUP_MANAGE");

    await db.$transaction(async (tx) => {
      await tx.caseFollowup.create({
        data: {
          caseId: data.caseId,
          createdBy: userId,
          followupDate: new Date(data.followupDate),
          clinicalOutcome: data.clinicalOutcome || null,
          radiologicalOutcome: data.radiologicalOutcome || null,
          complications: data.complications || null,
          notes: data.notes || null,
        },
      });

      if (data.nextFollowupDate !== undefined) {
        await tx.surgicalCase.update({
          where: { id: data.caseId },
          data: {
            nextFollowupDate: data.nextFollowupDate
              ? new Date(data.nextFollowupDate)
              : null,
          },
        });
      }
    });

    await recordAuditLog({
      userId,
      caseId: data.caseId,
      action: "CASE_EDITED",
      metadata: { section: "followup_added" },
    });

    revalidatePath(`/cases/${data.caseId}`);
    revalidatePath("/follow-ups");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Unable to add follow-up entry." };
  }
}

export async function updateFollowupAction(
  followupId: string,
  input: unknown,
): Promise<FollowupActionResult> {
  const { userId } = await requireApiSession();
  const parsed = followupSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid follow-up entry.",
    };
  }

  const data = parsed.data;

  try {
    await requireCaseAccess(userId, data.caseId, "FOLLOWUP_MANAGE");

    const existing = await db.caseFollowup.findFirst({
      where: { id: followupId, caseId: data.caseId },
      select: { id: true },
    });
    if (!existing) {
      return { success: false, error: "Follow-up entry not found." };
    }

    await db.caseFollowup.update({
      where: { id: followupId },
      data: {
        followupDate: new Date(data.followupDate),
        clinicalOutcome: data.clinicalOutcome || null,
        radiologicalOutcome: data.radiologicalOutcome || null,
        complications: data.complications || null,
        notes: data.notes || null,
      },
    });

    await recordAuditLog({
      userId,
      caseId: data.caseId,
      action: "CASE_EDITED",
      metadata: { section: "followup_updated" },
    });

    revalidatePath(`/cases/${data.caseId}`);
    revalidatePath("/follow-ups");
    return { success: true };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Unable to update follow-up entry." };
  }
}

export async function deleteFollowupAction(
  caseId: string,
  followupId: string,
): Promise<FollowupActionResult> {
  const { userId } = await requireApiSession();

  try {
    await requireCaseAccess(userId, caseId, "FOLLOWUP_MANAGE");

    await db.caseFollowup.deleteMany({
      where: { id: followupId, caseId },
    });

    await recordAuditLog({
      userId,
      caseId,
      action: "CASE_EDITED",
      metadata: { section: "followup_deleted" },
    });

    revalidatePath(`/cases/${caseId}`);
    revalidatePath("/follow-ups");
    return { success: true };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Unable to delete follow-up entry." };
  }
}
