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
    const bucket = process.env.S3_BUCKET || "medical-media";
    const accessKeyId =
      process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey =
      process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    const endpoint =
      process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3 || undefined;
    const region =
      process.env.S3_REGION || process.env.AWS_REGION || "us-east-2";

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        "S3 storage driver requires S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY or Neon AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY.",
      );
    }

    // Neon Object Storage requires path-style addressing
    const isNeonEndpoint = Boolean(
      process.env.AWS_ENDPOINT_URL_S3 && !process.env.S3_ENDPOINT,
    );
    const forcePathStyle =
      process.env.S3_FORCE_PATH_STYLE === "true" || isNeonEndpoint;

    this.bucket = bucket;
    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
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
