import type { StorageProvider } from "./types";
import { LocalDevStorageProvider } from "./local-provider";
import { S3StorageProvider } from "./s3-provider";

let cachedProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cachedProvider) return cachedProvider;

  const hasNeonS3 = Boolean(
    process.env.AWS_ENDPOINT_URL_S3 &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY,
  );
  const driver = process.env.STORAGE_DRIVER ?? (hasNeonS3 ? "s3" : "local");

  if (driver === "s3" || hasNeonS3) {
    cachedProvider = new S3StorageProvider();
  } else {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Local storage driver is disabled in production. Configure Neon Object Storage (AWS_* vars) or STORAGE_DRIVER=s3.",
      );
    }
    cachedProvider = new LocalDevStorageProvider();
  }

  return cachedProvider;
}
