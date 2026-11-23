import { describe, it, expect } from "vitest";
import {
  doctorSearchSchema,
  grantCaseShareSchema,
  revokeCaseShareSchema,
  updateSharePermissionSchema,
} from "@/modules/sharing/schemas";

describe("Selective Case Sharing Schemas", () => {
  const validCaseId = "clx1234567890abcdefghijkl";
  const validShareId = "clx9876543210abcdefghijkl";

  it("validates granting VIEWER and EDITOR permissions and rejects invalid permissions", () => {
    expect(
      grantCaseShareSchema.safeParse({
        caseId: validCaseId,
        recipientUserId: "user_colleague_1",
        permission: "VIEWER",
      }).success,
    ).toBe(true);

    expect(
      grantCaseShareSchema.safeParse({
        caseId: validCaseId,
        recipientUserId: "user_colleague_1",
        permission: "EDITOR",
      }).success,
    ).toBe(true);

    expect(
      grantCaseShareSchema.safeParse({
        caseId: validCaseId,
        recipientUserId: "user_colleague_1",
        permission: "OWNER",
      }).success,
    ).toBe(false);
  });

  it("validates permission updates and revocation payloads", () => {
    expect(
      updateSharePermissionSchema.safeParse({
        caseId: validCaseId,
        shareId: validShareId,
        permission: "EDITOR",
      }).success,
    ).toBe(true);

    expect(
      revokeCaseShareSchema.safeParse({
        caseId: validCaseId,
        shareId: validShareId,
      }).success,
    ).toBe(true);
  });

  it("requires at least 2 characters when searching registered doctors", () => {
    expect(doctorSearchSchema.safeParse({ query: "a" }).success).toBe(false);
    expect(doctorSearchSchema.safeParse({ query: "dr" }).success).toBe(true);
  });
});
