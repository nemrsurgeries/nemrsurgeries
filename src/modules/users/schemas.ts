import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(120, "Full name is too long"),
  professionalTitle: z
    .string()
    .trim()
    .max(120, "Professional title is too long")
    .optional()
    .or(z.literal("")),
  hospital: z
    .string()
    .trim()
    .max(160, "Hospital or institution name is too long")
    .optional()
    .or(z.literal("")),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const deleteAccountSchema = z.object({
  confirmEmail: z.string().trim().toLowerCase().email(),
  confirmPhrase: z.literal("DELETE MY ACCOUNT", {
    errorMap: () => ({ message: 'Please type "DELETE MY ACCOUNT" to confirm.' }),
  }),
});
