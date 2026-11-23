import { z } from "zod";

export const followupSchema = z.object({
  caseId: z.string().cuid(),
  followupDate: z
    .string()
    .trim()
    .refine(
      (v) => !Number.isNaN(Date.parse(v)),
      "Valid follow-up date is required",
    ),
  clinicalOutcome: z.string().trim().max(3000).optional().default(""),
  radiologicalOutcome: z.string().trim().max(3000).optional().default(""),
  complications: z.string().trim().max(2000).optional().default(""),
  notes: z.string().trim().max(3000).optional().default(""),
  nextFollowupDate: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (v) => !v || !Number.isNaN(Date.parse(v)),
      "Invalid next follow-up date",
    ),
});

export type FollowupInput = z.infer<typeof followupSchema>;
