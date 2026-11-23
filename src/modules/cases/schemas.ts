import { z } from "zod";

export const PATIENT_SEX_VALUES = [
  "MALE",
  "FEMALE",
  "OTHER",
  "UNSPECIFIED",
] as const;

export const SURGICAL_ROLE_VALUES = [
  "OPERATOR",
  "FIRST_ASSISTANT",
  "ASSISTANT",
] as const;

export const CASE_STATUS_VALUES = [
  "DRAFT",
  "IN_PROGRESS",
  "AWAITING_FOLLOWUP",
  "COMPLETED",
  "ARCHIVED",
] as const;

export const IMPLANT_TYPE_VALUES = [
  "PLATE",
  "SCREW",
  "NAIL",
  "OTHER",
] as const;

export const CLASSIFICATION_SYSTEM_PRESETS = [
  "AO/OTA",
  "Lauge-Hansen",
  "Garden",
  "Schatzker",
  "Neer",
  "Weber",
  "Other",
] as const;

export const postoperativePlanSchema = z.object({
  weightBearing: z.string().trim().max(1000).optional().default(""),
  rehabilitationPlan: z.string().trim().max(2000).optional().default(""),
  medicationNotes: z.string().trim().max(2000).optional().default(""),
  followupInstructions: z.string().trim().max(2000).optional().default(""),
  additionalNotes: z.string().trim().max(2000).optional().default(""),
});

export type PostoperativePlan = z.infer<typeof postoperativePlanSchema>;

export const implantInputSchema = z.object({
  id: z.string().optional(),
  implantType: z.enum(IMPLANT_TYPE_VALUES),
  manufacturer: z.string().trim().max(120).optional().default(""),
  model: z.string().trim().max(120).optional().default(""),
  specifications: z.string().trim().max(300).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});

export type ImplantInput = z.infer<typeof implantInputSchema>;

const optionalDateString = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine(
    (val) => !val || !Number.isNaN(Date.parse(val)),
    "Please enter a valid date",
  );

export const caseFormSchema = z.object({
  // Step 1: General Information (no patient identifiers)
  operationDate: optionalDateString,
  patientAge: z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === "" || v === undefined || v === null) return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isNaN(n) ? Number.NaN : n;
    })
    .refine(
      (v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 120),
      "Patient age must be a whole number between 0 and 120",
    ),
  patientSex: z.enum(PATIENT_SEX_VALUES).default("UNSPECIFIED"),

  // Step 2: Diagnosis & Procedure
  diagnosis: z.string().trim().max(300).optional().default(""),
  procedure: z.string().trim().max(300).optional().default(""),
  fractureClassification: z.string().trim().max(160).optional().default(""),
  classificationSystem: z.string().trim().max(120).optional().default(""),

  // Step 3: Surgical Team & Implants
  surgeon: z.string().trim().max(160).optional().default(""),
  myRole: z
    .union([z.enum(SURGICAL_ROLE_VALUES), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  seniorSurgeon: z.string().trim().max(160).optional().default(""),
  hospital: z.string().trim().max(180).optional().default(""),
  implants: z.array(implantInputSchema).max(50).optional().default([]),

  // Step 4: Surgical Documentation
  intraoperativeNotes: z.string().max(25000).optional().default(""),
  postoperativePlan: postoperativePlanSchema.optional().default({
    weightBearing: "",
    rehabilitationPlan: "",
    medicationNotes: "",
    followupInstructions: "",
    additionalNotes: "",
  }),
  learningPoints: z.string().max(10000).optional().default(""),

  // Management
  status: z.enum(CASE_STATUS_VALUES).default("DRAFT"),
  nextFollowupDate: optionalDateString,
});

export type CaseFormInput = z.input<typeof caseFormSchema>;
export type CaseFormData = z.output<typeof caseFormSchema>;

export const updateCaseStatusSchema = z.object({
  caseId: z.string().cuid(),
  status: z.enum(CASE_STATUS_VALUES),
});

export const caseListFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(CASE_STATUS_VALUES).optional(),
  myRole: z.enum(SURGICAL_ROLE_VALUES).optional(),
  hospital: z.string().trim().max(120).optional(),
  surgeon: z.string().trim().max(120).optional(),
  procedure: z.string().trim().max(120).optional(),
  dateFrom: optionalDateString,
  dateTo: optionalDateString,
  sort: z
    .enum([
      "updated_desc",
      "operation_desc",
      "operation_asc",
      "case_number_desc",
    ])
    .default("updated_desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(6).max(50).default(12),
});

export type CaseListFilters = z.infer<typeof caseListFilterSchema>;
