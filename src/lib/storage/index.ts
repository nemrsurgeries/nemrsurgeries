import type { StorageProvider } from "./types";
import { LocalDevStorageProvider } from "./local-provider";
import { S3StorageProvider } from "./s3-provider";

let cachedProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cachedProvider) return cachedProvider;

  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "s3") {
    cachedProvider = new S3StorageProvider();
  } else {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Local storage driver is disabled in production. Configure STORAGE_DRIVER=s3 with a private S3-compatible bucket.",
      );
    }
    cachedProvider = new LocalDevStorageProvider();
  }

  return cachedProvider;
}
