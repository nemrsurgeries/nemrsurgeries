"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireApiSession } from "@/modules/auth/session";
import {
  AuthorizationError,
  requireCaseAccess,
} from "@/modules/authorization/policy";
import { recordAuditLog } from "@/modules/audit/service";
import { labResultSchema } from "./schemas";

export interface LabActionResult {
  success: boolean;
  error?: string;
}

export async function createLabResultAction(
  input: unknown,
): Promise<LabActionResult> {
  const { userId } = await requireApiSession();
  const parsed = labResultSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid laboratory result.",
    };
  }

  const data = parsed.data;

  try {
    await requireCaseAccess(userId, data.caseId, "LAB_MANAGE");

    let attachmentId: string | null = null;
    if (data.attachmentId) {
      const media = await db.caseMedia.findFirst({
        where: { id: data.attachmentId, caseId: data.caseId },
        select: { id: true },
      });
      if (!media) {
        return {
          success: false,
          error: "Selected attachment does not belong to this case.",
        };
      }
      attachmentId = media.id;
    }

    await db.laboratoryResult.create({
      data: {
        caseId: data.caseId,
        testName: data.testName,
        result: data.result,
        unit: data.unit || null,
        referenceRange: data.referenceRange || null,
        testDate: new Date(data.testDate),
        notes: data.notes || null,
        attachmentId,
      },
    });

    await recordAuditLog({
      userId,
      caseId: data.caseId,
      action: "CASE_EDITED",
      metadata: { section: "laboratory_created" },
    });

    revalidatePath(`/cases/${data.caseId}`);
    return { success: true };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Unable to add laboratory result." };
  }
}

export async function updateLabResultAction(
  labId: string,
  input: unknown,
): Promise<LabActionResult> {
  const { userId } = await requireApiSession();
  const parsed = labResultSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid laboratory result.",
    };
  }

  const data = parsed.data;

  try {
    await requireCaseAccess(userId, data.caseId, "LAB_MANAGE");

    const existing = await db.laboratoryResult.findFirst({
      where: { id: labId, caseId: data.caseId },
      select: { id: true },
    });
    if (!existing) {
      return { success: false, error: "Laboratory record not found." };
    }

    let attachmentId: string | null = null;
    if (data.attachmentId) {
      const media = await db.caseMedia.findFirst({
        where: { id: data.attachmentId, caseId: data.caseId },
        select: { id: true },
      });
      if (media) attachmentId = media.id;
    }

    await db.laboratoryResult.update({
      where: { id: labId },
      data: {
        testName: data.testName,
        result: data.result,
        unit: data.unit || null,
        referenceRange: data.referenceRange || null,
        testDate: new Date(data.testDate),
        notes: data.notes || null,
        attachmentId,
      },
    });

    await recordAuditLog({
      userId,
      caseId: data.caseId,
      action: "CASE_EDITED",
      metadata: { section: "laboratory_updated" },
    });

    revalidatePath(`/cases/${data.caseId}`);
    return { success: true };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Unable to update laboratory result." };
  }
}

export async function deleteLabResultAction(
  caseId: string,
  labId: string,
): Promise<LabActionResult> {
  const { userId } = await requireApiSession();

  try {
    await requireCaseAccess(userId, caseId, "LAB_MANAGE");

    await db.laboratoryResult.deleteMany({
      where: { id: labId, caseId },
    });

    await recordAuditLog({
      userId,
      caseId,
      action: "CASE_EDITED",
      metadata: { section: "laboratory_deleted" },
    });

    revalidatePath(`/cases/${caseId}`);
    return { success: true };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Unable to delete laboratory result." };
  }
}
