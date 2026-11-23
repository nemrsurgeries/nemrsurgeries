import { describe, it, expect } from "vitest";
import { sanitizeClinicalHtml } from "@/lib/sanitize";
import {
  caseFormSchema,
  caseListFilterSchema,
} from "@/modules/cases/schemas";
import {
  buildOwnedCasesWhere,
  formatCaseNumber,
  parsePostoperativePlan,
} from "@/modules/cases/service";

describe("Surgical Case Number & Schemas", () => {
  it("formats per-owner yearly sequential case numbers", () => {
    expect(formatCaseNumber(2026, 1)).toBe("ORTHO-2026-0001");
    expect(formatCaseNumber(2026, 42)).toBe("ORTHO-2026-0042");
    expect(formatCaseNumber(2027, 1005)).toBe("ORTHO-2027-1005");
  });

  it("supports incomplete drafts without forcing all fields", () => {
    const parsed = caseFormSchema.safeParse({
      diagnosis: "Distal radius fracture",
      status: "DRAFT",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("DRAFT");
      expect(parsed.data.patientAge).toBeNull();
      expect(parsed.data.myRole).toBeNull();
      expect(parsed.data.implants).toEqual([]);
    }
  });

  it("rejects out-of-range patient age", () => {
    const parsed = caseFormSchema.safeParse({
      patientAge: 150,
      status: "DRAFT",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts complete surgical case with implants and custom classification", () => {
    const parsed = caseFormSchema.safeParse({
      operationDate: "2026-11-20",
      patientAge: "54",
      patientSex: "MALE",
      diagnosis: "Closed tibial plateau fracture",
      procedure: "ORIF with dual locking plates",
      fractureClassification: "Schatzker VI",
      classificationSystem: "Schatzker",
      surgeon: "Dr. Karim Mansour",
      myRole: "OPERATOR",
      hospital: "Cairo Orthopedic Teaching Hospital",
      implants: [
        {
          implantType: "PLATE",
          manufacturer: "DePuy Synthes",
          model: "LCP Proximal Tibia",
          specifications: "8-hole titanium",
        },
      ],
      status: "AWAITING_FOLLOWUP",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.patientAge).toBe(54);
      expect(parsed.data.implants).toHaveLength(1);
    }
  });
});

describe("Owned Case Library Query Builder", () => {
  it("always scopes queries to ownerId and excludes archived cases by default", () => {
    const filters = caseListFilterSchema.parse({});
    const where = buildOwnedCasesWhere("doctor_1", filters);
    expect(where.ownerId).toBe("doctor_1");
    expect(where.status).toEqual({ not: "ARCHIVED" });
  });

  it("builds multi-field search and explicit status/date filters", () => {
    const filters = caseListFilterSchema.parse({
      q: "33-C2",
      status: "COMPLETED",
      myRole: "OPERATOR",
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
    });
    const where = buildOwnedCasesWhere("doctor_1", filters);
    expect(where.ownerId).toBe("doctor_1");
    expect(where.status).toBe("COMPLETED");
    expect(where.myRole).toBe("OPERATOR");
    expect(Array.isArray(where.OR)).toBe(true);
    expect(where.OR).toHaveLength(6);
    expect(where.operationDate).toBeDefined();
  });
});

describe("Clinical HTML Sanitizer & Postoperative Plan Parser", () => {
  it("preserves safe clinical formatting while stripping scripts and event attributes", () => {
    const dirty =
      '<h3 onclick="alert(1)">Surgical Approach</h3><p>Lateral parapatellar</p><script>steal()</script><img src=x onerror="alert(2)"><ul><li>Step 1</li></ul>';
    const clean = sanitizeClinicalHtml(dirty);
    expect(clean).toContain("<h3>Surgical Approach</h3>");
    expect(clean).toContain("<p>Lateral parapatellar</p>");
    expect(clean).toContain("<ul><li>Step 1</li></ul>");
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("<img");
  });

  it("safely parses postoperative plan JSON with defaults", () => {
    expect(parsePostoperativePlan(null)).toEqual({
      weightBearing: "",
      rehabilitationPlan: "",
      medicationNotes: "",
      followupInstructions: "",
      additionalNotes: "",
    });

    expect(
      parsePostoperativePlan({
        weightBearing: "NWB 6 weeks",
        medicationNotes: "LMWH 14 days",
      }),
    ).toMatchObject({
      weightBearing: "NWB 6 weeks",
      medicationNotes: "LMWH 14 days",
      rehabilitationPlan: "",
    });
  });
});
