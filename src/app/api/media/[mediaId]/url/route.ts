import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage";
import { requireApiSession } from "@/modules/auth/session";
import {
  AuthorizationError,
  requireCaseAccess,
} from "@/modules/authorization/policy";

export async function GET(
  request: NextRequest,
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
      originalFilename: true,
      mimeType: true,
    },
  });

  if (!media) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  try {
    await requireCaseAccess(userId, media.caseId, "MEDIA_VIEW");
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isDownload = request.nextUrl.searchParams.get("download") === "1";
  const ttlSeconds = Number(process.env.SIGNED_URL_TTL_SECONDS ?? "300") || 300;

  const storage = getStorageProvider();
  const url = await storage.getSignedReadUrl({
    key: media.storageKey,
    expiresInSeconds: ttlSeconds,
    contentType: media.mimeType,
    downloadFilename: isDownload ? media.originalFilename : undefined,
  });

  return NextResponse.json(
    {
      url,
      expiresInSeconds: ttlSeconds,
      mimeType: media.mimeType,
      originalFilename: media.originalFilename,
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
