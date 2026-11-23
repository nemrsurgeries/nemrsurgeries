"use server";

import { revalidatePath } from "next/cache";
import { requireApiSession } from "@/modules/auth/session";
import { createInvitationSchema } from "./schemas";
import { createInvitation, revokeInvitation } from "./service";

export interface InvitationActionResult {
  success: boolean;
  error?: string;
  inviteUrl?: string;
}

export async function createInvitationAction(
  input: unknown,
): Promise<InvitationActionResult> {
  const { userId } = await requireApiSession();
  const parsed = createInvitationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid invitation input.",
    };
  }

  try {
    const result = await createInvitation({
      inviterUserId: userId,
      email: parsed.data.email,
      caseId: parsed.data.caseId,
      permission: parsed.data.permission,
    });

    revalidatePath("/invitations");
    if (parsed.data.caseId) {
      revalidatePath(`/cases/${parsed.data.caseId}`);
    }

    return {
      success: true,
      inviteUrl: result.inviteUrl,
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to send invitation.",
    };
  }
}

export async function revokeInvitationAction(
  invitationId: string,
): Promise<{ success: boolean; error?: string }> {
  const { userId } = await requireApiSession();
  try {
    await revokeInvitation(userId, invitationId);
    revalidatePath("/invitations");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to revoke invitation.",
    };
  }
}
