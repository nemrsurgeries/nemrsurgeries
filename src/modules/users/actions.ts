"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireApiSession } from "@/modules/auth/session";
import { deleteAccountSchema, updateProfileSchema } from "./schemas";

export interface ActionResult<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export async function updateProfileAction(
  input: unknown,
): Promise<ActionResult> {
  const { userId } = await requireApiSession();
  const parsed = updateProfileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid profile data.",
    };
  }

  await db.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name,
      professionalTitle: parsed.data.professionalTitle || null,
      hospital: parsed.data.hospital || null,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function revokeOtherSessionsAction(): Promise<
  ActionResult<{ revokedCount: number }>
> {
  const { userId, sessionId } = await requireApiSession();

  const result = await db.session.deleteMany({
    where: {
      userId,
      id: { not: sessionId },
    },
  });

  revalidatePath("/settings/security");
  return { success: true, data: { revokedCount: result.count } };
}

export async function revokeSessionByIdAction(
  targetSessionId: string,
): Promise<ActionResult> {
  const { userId, sessionId } = await requireApiSession();

  if (targetSessionId === sessionId) {
    return {
      success: false,
      error: "Use Sign Out to end your current session.",
    };
  }

  await db.session.deleteMany({
    where: {
      id: targetSessionId,
      userId,
    },
  });

  revalidatePath("/settings/security");
  return { success: true };
}

export async function deleteAccountAction(
  input: unknown,
): Promise<ActionResult> {
  const { userId } = await requireApiSession();
  const parsed = deleteAccountSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Confirmation failed.",
    };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user || user.email.toLowerCase() !== parsed.data.confirmEmail) {
    return {
      success: false,
      error: "The email address does not match your account.",
    };
  }

  // Cascade deletes sessions, accounts, owned cases, shares, invitations, and notifications
  await db.user.delete({ where: { id: userId } });

  return { success: true };
}
