import { z } from "zod";

export const createInvitationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address"),
  caseId: z.string().cuid().optional(),
  permission: z.enum(["VIEWER", "EDITOR"]).optional(),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const acceptInvitationRegisterSchema = z.object({
  token: z.string().min(16, "Invalid invitation token"),
  name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(120, "Full name is too long"),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(128, "Password is too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  professionalTitle: z.string().trim().max(120).optional(),
  hospital: z.string().trim().max(160).optional(),
});

export type AcceptInvitationRegisterInput = z.infer<
  typeof acceptInvitationRegisterSchema
>;
