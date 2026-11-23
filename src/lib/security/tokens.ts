import crypto from "crypto";

/**
 * Generate a 256-bit cryptographically secure URL-safe token.
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/**
 * Hash a raw token using SHA-256 so raw tokens are never stored in the database.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Constant-time string comparison for hashes/secrets.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
