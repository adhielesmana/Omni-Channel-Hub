import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  NoSuchKey,
} from "@aws-sdk/client-s3";
import { logger } from "./logger";

const required = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    logger.warn({ key }, `Missing R2 environment variable — R2 uploads will fail`);
  }
}

const ACCOUNT_ID = process.env["R2_ACCOUNT_ID"] ?? "";
const ACCESS_KEY_ID = process.env["R2_ACCESS_KEY_ID"] ?? "";
const SECRET_ACCESS_KEY = process.env["R2_SECRET_ACCESS_KEY"] ?? "";
const BUCKET = process.env["R2_BUCKET_NAME"] ?? "";
const ENDPOINT =
  process.env["R2_ENDPOINT"] ?? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

let _client: S3Client | null = null;

function getClient(): S3Client | null {
  if (_client) return _client;
  if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    logger.error("R2 client not configured — missing credentials");
    return null;
  }
  _client = new S3Client({
    region: process.env["R2_REGION"] ?? "auto",
    endpoint: ENDPOINT,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
    requestHandler: {
      requestTimeout: 30_000,
    },
  });
  return _client;
}

export async function uploadToR2(
  key: string,
  body: Uint8Array | Buffer,
  contentType: string,
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return true;
  } catch (err) {
    logger.error({ err, key }, "R2 upload failed");
    return false;
  }
}

export async function getFromR2(
  key: string,
): Promise<{ body: Uint8Array; contentType: string } | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const result = await client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    );
    const bodyBytes = await result.Body?.transformToByteArray();
    if (!bodyBytes) return null;
    return {
      body: bodyBytes,
      contentType: result.ContentType ?? "application/octet-stream",
    };
  } catch (err) {
    if (err instanceof NoSuchKey) return null;
    logger.error({ err, key }, "R2 get failed");
    return null;
  }
}

export async function deleteFromR2(key: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    await client.send(
      new DeleteObjectCommand({ Bucket: BUCKET, Key: key }),
    );
    return true;
  } catch (err) {
    logger.error({ err, key }, "R2 delete failed");
    return false;
  }
}
