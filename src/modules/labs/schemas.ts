import { z } from "zod";

export const labResultSchema = z.object({
  caseId: z.string().cuid(),
  testName: z
    .string()
    .trim()
    .min(1, "Test name is required")
    .max(160, "Test name is too long"),
  result: z
    .string()
    .trim()
    .min(1, "Result value is required")
    .max(120, "Result value is too long"),
  unit: z.string().trim().max(60).optional().default(""),
  referenceRange: z.string().trim().max(120).optional().default(""),
  testDate: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Valid test date is required"),
  notes: z.string().trim().max(1000).optional().default(""),
  attachmentId: z.string().cuid().optional().or(z.literal("")),
});

export type LabResultInput = z.infer<typeof labResultSchema>;
