import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { PostoperativePlan } from "@/modules/cases/schemas";
import {
  CASE_STATUS_META,
  IMPLANT_TYPE_LABELS,
  MEDIA_CATEGORY_LABELS,
  PATIENT_SEX_LABELS,
  SURGICAL_ROLE_LABELS,
} from "@/modules/cases/labels";
import { formatDate } from "@/lib/utils";
import type {
  CaseStatus,
  ImplantType,
  MediaCategory,
  PatientSex,
  SurgicalRole,
} from "@prisma/client";

export interface PdfCaseImageInput {
  id: string;
  category: MediaCategory;
  originalFilename: string;
  description: string | null;
  mimeType: string;
  bytes: Buffer;
}

export interface PdfCaseReportInput {
  caseNumber: string;
  operationDate: Date | null;
  patientAge: number | null;
  patientSex: PatientSex;
  diagnosis: string | null;
  procedure: string | null;
  fractureClassification: string | null;
  classificationSystem: string | null;
  surgeon: string | null;
  myRole: SurgicalRole | null;
  seniorSurgeon: string | null;
  hospital: string | null;
  intraoperativeNotes: string | null;
  postoperativePlan: PostoperativePlan;
  learningPoints: string | null;
  status: CaseStatus;
  ownerName: string;
  implants: {
    implantType: ImplantType;
    manufacturer: string | null;
    model: string | null;
    specifications: string | null;
    notes: string | null;
  }[];
  labResults: {
    testName: string;
    result: string;
    unit: string | null;
    referenceRange: string | null;
    testDate: Date;
  }[];
  followups: {
    followupDate: Date;
    clinicalOutcome: string | null;
    radiologicalOutcome: string | null;
    complications: string | null;
    notes: string | null;
  }[];
  images: PdfCaseImageInput[];
}

/**
 * Converts sanitized clinical HTML into clean WinAnsi-safe plain text lines for PDF rendering.
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<\/?(h2|h3|h4|p|div|tr)[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toPdfSafeText(input: string): string {
  // pdf-lib StandardFonts use WinAnsi encoding; replace unsupported Unicode safely
  return input
    .replace(/•/g, "-")
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, " ");
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const safe = toPdfSafeText(text);
  const paragraphs = safe.split("\n");
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export async function generateSurgicalCasePdf(
  data: PdfCaseReportInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Surgical Case Report - ${data.caseNumber}`);
  pdf.setSubject("De-identified Orthopedic Surgical Case Documentation");
  pdf.setCreator("OrthoCase Clinical Platform");

  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595.28; // A4 width
  const PAGE_H = 841.89; // A4 height
  const MARGIN = 48;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const NAVY = rgb(0.06, 0.09, 0.16);
  const BLUE = rgb(0.11, 0.31, 0.85);
  const SLATE = rgb(0.35, 0.42, 0.52);
  const BORDER = rgb(0.86, 0.89, 0.93);

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  function ensureSpace(requiredHeight: number) {
    if (y - requiredHeight < MARGIN + 24) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  }

  function drawSectionHeader(title: string) {
    ensureSpace(34);
    y -= 8;
    page.drawText(toPdfSafeText(title.toUpperCase()), {
      x: MARGIN,
      y,
      size: 9.5,
      font: fontBold,
      color: BLUE,
    });
    y -= 5;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.75,
      color: BORDER,
    });
    y -= 14;
  }

  function drawKeyValue(label: string, value: string | null | undefined) {
    const val = value && value.trim() ? value.trim() : "-";
    const wrapped = wrapText(val, fontRegular, 9.5, CONTENT_W - 135);
    ensureSpace(wrapped.length * 13 + 6);

    page.drawText(toPdfSafeText(label), {
      x: MARGIN,
      y,
      size: 9,
      font: fontBold,
      color: SLATE,
    });

    for (let i = 0; i < wrapped.length; i++) {
      page.drawText(wrapped[i]!, {
        x: MARGIN + 135,
        y: y - i * 13,
        size: 9.5,
        font: fontRegular,
        color: NAVY,
      });
    }
    y -= Math.max(1, wrapped.length) * 13 + 4;
  }

  function drawParagraph(text: string) {
    const lines = wrapText(text, fontRegular, 9.5, CONTENT_W);
    for (const line of lines) {
      ensureSpace(14);
      if (line) {
        page.drawText(line, {
          x: MARGIN,
          y,
          size: 9.5,
          font: fontRegular,
          color: NAVY,
        });
      }
      y -= 13;
    }
    y -= 4;
  }

  // ── Header Banner ──
  page.drawText("ORTHOCASE CLINICAL DOCUMENTATION", {
    x: MARGIN,
    y,
    size: 8.5,
    font: fontBold,
    color: BLUE,
  });
  page.drawText(`Exported: ${formatDate(new Date())}`, {
    x: PAGE_W - MARGIN - 130,
    y,
    size: 8.5,
    font: fontRegular,
    color: SLATE,
  });
  y -= 20;

  page.drawText(toPdfSafeText(`Surgical Case Report: ${data.caseNumber}`), {
    x: MARGIN,
    y,
    size: 16,
    font: fontBold,
    color: NAVY,
  });
  y -= 16;

  page.drawText(
    toPdfSafeText(
      `Status: ${CASE_STATUS_META[data.status].label}  |  Documented by: ${data.ownerName}  |  De-identified Record`,
    ),
    {
      x: MARGIN,
      y,
      size: 8.5,
      font: fontRegular,
      color: SLATE,
    },
  );
  y -= 16;

  // ── 1. General & Diagnosis ──
  drawSectionHeader("1. General Information & Diagnosis");
  drawKeyValue("Case ID", data.caseNumber);
  drawKeyValue("Operation Date", formatDate(data.operationDate));
  drawKeyValue(
    "Patient Demographics",
    `${data.patientAge !== null ? `${data.patientAge} years` : "Age unspecified"} | ${PATIENT_SEX_LABELS[data.patientSex]}`,
  );
  drawKeyValue("Diagnosis", data.diagnosis);
  drawKeyValue("Procedure", data.procedure);
  drawKeyValue(
    "Fracture Classification",
    data.fractureClassification
      ? `${data.fractureClassification}${data.classificationSystem ? ` (${data.classificationSystem})` : ""}`
      : "-",
  );

  // ── 2. Surgical Team ──
  drawSectionHeader("2. Surgical Team");
  drawKeyValue("Responsible Surgeon", data.surgeon);
  drawKeyValue(
    "My Surgical Role",
    data.myRole ? SURGICAL_ROLE_LABELS[data.myRole] : "-",
  );
  drawKeyValue("Senior Surgeon", data.seniorSurgeon);
  drawKeyValue("Hospital / Institution", data.hospital);

  // ── 3. Instruments & Implants ──
  drawSectionHeader("3. Instruments & Implants");
  if (data.implants.length === 0) {
    drawParagraph("No implants documented.");
  } else {
    for (const imp of data.implants) {
      const line = [
        IMPLANT_TYPE_LABELS[imp.implantType],
        imp.manufacturer,
        imp.model,
        imp.specifications,
        imp.notes ? `(${imp.notes})` : null,
      ]
        .filter(Boolean)
        .join(" - ");
      drawParagraph(`- ${line}`);
    }
  }

  // ── 4. Intraoperative Notes ──
  drawSectionHeader("4. Intraoperative Notes");
  const plainNotes = htmlToPlainText(data.intraoperativeNotes);
  drawParagraph(plainNotes || "No intraoperative notes recorded.");

  // ── 5. Postoperative Plan ──
  drawSectionHeader("5. Postoperative Plan");
  drawKeyValue("Weight-Bearing", data.postoperativePlan.weightBearing);
  drawKeyValue("Rehabilitation", data.postoperativePlan.rehabilitationPlan);
  drawKeyValue("Medication Notes", data.postoperativePlan.medicationNotes);
  drawKeyValue(
    "Follow-up Instructions",
    data.postoperativePlan.followupInstructions,
  );
  if (data.postoperativePlan.additionalNotes) {
    drawKeyValue("Additional Notes", data.postoperativePlan.additionalNotes);
  }

  // ── 6. Laboratory Results ──
  drawSectionHeader("6. Laboratory Results");
  if (data.labResults.length === 0) {
    drawParagraph("No laboratory results documented.");
  } else {
    for (const lab of data.labResults) {
      const line = `${formatDate(lab.testDate)} | ${lab.testName}: ${lab.result}${lab.unit ? ` ${lab.unit}` : ""}${lab.referenceRange ? ` (Ref: ${lab.referenceRange})` : ""}`;
      drawParagraph(`- ${line}`);
    }
  }

  // ── 7. Follow-up History ──
  drawSectionHeader("7. Follow-up History");
  if (data.followups.length === 0) {
    drawParagraph("No follow-up visits recorded.");
  } else {
    for (const f of data.followups) {
      ensureSpace(44);
      page.drawText(toPdfSafeText(`Visit: ${formatDate(f.followupDate)}`), {
        x: MARGIN,
        y,
        size: 9.5,
        font: fontBold,
        color: NAVY,
      });
      y -= 13;
      if (f.clinicalOutcome) drawParagraph(`Clinical: ${f.clinicalOutcome}`);
      if (f.radiologicalOutcome)
        drawParagraph(`Radiological: ${f.radiologicalOutcome}`);
      if (f.complications) drawParagraph(`Complications: ${f.complications}`);
      if (f.notes) drawParagraph(`Notes: ${f.notes}`);
    }
  }

  // ── 8. Learning Points ──
  drawSectionHeader("8. Learning Points");
  drawParagraph(data.learningPoints || "No learning points recorded.");

  // ── 9. Selected Medical Images ──
  if (data.images.length > 0) {
    drawSectionHeader("9. Selected Medical Images");
    for (const img of data.images) {
      try {
        const embedded =
          img.mimeType === "image/png"
            ? await pdf.embedPng(img.bytes)
            : img.mimeType === "image/jpeg"
              ? await pdf.embedJpg(img.bytes)
              : null;

        if (!embedded) continue;

        const maxImgW = CONTENT_W;
        const maxImgH = 260;
        const scale = Math.min(
          maxImgW / embedded.width,
          maxImgH / embedded.height,
          1,
        );
        const drawW = embedded.width * scale;
        const drawH = embedded.height * scale;

        ensureSpace(drawH + 40);
        page.drawImage(embedded, {
          x: MARGIN,
          y: y - drawH,
          width: drawW,
          height: drawH,
        });
        y -= drawH + 12;

        const caption = `${MEDIA_CATEGORY_LABELS[img.category]}${img.description ? ` - ${img.description}` : ` - ${img.originalFilename}`}`;
        page.drawText(toPdfSafeText(caption), {
          x: MARGIN,
          y,
          size: 8.5,
          font: fontRegular,
          color: SLATE,
        });
        y -= 20;
      } catch {
        // Skip corrupt or non-embeddable image gracefully
      }
    }
  }

  // Add subtle page footer numbers
  const pages = pdf.getPages();
  pages.forEach((p, idx) => {
    p.drawText(
      toPdfSafeText(
        `${data.caseNumber}  |  De-identified Clinical Report  |  Page ${idx + 1} of ${pages.length}`,
      ),
      {
        x: MARGIN,
        y: 22,
        size: 8,
        font: fontRegular,
        color: SLATE,
      },
    );
  });

  return pdf.save();
}
