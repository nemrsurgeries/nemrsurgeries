/**
 * Magic-byte file validation and EXIF/metadata stripping.
 * Never trusts client-supplied file extensions or Content-Type headers.
 */

export interface VerifiedFileType {
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  extension: "jpg" | "png" | "webp" | "pdf";
  isImage: boolean;
}

export function detectFileTypeFromBytes(
  buffer: Buffer,
): VerifiedFileType | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg", isImage: true };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: "image/png", extension: "png", isImage: true };
  }

  // WebP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp", isImage: true };
  }

  // PDF: %PDF-
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    return { mimeType: "application/pdf", extension: "pdf", isImage: false };
  }

  return null;
}

/**
 * Strips EXIF (APP1), IPTC (APP13), XMP, and Comment (COM) segments from JPEG buffers.
 */
export function stripJpegMetadata(buffer: Buffer): {
  buffer: Buffer;
  stripped: boolean;
} {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return { buffer, stripped: false };
  }

  const chunks: Buffer[] = [buffer.subarray(0, 2)]; // SOI
  let offset = 2;
  let stripped = false;

  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    const marker = buffer[offset + 1]!;

    // Start of Scan (SOS) or End of Image (EOI): copy remainder verbatim
    if (marker === 0xda || marker === 0xd9) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    // Standalone markers without length (RST0-RST7, TEM)
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      chunks.push(buffer.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2 || offset + 2 + segmentLength > buffer.length) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    // Strip APP1 (EXIF/XMP: 0xE1), APP2-APP15 (0xE2-0xEF), COM (0xFE)
    const isMetadataMarker =
      (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;

    if (isMetadataMarker) {
      stripped = true;
    } else {
      chunks.push(buffer.subarray(offset, offset + 2 + segmentLength));
    }

    offset += 2 + segmentLength;
  }

  return { buffer: Buffer.concat(chunks), stripped };
}

/**
 * Strips textual/EXIF ancillary chunks (eXIf, tEXt, iTXt, zTXt, tIME) from PNG buffers.
 */
export function stripPngMetadata(buffer: Buffer): {
  buffer: Buffer;
  stripped: boolean;
} {
  if (buffer.length < 8) return { buffer, stripped: false };

  const METADATA_CHUNKS = new Set(["eXIf", "tEXt", "iTXt", "zTXt", "tIME"]);
  const chunks: Buffer[] = [buffer.subarray(0, 8)]; // PNG signature
  let offset = 8;
  let stripped = false;

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const totalChunkSize = 12 + length;

    if (offset + totalChunkSize > buffer.length) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    if (METADATA_CHUNKS.has(type)) {
      stripped = true;
    } else {
      chunks.push(buffer.subarray(offset, offset + totalChunkSize));
    }

    offset += totalChunkSize;
    if (type === "IEND") break;
  }

  return { buffer: Buffer.concat(chunks), stripped };
}

export function stripImageExif(
  buffer: Buffer,
  mimeType: VerifiedFileType["mimeType"],
): { buffer: Buffer; exifStripped: boolean } {
  if (mimeType === "image/jpeg") {
    const res = stripJpegMetadata(buffer);
    return { buffer: res.buffer, exifStripped: res.stripped };
  }
  if (mimeType === "image/png") {
    const res = stripPngMetadata(buffer);
    return { buffer: res.buffer, exifStripped: res.stripped };
  }
  return { buffer, exifStripped: false };
}

export function getMaxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_SIZE_MB ?? "20") || 20;
  return mb * 1024 * 1024;
}

export function sanitizeFilename(name: string): string {
  const base = name.replace(/[\\/]/g, "_").replace(/[^\w.\- ()]/g, "_").trim();
  return base.slice(0, 180) || "medical-file";
}
