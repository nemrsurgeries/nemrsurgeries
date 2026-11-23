import { describe, it, expect } from "vitest";
import {
  detectFileTypeFromBytes,
  sanitizeFilename,
  stripImageExif,
} from "@/lib/storage/validation";
import {
  resolveSafeLocalPath,
  signLocalStorageToken,
  verifyLocalStorageToken,
} from "@/lib/storage/local-provider";
import { labResultSchema } from "@/modules/labs/schemas";
import { followupSchema } from "@/modules/followups/schemas";

describe("Magic-Byte File Validation & EXIF Stripping", () => {
  it("detects valid JPEG, PNG, WebP, and PDF headers and rejects spoofed HTML/SVG", () => {
    const jpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const webp = Buffer.from("RIFF1234WEBPVP8 ", "ascii");
    const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n", "ascii");
    const fakeSvg = Buffer.from("<svg onload=alert(1)></svg>", "utf8");

    expect(detectFileTypeFromBytes(jpeg)?.mimeType).toBe("image/jpeg");
    expect(detectFileTypeFromBytes(png)?.mimeType).toBe("image/png");
    expect(detectFileTypeFromBytes(webp)?.mimeType).toBe("image/webp");
    expect(detectFileTypeFromBytes(pdf)?.mimeType).toBe("application/pdf");
    expect(detectFileTypeFromBytes(fakeSvg)).toBeNull();
  });

  it("strips APP1 EXIF segment from JPEG buffers while preserving image markers", () => {
    // SOI + APP1 (EXIF payload "Exif\0\0GPS") + SOS + dummy data + EOI
    const soi = Buffer.from([0xff, 0xd8]);
    const exifData = Buffer.from("Exif\0\0PatientGPS", "ascii");
    const app1 = Buffer.concat([
      Buffer.from([0xff, 0xe1]),
      Buffer.from([0x00, exifData.length + 2]),
      exifData,
    ]);
    const sosAndImage = Buffer.from([0xff, 0xda, 0x00, 0x04, 0xaa, 0xbb, 0xff, 0xd9]);
    const jpegWithExif = Buffer.concat([soi, app1, sosAndImage]);

    const { buffer, exifStripped } = stripImageExif(jpegWithExif, "image/jpeg");
    expect(exifStripped).toBe(true);
    expect(buffer.includes(Buffer.from("PatientGPS"))).toBe(false);
    expect(buffer[0]).toBe(0xff);
    expect(buffer[1]).toBe(0xd8);
  });

  it("sanitizes filenames against path traversal characters", () => {
    expect(sanitizeFilename("../../etc/passwd.jpg")).not.toContain("/");
    expect(sanitizeFilename("xray<script>.png")).toBe("xray_script_.png");
  });
});

describe("Short-Lived Signed URL Tokens & Path Safety", () => {
  it("verifies valid signed tokens and rejects expired or tampered tokens", () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const validToken = signLocalStorageToken({
      key: "cases/c1/preoperative_xray/test.jpg",
      exp: nowSec + 300,
      contentType: "image/jpeg",
    });

    const verified = verifyLocalStorageToken(validToken, nowSec * 1000);
    expect(verified?.key).toBe("cases/c1/preoperative_xray/test.jpg");

    // Expired token cannot be reused
    expect(verifyLocalStorageToken(validToken, (nowSec + 301) * 1000)).toBeNull();

    // Tampered token rejected
    expect(verifyLocalStorageToken(`${validToken}x`, nowSec * 1000)).toBeNull();
  });

  it("blocks storage key path traversal", () => {
    expect(() => resolveSafeLocalPath("../../.env")).toThrow();
  });
});

describe("Laboratory & Follow-up Validation Schemas", () => {
  it("validates laboratory results and follow-up entries", () => {
    const lab = labResultSchema.safeParse({
      caseId: "clx1234567890abcdefghijkl",
      testName: "C-Reactive Protein (CRP)",
      result: "4.2",
      unit: "mg/L",
      referenceRange: "< 5.0 mg/L",
      testDate: "2026-11-22",
    });
    expect(lab.success).toBe(true);

    const fu = followupSchema.safeParse({
      caseId: "clx1234567890abcdefghijkl",
      followupDate: "2026-12-06",
      clinicalOutcome: "Full knee extension, flexion to 110 deg",
      radiologicalOutcome: "Bridging callus visible on 3 cortices",
    });
    expect(fu.success).toBe(true);
  });
});
