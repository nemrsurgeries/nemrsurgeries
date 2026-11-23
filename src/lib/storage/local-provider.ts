import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import type {
  PutObjectParams,
  SignedUrlParams,
  StorageProvider,
} from "./types";

const LOCAL_ROOT = path.join(process.cwd(), ".local-storage");

function getSigningSecret(): string {
  return (
    process.env.LOCAL_STORAGE_SIGNING_SECRET ??
    process.env.BETTER_AUTH_SECRET ??
    "dev-local-storage-signing-secret"
  );
}

export interface LocalSignedTokenPayload {
  key: string;
  exp: number;
  contentType?: string;
  downloadFilename?: string;
}

export function signLocalStorageToken(payload: LocalSignedTokenPayload): string {
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const sig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

export function verifyLocalStorageToken(
  token: string,
  nowMs = Date.now(),
): LocalSignedTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  if (!data || !sig) return null;

  const expectedSig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(data)
    .digest("base64url");

  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8"),
    ) as LocalSignedTokenPayload;
    if (!parsed.key || typeof parsed.exp !== "number") return null;
    if (parsed.exp <= Math.floor(nowMs / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function resolveSafeLocalPath(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.includes("..")) {
    throw new Error("Invalid storage key");
  }
  const fullPath = path.resolve(LOCAL_ROOT, normalized);
  if (!fullPath.startsWith(path.resolve(LOCAL_ROOT))) {
    throw new Error("Storage path traversal blocked");
  }
  return fullPath;
}

export class LocalDevStorageProvider implements StorageProvider {
  readonly driverName = "local" as const;

  async putObject(params: PutObjectParams): Promise<void> {
    const filePath = resolveSafeLocalPath(params.key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, params.body);
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const filePath = resolveSafeLocalPath(key);
    return fs.readFile(filePath);
  }

  async getSignedReadUrl(params: SignedUrlParams): Promise<string> {
    const ttl =
      params.expiresInSeconds ??
      (Number(process.env.SIGNED_URL_TTL_SECONDS ?? "300") || 300);
    const token = signLocalStorageToken({
      key: params.key,
      exp: Math.floor(Date.now() / 1000) + ttl,
      contentType: params.contentType,
      downloadFilename: params.downloadFilename,
    });
    return `/api/media/local/${encodeURIComponent(token)}`;
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = resolveSafeLocalPath(key);
    await fs.rm(filePath, { force: true });
  }
}
