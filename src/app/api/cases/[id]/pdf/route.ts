import { NextResponse, type NextRequest } from "next/server";
import { getStorageProvider } from "@/lib/storage";
import { requireApiSession } from "@/modules/auth/session";
import {
  AuthorizationError,
  requireCaseAccess,
} from "@/modules/authorization/policy";
import { recordAuditLog } from "@/modules/audit/service";
import {
  getCaseDetails,
  parsePostoperativePlan,
} from "@/modules/cases/service";
import {
  generateSurgicalCasePdf,
  type PdfCaseImageInput,
} from "@/modules/pdf/generate-case-pdf";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  let userId: string;
  try {
    const session = await requireApiSession();
    userId = session.userId;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await requireCaseAccess(userId, id, "CASE_EXPORT_PDF");
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const surgicalCase = await getCaseDetails(id);
  if (!surgicalCase) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const rawMediaIds = request.nextUrl.searchParams.get("mediaIds");
  const requestedIds = new Set(
    (rawMediaIds ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const selectedMedia = surgicalCase.media.filter(
    (m) =>
      requestedIds.has(m.id) &&
      (m.mimeType === "image/jpeg" || m.mimeType === "image/png"),
  );

  const storage = getStorageProvider();
  const images: PdfCaseImageInput[] = [];
  for (const m of selectedMedia) {
    try {
      const bytes = await storage.getObjectBuffer(m.storageKey);
      images.push({
        id: m.id,
        category: m.category,
        originalFilename: m.originalFilename,
        description: m.description,
        mimeType: m.mimeType,
        bytes,
      });
    } catch {
      // Skip missing storage objects without failing the entire PDF report
    }
  }

  const pdfBytes = await generateSurgicalCasePdf({
    caseNumber: surgicalCase.caseNumber,
    operationDate: surgicalCase.operationDate,
    patientAge: surgicalCase.patientAge,
    patientSex: surgicalCase.patientSex,
    diagnosis: surgicalCase.diagnosis,
    procedure: surgicalCase.procedure,
    fractureClassification: surgicalCase.fractureClassification,
    classificationSystem: surgicalCase.classificationSystem,
    surgeon: surgicalCase.surgeon,
    myRole: surgicalCase.myRole,
    seniorSurgeon: surgicalCase.seniorSurgeon,
    hospital: surgicalCase.hospital,
    intraoperativeNotes: surgicalCase.intraoperativeNotes,
    postoperativePlan: parsePostoperativePlan(surgicalCase.postoperativePlan),
    learningPoints: surgicalCase.learningPoints,
    status: surgicalCase.status,
    ownerName: surgicalCase.owner.name,
    implants: surgicalCase.implants,
    labResults: surgicalCase.labResults,
    followups: surgicalCase.followups,
    images,
  });

  await recordAuditLog({
    userId,
    caseId: surgicalCase.id,
    action: "CASE_EXPORTED_PDF",
    metadata: {
      includedImages: images.length,
    },
  });

  const safeFileName = `${surgicalCase.caseNumber.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
