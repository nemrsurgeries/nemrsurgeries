import { describe, it, expect } from "vitest";
import {
  acceptInvitationRegisterSchema,
  createInvitationSchema,
} from "@/modules/invitations/schemas";
import {
  deleteAccountSchema,
  updateProfileSchema,
} from "@/modules/users/schemas";

describe("Invitation & Registration Validation Schemas", () => {
  it("normalizes and validates invitation emails", () => {
    const parsed = createInvitationSchema.safeParse({
      email: "  Dr.Sara@Hospital.ORG  ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("dr.sara@hospital.org");
    }
  });

  it("rejects weak passwords on invitation registration", () => {
    const res = acceptInvitationRegisterSchema.safeParse({
      token: "a".repeat(32),
      name: "Dr. Sara Ali",
      password: "weak",
    });
    expect(res.success).toBe(false);
  });

  it("accepts strong passwords with valid invitation token", () => {
    const res = acceptInvitationRegisterSchema.safeParse({
      token: "a".repeat(32),
      name: "Dr. Sara Ali",
      password: "StrongPassword2026",
      professionalTitle: "Orthopedic Specialist",
      hospital: "Alexandria Teaching Hospital",
    });
    expect(res.success).toBe(true);
  });
});

describe("User Profile & Account Deletion Schemas", () => {
  it("validates profile edits", () => {
    const res = updateProfileSchema.safeParse({
      name: "Dr. Karim Mansour",
      professionalTitle: "Consultant Orthopedic Surgeon",
      hospital: "",
    });
    expect(res.success).toBe(true);
  });

  it("requires exact confirmation phrase for account deletion", () => {
    const wrong = deleteAccountSchema.safeParse({
      confirmEmail: "dr@example.com",
      confirmPhrase: "delete my account",
    });
    expect(wrong.success).toBe(false);

    const right = deleteAccountSchema.safeParse({
      confirmEmail: "dr@example.com",
      confirmPhrase: "DELETE MY ACCOUNT",
    });
    expect(right.success).toBe(true);
  });
});
