import { createHmac, createHash } from "node:crypto";
import { logger } from "./logger";

const required = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    logger.warn({ key }, "Missing R2 environment variable — R2 uploads will fail");
  }
}

const ACCOUNT_ID = process.env["R2_ACCOUNT_ID"] ?? "";
const ACCESS_KEY_ID = process.env["R2_ACCESS_KEY_ID"] ?? "";
const SECRET_ACCESS_KEY = process.env["R2_SECRET_ACCESS_KEY"] ?? "";
const BUCKET = process.env["R2_BUCKET_NAME"] ?? "";
const ENDPOINT =
  process.env["R2_ENDPOINT"] ?? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;
const REGION = process.env["R2_REGION"] ?? "auto";

function hmacSha256(key: string | Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function hashSha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function buildCanonicalRequest(
  method: string,
  canonicalUri: string,
  canonicalQuerystring: string,
  headers: Record<string, string>,
  signedHeaders: string[],
  payloadHash: string,
): string {
  const canonicalHeaders = signedHeaders
    .map((h) => `${h.toLowerCase()}:${headers[h]!.trim()}\n`)
    .join("");
  return [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders.join(";"),
    payloadHash,
  ].join("\n");
}

function buildStringToSign(
  algorithm: string,
  amzDate: string,
  credentialScope: string,
  canonicalRequest: string,
): string {
  return [
    algorithm,
    amzDate,
    credentialScope,
    hashSha256(canonicalRequest),
  ].join("\n");
}

function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Buffer {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, "aws4_request");
  return kSigning;
}

function buildAuthorizationHeader(
  accessKeyId: string,
  credentialScope: string,
  signedHeaders: string[],
  signature: string,
): string {
  return [
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders.join(";")}`,
    `Signature=${signature}`,
  ].join(", ");
}

async function r2Request(
  method: string,
  key: string,
  body?: Uint8Array | Buffer,
  contentType?: string,
): Promise<Response | null> {
  if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET) {
    logger.error("R2 client not configured — missing credentials");
    return null;
  }

  const canonicalUri = `/${BUCKET}/${key}`;
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate = now.toISOString().replace(/[:-]/g, "").slice(0, 15) + "Z";

  const payloadHash = body
    ? hashSha256(Buffer.from(body).toString("utf8"))
    : hashSha256("");

  const headers: Record<string, string> = {
    host: new URL(ENDPOINT).host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
  };
  if (contentType) headers["content-type"] = contentType;

  if (method === "PUT" && body) {
    headers["content-length"] = String(body.length);
  }

  const signedHeaderKeys = Object.keys(headers).sort();

  const canonicalRequest = buildCanonicalRequest(
    method,
    canonicalUri,
    "",
    headers,
    signedHeaderKeys,
    payloadHash,
  );

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${REGION}/s3/aws4_request`;
  const stringToSign = buildStringToSign(algorithm, amzDate, credentialScope, canonicalRequest);

  const signingKey = getSignatureKey(SECRET_ACCESS_KEY, dateStamp, REGION, "s3");
  const signature = hmacSha256(signingKey, stringToSign).toString("hex");

  headers["authorization"] = buildAuthorizationHeader(
    ACCESS_KEY_ID,
    credentialScope,
    signedHeaderKeys,
    signature,
  );

  const url = `${ENDPOINT}${canonicalUri}`;
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ?? undefined,
      signal: AbortSignal.timeout(30_000),
    });
    return res;
  } catch (err) {
    logger.error({ err, key, method }, "R2 request failed");
    return null;
  }
}

export async function uploadToR2(
  key: string,
  body: Uint8Array | Buffer,
  contentType: string,
): Promise<boolean> {
  const res = await r2Request("PUT", key, body, contentType);
  if (!res) return false;

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error({ key, status: res.status, response: text }, "R2 upload failed");
    return false;
  }
  return true;
}

export async function getFromR2(
  key: string,
): Promise<{ body: Uint8Array; contentType: string } | null> {
  const res = await r2Request("GET", key);
  if (!res) return null;

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error({ key, status: res.status, response: text }, "R2 get failed");
    return null;
  }

  const arrayBuffer = await res.arrayBuffer();
  return {
    body: new Uint8Array(arrayBuffer),
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
  };
}

export async function deleteFromR2(key: string): Promise<boolean> {
  const res = await r2Request("DELETE", key);
  if (!res) return false;

  if (!res.ok && res.status !== 204) {
    const text = await res.text().catch(() => "");
    logger.error({ key, status: res.status, response: text }, "R2 delete failed");
    return false;
  }
  return true;
}
