import { z } from "zod";

export const grantCaseShareSchema = z.object({
  caseId: z.string().cuid(),
  recipientUserId: z.string().min(1, "Please select a doctor"),
  permission: z.enum(["VIEWER", "EDITOR"]),
});

export const updateSharePermissionSchema = z.object({
  caseId: z.string().cuid(),
  shareId: z.string().cuid(),
  permission: z.enum(["VIEWER", "EDITOR"]),
});

export const revokeCaseShareSchema = z.object({
  caseId: z.string().cuid(),
  shareId: z.string().cuid(),
});

export const doctorSearchSchema = z.object({
  query: z.string().trim().min(2, "Enter at least 2 characters").max(120),
});
