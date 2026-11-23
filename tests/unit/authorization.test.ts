import { describe, it, expect } from "vitest";
import {
  evaluateCasePermission,
  type CaseAction,
} from "@/modules/authorization/policy";

describe("Centralized Case Authorization Policy", () => {
  const OWNER_ID = "user_owner_1";
  const EDITOR_ID = "user_editor_2";
  const VIEWER_ID = "user_viewer_3";
  const STRANGER_ID = "user_stranger_4";

  const ALL_ACTIONS: CaseAction[] = [
    "CASE_VIEW",
    "CASE_EDIT",
    "CASE_DELETE",
    "CASE_ARCHIVE",
    "CASE_SHARE",
    "CASE_MANAGE_SHARES",
    "CASE_EXPORT_PDF",
    "MEDIA_UPLOAD",
    "MEDIA_VIEW",
    "MEDIA_DELETE",
    "FOLLOWUP_MANAGE",
    "LAB_MANAGE",
    "IMPLANT_MANAGE",
  ];

  it("grants the owner full control over all case actions", () => {
    for (const action of ALL_ACTIONS) {
      const res = evaluateCasePermission({
        userId: OWNER_ID,
        caseOwnerId: OWNER_ID,
        activeSharePermission: null,
        action,
      });
      expect(res.allowed).toBe(true);
      expect(res.role).toBe("OWNER");
      expect(res.statusCode).toBe(200);
    }
  });

  it("denies unrelated users with 404 to prevent case ID enumeration (IDOR)", () => {
    for (const action of ALL_ACTIONS) {
      const res = evaluateCasePermission({
        userId: STRANGER_ID,
        caseOwnerId: OWNER_ID,
        activeSharePermission: null,
        action,
      });
      expect(res.allowed).toBe(false);
      expect(res.role).toBe("NONE");
      expect(res.statusCode).toBe(404);
    }
  });

  it("denies revoked users (activeSharePermission = null) with 404", () => {
    const res = evaluateCasePermission({
      userId: VIEWER_ID,
      caseOwnerId: OWNER_ID,
      activeSharePermission: null,
      action: "CASE_VIEW",
    });
    expect(res.allowed).toBe(false);
    expect(res.statusCode).toBe(404);
  });

  it("allows VIEWER to read, view media, and export PDF, but blocks all mutations with 403", () => {
    const allowedForViewer: CaseAction[] = [
      "CASE_VIEW",
      "CASE_EXPORT_PDF",
      "MEDIA_VIEW",
    ];
    for (const action of ALL_ACTIONS) {
      const res = evaluateCasePermission({
        userId: VIEWER_ID,
        caseOwnerId: OWNER_ID,
        activeSharePermission: "VIEWER",
        action,
      });
      const expected = allowedForViewer.includes(action);
      expect(res.allowed).toBe(expected);
      expect(res.role).toBe("VIEWER");
      expect(res.statusCode).toBe(expected ? 200 : 403);
    }
  });

  it("allows EDITOR to edit clinical data and upload media, but blocks delete/archive/share", () => {
    const forbiddenForEditor: CaseAction[] = [
      "CASE_DELETE",
      "CASE_ARCHIVE",
      "CASE_SHARE",
      "CASE_MANAGE_SHARES",
    ];
    for (const action of ALL_ACTIONS) {
      const res = evaluateCasePermission({
        userId: EDITOR_ID,
        caseOwnerId: OWNER_ID,
        activeSharePermission: "EDITOR",
        action,
        mediaUploadedBy: EDITOR_ID,
      });
      const expected = !forbiddenForEditor.includes(action);
      expect(res.allowed).toBe(expected);
      expect(res.role).toBe("EDITOR");
      expect(res.statusCode).toBe(expected ? 200 : 403);
    }
  });

  it("prevents an EDITOR from deleting attachments uploaded by the case owner", () => {
    const res = evaluateCasePermission({
      userId: EDITOR_ID,
      caseOwnerId: OWNER_ID,
      activeSharePermission: "EDITOR",
      action: "MEDIA_DELETE",
      mediaUploadedBy: OWNER_ID,
    });
    expect(res.allowed).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it("returns 404 when the case does not exist", () => {
    const res = evaluateCasePermission({
      userId: OWNER_ID,
      caseOwnerId: null,
      activeSharePermission: null,
      action: "CASE_VIEW",
    });
    expect(res.allowed).toBe(false);
    expect(res.statusCode).toBe(404);
  });
});
