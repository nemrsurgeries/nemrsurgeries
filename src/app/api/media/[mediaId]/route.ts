import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage";
import { requireApiSession } from "@/modules/auth/session";
import {
  AuthorizationError,
  requireCaseAccess,
} from "@/modules/authorization/policy";
import { recordAuditLog } from "@/modules/audit/service";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ mediaId: string }> },
) {
  let userId: string;
  try {
    const session = await requireApiSession();
    userId = session.userId;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mediaId } = await context.params;
  const media = await db.caseMedia.findUnique({
    where: { id: mediaId },
    select: {
      id: true,
      caseId: true,
      storageKey: true,
      category: true,
      uploadedBy: true,
    },
  });

  if (!media) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  try {
    await requireCaseAccess(userId, media.caseId, "MEDIA_DELETE", {
      mediaUploadedBy: media.uploadedBy,
    });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const storage = getStorageProvider();
  await storage.deleteObject(media.storageKey);

  await db.caseMedia.delete({ where: { id: media.id } });

  await recordAuditLog({
    userId,
    caseId: media.caseId,
    action: "ATTACHMENT_DELETED",
    metadata: {
      mediaId: media.id,
      category: media.category,
    },
  });

  return NextResponse.json({ success: true });
}
