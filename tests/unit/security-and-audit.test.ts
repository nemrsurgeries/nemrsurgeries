import { describe, it, expect, beforeEach } from "vitest";
import {
  generateSecureToken,
  hashToken,
  timingSafeEqualHex,
} from "@/lib/security/tokens";
import { checkRateLimit, clearRateLimitStore } from "@/lib/rate-limit";
import { sanitizeAuditMetadata } from "@/modules/audit/service";

describe("Security Tokens", () => {
  it("generates unique high-entropy URL-safe tokens", () => {
    const t1 = generateSecureToken(32);
    const t2 = generateSecureToken(32);
    expect(t1).not.toBe(t2);
    expect(t1.length).toBeGreaterThanOrEqual(40);
    expect(/^[A-Za-z0-9_-]+$/.test(t1)).toBe(true);
  });

  it("hashes tokens deterministically with SHA-256 and never equals the raw token", () => {
    const raw = generateSecureToken(32);
    const h1 = hashToken(raw);
    const h2 = hashToken(raw);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(raw);
    expect(h1).toHaveLength(64);
    expect(timingSafeEqualHex(h1, h2)).toBe(true);
    expect(timingSafeEqualHex(h1, hashToken("other"))).toBe(false);
  });
});

describe("Rate Limiter", () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  it("blocks requests exceeding the window limit and resets after window passes", () => {
    const t0 = 1_000_000;
    expect(checkRateLimit("invite:doc1", 2, 10_000, t0).allowed).toBe(true);
    expect(checkRateLimit("invite:doc1", 2, 10_000, t0 + 100).allowed).toBe(true);

    const blocked = checkRateLimit("invite:doc1", 2, 10_000, t0 + 200);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);

    // After the window expires, requests are allowed again
    const allowedAgain = checkRateLimit("invite:doc1", 2, 10_000, t0 + 10_001);
    expect(allowedAgain.allowed).toBe(true);
  });
});

describe("Audit Metadata Sanitization", () => {
  it("strips sensitive medical and credential fields from audit metadata", () => {
    const clean = sanitizeAuditMetadata({
      invitationId: "inv_123",
      permission: "VIEWER",
      password: "secret",
      token: "raw-token",
      diagnosis: "Distal femur fracture",
      patientName: "Should never be logged",
      signedUrl: "https://s3.example.com/signed",
    });

    expect(clean).toEqual({
      invitationId: "inv_123",
      permission: "VIEWER",
    });
  });
});
