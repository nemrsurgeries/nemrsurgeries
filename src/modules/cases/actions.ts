"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sanitizeClinicalHtml } from "@/lib/sanitize";
import { requireApiSession } from "@/modules/auth/session";
import {
  AuthorizationError,
  requireCaseAccess,
} from "@/modules/authorization/policy";
import { recordAuditLog } from "@/modules/audit/service";
import {
  caseFormSchema,
  updateCaseStatusSchema,
  type CaseFormInput,
} from "./schemas";
import { generateNextCaseNumber } from "./service";

export interface CaseActionResult<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function createCaseAction(
  input: CaseFormInput,
): Promise<CaseActionResult<{ id: string; caseNumber: string }>> {
  const { userId } = await requireApiSession();
  const parsed = caseFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid surgical case data.",
    };
  }

  const data = parsed.data;
  const operationDate = parseOptionalDate(data.operationDate);
  const nextFollowupDate = parseOptionalDate(data.nextFollowupDate);
  const cleanNotes = sanitizeClinicalHtml(data.intraoperativeNotes);

  const created = await db.$transaction(async (tx) => {
    const caseNumber = await generateNextCaseNumber(tx, userId, operationDate);

    const surgicalCase = await tx.surgicalCase.create({
      data: {
        ownerId: userId,
        caseNumber,
        operationDate,
        patientAge: data.patientAge ?? null,
        patientSex: data.patientSex,
        diagnosis: data.diagnosis || null,
        procedure: data.procedure || null,
        fractureClassification: data.fractureClassification || null,
        classificationSystem: data.classificationSystem || null,
        surgeon: data.surgeon || null,
        myRole: data.myRole ?? null,
        seniorSurgeon: data.seniorSurgeon || null,
        hospital: data.hospital || null,
        intraoperativeNotes: cleanNotes || null,
        postoperativePlan: data.postoperativePlan,
        learningPoints: data.learningPoints || null,
        status: data.status,
        nextFollowupDate,
        archivedAt: data.status === "ARCHIVED" ? new Date() : null,
        implants:
          data.implants.length > 0
            ? {
                create: data.implants.map((imp) => ({
                  implantType: imp.implantType,
                  manufacturer: imp.manufacturer || null,
                  model: imp.model || null,
                  specifications: imp.specifications || null,
                  notes: imp.notes || null,
                })),
              }
            : undefined,
      },
      select: { id: true, caseNumber: true },
    });

    return surgicalCase;
  });

  await recordAuditLog({
    userId,
    caseId: created.id,
    action: "CASE_CREATED",
    metadata: {
      status: data.status,
      implantCount: data.implants.length,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/cases");

  return { success: true, data: created };
}

export async function updateCaseAction(
  caseId: string,
  input: CaseFormInput,
): Promise<CaseActionResult<{ id: string }>> {
  const { userId } = await requireApiSession();

  try {
    const authz = await requireCaseAccess(userId, caseId, "CASE_EDIT");

    const parsed = caseFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid surgical case data.",
      };
    }

    const data = parsed.data;
    // Editors cannot archive a case (only Owner can archive)
    if (data.status === "ARCHIVED" && authz.role !== "OWNER") {
      return {
        success: false,
        error: "Only the case owner can archive this surgical case.",
      };
    }

    const operationDate = parseOptionalDate(data.operationDate);
    const nextFollowupDate = parseOptionalDate(data.nextFollowupDate);
    const cleanNotes = sanitizeClinicalHtml(data.intraoperativeNotes);

    await db.$transaction(async (tx) => {
      await tx.surgicalCase.update({
        where: { id: caseId },
        data: {
          operationDate,
          patientAge: data.patientAge ?? null,
          patientSex: data.patientSex,
          diagnosis: data.diagnosis || null,
          procedure: data.procedure || null,
          fractureClassification: data.fractureClassification || null,
          classificationSystem: data.classificationSystem || null,
          surgeon: data.surgeon || null,
          myRole: data.myRole ?? null,
          seniorSurgeon: data.seniorSurgeon || null,
          hospital: data.hospital || null,
          intraoperativeNotes: cleanNotes || null,
          postoperativePlan: data.postoperativePlan,
          learningPoints: data.learningPoints || null,
          status: data.status,
          nextFollowupDate,
          archivedAt: data.status === "ARCHIVED" ? new Date() : null,
        },
      });

      // Replace implants list atomically
      await tx.caseImplant.deleteMany({ where: { caseId } });
      if (data.implants.length > 0) {
        await tx.caseImplant.createMany({
          data: data.implants.map((imp) => ({
            caseId,
            implantType: imp.implantType,
            manufacturer: imp.manufacturer || null,
            model: imp.model || null,
            specifications: imp.specifications || null,
            notes: imp.notes || null,
          })),
        });
      }
    });

    await recordAuditLog({
      userId,
      caseId,
      action: "CASE_EDITED",
      metadata: {
        status: data.status,
        implantCount: data.implants.length,
        actorRole: authz.role,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/cases");
    revalidatePath(`/cases/${caseId}`);

    return { success: true, data: { id: caseId } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Failed to update surgical case." };
  }
}

export async function updateCaseStatusAction(
  input: unknown,
): Promise<CaseActionResult> {
  const { userId } = await requireApiSession();
  const parsed = updateCaseStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid status value." };
  }

  const { caseId, status } = parsed.data;
  const requiredAction = status === "ARCHIVED" ? "CASE_ARCHIVE" : "CASE_EDIT";

  try {
    await requireCaseAccess(userId, caseId, requiredAction);

    await db.surgicalCase.update({
      where: { id: caseId },
      data: {
        status,
        archivedAt: status === "ARCHIVED" ? new Date() : null,
      },
    });

    await recordAuditLog({
      userId,
      caseId,
      action: status === "ARCHIVED" ? "CASE_ARCHIVED" : "CASE_EDITED",
      metadata: { status },
    });

    revalidatePath("/dashboard");
    revalidatePath("/cases");
    revalidatePath(`/cases/${caseId}`);
    return { success: true };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Unable to update case status." };
  }
}

export async function deleteCaseAction(
  caseId: string,
): Promise<CaseActionResult> {
  const { userId } = await requireApiSession();

  try {
    await requireCaseAccess(userId, caseId, "CASE_DELETE");

    // Record audit log before deleting case (caseId becomes null via onDelete: SetNull)
    await recordAuditLog({
      userId,
      caseId,
      action: "CASE_DELETED",
      metadata: { deletedCaseId: caseId },
    });

    await db.surgicalCase.delete({
      where: { id: caseId },
    });

    revalidatePath("/dashboard");
    revalidatePath("/cases");
    return { success: true };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Unable to delete surgical case." };
  }
}
