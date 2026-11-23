import { describe, it, expect } from "vitest";
import {
  generateSurgicalCasePdf,
  htmlToPlainText,
} from "@/modules/pdf/generate-case-pdf";
import { aggregateCounts } from "@/modules/dashboard/analytics";

describe("PDF Case Report Generator", () => {
  it("converts clinical HTML into readable plain text lines", () => {
    const text = htmlToPlainText(
      "<h3>Surgical Approach</h3><p>Lateral parapatellar</p><ul><li>Step 1</li><li>Step 2</li></ul>",
    );
    expect(text).toContain("Surgical Approach");
    expect(text).toContain("Lateral parapatellar");
    expect(text).toContain("Step 1");
    expect(text).not.toContain("<h3>");
  });

  it("generates a valid PDF binary with standard %PDF- header", async () => {
    const bytes = await generateSurgicalCasePdf({
      caseNumber: "ORTHO-2026-0001",
      operationDate: new Date("2026-11-10"),
      patientAge: 46,
      patientSex: "MALE",
      diagnosis: "Closed distal femur fracture",
      procedure: "ORIF with locking plate",
      fractureClassification: "33-C2",
      classificationSystem: "AO/OTA",
      surgeon: "Dr. Karim Mansour",
      myRole: "OPERATOR",
      seniorSurgeon: null,
      hospital: "Cairo Orthopedic Teaching Hospital (Fictional)",
      intraoperativeNotes: "<h3>Approach</h3><p>Lateral distal femoral approach.</p>",
      postoperativePlan: {
        weightBearing: "Non-weight-bearing 6 weeks",
        rehabilitationPlan: "Early active-assisted knee ROM",
        medicationNotes: "Thromboprophylaxis per protocol",
        followupInstructions: "2-week wound check, 6-week AP/Lat X-ray",
        additionalNotes: "",
      },
      learningPoints: "Confirm condylar bolt alignment on true lateral fluoroscopy.",
      status: "AWAITING_FOLLOWUP",
      ownerName: "Dr. Karim Mansour",
      implants: [
        {
          implantType: "PLATE",
          manufacturer: "DePuy Synthes",
          model: "VA-LCP Distal Femur",
          specifications: "9-hole titanium",
          notes: null,
        },
      ],
      labResults: [
        {
          testName: "Hemoglobin",
          result: "11.8",
          unit: "g/dL",
          referenceRange: "13.0-17.0",
          testDate: new Date("2026-11-11"),
        },
      ],
      followups: [
        {
          followupDate: new Date("2026-11-24"),
          clinicalOutcome: "Wound healed cleanly, ROM 0-95 deg",
          radiologicalOutcome: "Maintained reduction and hardware position",
          complications: null,
          notes: null,
        },
      ],
      images: [],
    });

    const header = Buffer.from(bytes.slice(0, 5)).toString("ascii");
    expect(header).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1000);
  });
});

describe("Dashboard Analytics Aggregation", () => {
  it("aggregates, sorts by descending count, ignores blanks, and respects limit", () => {
    const result = aggregateCounts(
      ["ORIF", "IM Nail", "ORIF", "", null, "ORIF", "Arthroplasty", "IM Nail"],
      2,
    );
    expect(result).toEqual([
      { label: "ORIF", count: 3 },
      { label: "IM Nail", count: 2 },
    ]);
  });
});
