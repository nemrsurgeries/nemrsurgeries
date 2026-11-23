export interface PutObjectParams {
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface SignedUrlParams {
  key: string;
  expiresInSeconds?: number;
  downloadFilename?: string;
  contentType?: string;
}

export interface StorageProvider {
  readonly driverName: "s3" | "local";
  putObject(params: PutObjectParams): Promise<void>;
  getObjectBuffer(key: string): Promise<Buffer>;
  getSignedReadUrl(params: SignedUrlParams): Promise<string>;
  deleteObject(key: string): Promise<void>;
}
