import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { MediaCategory } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage";
import {
  detectFileTypeFromBytes,
  getMaxUploadBytes,
  sanitizeFilename,
  stripImageExif,
} from "@/lib/storage/validation";
import { requireApiSession } from "@/modules/auth/session";
import {
  AuthorizationError,
  requireCaseAccess,
} from "@/modules/authorization/policy";
import { recordAuditLog } from "@/modules/audit/service";

const uploadMetaSchema = z.object({
  caseId: z.string().cuid(),
  category: z.enum([
    "PREOPERATIVE_XRAY",
    "POSTOPERATIVE_XRAY",
    "INTRAOPERATIVE_PHOTO",
    "CLINICAL_PHOTO",
    "LABORATORY_REPORT",
    "MEDICAL_DOCUMENT",
    "OTHER",
  ]),
  description: z.string().trim().max(500).optional(),
  followupId: z.string().cuid().optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  let userId: string;
  try {
    const session = await requireApiSession();
    userId = session.userId;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart form data." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const parsedMeta = uploadMetaSchema.safeParse({
    caseId: formData.get("caseId"),
    category: formData.get("category"),
    description: formData.get("description") || undefined,
    followupId: formData.get("followupId") || undefined,
  });

  if (!parsedMeta.success) {
    return NextResponse.json(
      { error: parsedMeta.error.issues[0]?.message ?? "Invalid upload metadata." },
      { status: 400 },
    );
  }

  const { caseId, category, description, followupId } = parsedMeta.data;

  try {
    await requireCaseAccess(userId, caseId, "MEDIA_UPLOAD");
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const maxBytes = getMaxUploadBytes();
  if (file.size === 0 || file.size > maxBytes) {
    return NextResponse.json(
      {
        error: `File size must be between 1 byte and ${Math.round(maxBytes / (1024 * 1024))} MB.`,
      },
      { status: 413 },
    );
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const detected = detectFileTypeFromBytes(rawBuffer);
  if (!detected) {
    return NextResponse.json(
      {
        error:
          "Unsupported or unrecognized file content. Allowed formats: JPEG, PNG, WebP, and PDF.",
      },
      { status: 415 },
    );
  }

  // If followupId is provided, verify it belongs to the same case
  let validFollowupId: string | null = null;
  if (followupId) {
    const fu = await db.caseFollowup.findFirst({
      where: { id: followupId, caseId },
      select: { id: true },
    });
    if (!fu) {
      return NextResponse.json(
        { error: "Selected follow-up entry does not belong to this case." },
        { status: 400 },
      );
    }
    validFollowupId = fu.id;
  }

  const { buffer: finalBuffer, exifStripped } = stripImageExif(
    rawBuffer,
    detected.mimeType,
  );

  const storageKey = `cases/${caseId}/${category.toLowerCase()}/${crypto.randomUUID()}.${detected.extension}`;
  const cleanName = sanitizeFilename(file.name);

  try {
    const storage = getStorageProvider();
    await storage.putObject({
      key: storageKey,
      body: finalBuffer,
      contentType: detected.mimeType,
    });

    const created = await db.caseMedia.create({
      data: {
        caseId,
        followupId: validFollowupId,
        uploadedBy: userId,
        category: category as MediaCategory,
        storageKey,
        originalFilename: cleanName,
        mimeType: detected.mimeType,
        fileSize: finalBuffer.length,
        description: description || null,
        exifStripped,
      },
      select: {
        id: true,
        caseId: true,
        category: true,
        originalFilename: true,
        mimeType: true,
        fileSize: true,
        description: true,
        exifStripped: true,
        createdAt: true,
        uploadedBy: true,
      },
    });

    await recordAuditLog({
      userId,
      caseId,
      action: "ATTACHMENT_UPLOADED",
      metadata: {
        mediaId: created.id,
        category: created.category,
        mimeType: created.mimeType,
        fileSize: created.fileSize,
        exifStripped,
      },
    });

    return NextResponse.json({ media: created }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to store medical file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
