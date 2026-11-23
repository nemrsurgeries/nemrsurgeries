import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  PutObjectParams,
  SignedUrlParams,
  StorageProvider,
} from "./types";

export class S3StorageProvider implements StorageProvider {
  readonly driverName = "s3" as const;
  private client: S3Client;
  private bucket: string;

  constructor() {
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "S3 storage driver requires S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.",
      );
    }

    this.bucket = bucket;
    this.client = new S3Client({
      region: process.env.S3_REGION ?? "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async putObject(params: PutObjectParams): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
        Metadata: params.metadata,
      }),
    );
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    if (!res.Body) {
      throw new Error("Empty object body returned from S3");
    }
    const bytes = await res.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async getSignedReadUrl(params: SignedUrlParams): Promise<string> {
    const ttl =
      params.expiresInSeconds ??
      (Number(process.env.SIGNED_URL_TTL_SECONDS ?? "300") || 300);

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ResponseContentType: params.contentType,
      ResponseContentDisposition: params.downloadFilename
        ? `attachment; filename="${params.downloadFilename.replace(/"/g, "")}"`
        : "inline",
    });

    return getSignedUrl(this.client, command, { expiresIn: ttl });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
