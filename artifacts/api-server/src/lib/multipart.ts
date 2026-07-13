import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";

const CRLF = "\r\n";
const DOUBLE_CRLF = "\r\n\r\n";

export interface MultipartFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface MultipartParseResult {
  fields: Record<string, string>;
  files: MultipartFile[];
}

export interface MultipartOptions {
  maxFileSize: number;
}

function getBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) return null;
  return match[1] ?? match[2] ?? null;
}

/**
 * Parse a multipart/form-data body from an HTTP request.
 *
 * Usage:
 *   const { fields, files } = await parseMultipart(req, { maxFileSize: 10 * 1024 * 1024 });
 */
export async function parseMultipart(
  req: IncomingMessage,
  options: MultipartOptions = { maxFileSize: 10 * 1024 * 1024 },
): Promise<MultipartParseResult> {
  const contentType = req.headers["content-type"] ?? "";
  const boundary = getBoundary(contentType);
  if (!boundary) {
    throw new Error("No valid multipart boundary found in Content-Type header");
  }

  const rawBody = await readStream(req);

  const result = parseMultipartBuffer(rawBody, boundary, options.maxFileSize);
  return result;
}

async function readStream(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function parseMultipartBuffer(
  buffer: Buffer,
  boundary: string,
  maxFileSize: number,
): MultipartParseResult {
  const fields: Record<string, string> = {};
  const files: MultipartFile[] = [];

  const boundaryDelimiter = Buffer.from(`--${boundary}`);
  const endDelimiter = Buffer.from(`--${boundary}--`);

  let start = 0;
  while (start < buffer.length) {
    const boundaryStart = buffer.indexOf(boundaryDelimiter, start);
    if (boundaryStart === -1) break;

    const partStart = boundaryStart + boundaryDelimiter.length;

    // Check if this is the closing boundary
    if (buffer[partStart] === 0x2d && buffer[partStart + 1] === 0x2d) break;

    // Skip the CRLF after boundary
    let dataStart = partStart;
    if (buffer[dataStart] === 0x0d && buffer[dataStart + 1] === 0x0a) {
      dataStart += 2;
    }

    // Find the double CRLF that separates headers from body
    const headerEnd = buffer.indexOf(Buffer.from(DOUBLE_CRLF), dataStart);
    if (headerEnd === -1) break;

    const headerBlock = buffer.subarray(dataStart, headerEnd);
    const bodyStart = headerEnd + 4;

    // Find the next boundary to determine body end
    const nextBoundary = buffer.indexOf(boundaryDelimiter, bodyStart);
    if (nextBoundary === -1) break;

    // Body ends at the CRLF before the next boundary
    let bodyEnd = nextBoundary;
    if (bodyEnd > 0 && buffer[bodyEnd - 1] === 0x0a && buffer[bodyEnd - 2] === 0x0d) {
      bodyEnd -= 2;
    }

    const partBody = Buffer.from(buffer.subarray(bodyStart, bodyEnd));

    // Parse headers
    const headers = parsePartHeaders(headerBlock.toString("utf8"));
    const disposition = headers["content-disposition"] ?? "";
    const fieldName = extractFieldName(disposition);
    const filename = extractFilename(disposition);
    const partContentType = headers["content-type"] ?? "application/octet-stream";

    if (!fieldName) {
      start = nextBoundary;
      continue;
    }

    if (filename) {
      if (partBody.length > maxFileSize) {
        throw new Error(`File ${filename} exceeds maximum size of ${maxFileSize} bytes`);
      }
      files.push({
        fieldname: fieldName,
        originalname: filename,
        mimetype: partContentType,
        buffer: Buffer.from(partBody),
        size: partBody.length,
      });
    } else {
      fields[fieldName] = partBody.toString("utf8");
    }

    start = nextBoundary;
  }

  return { fields, files };
}

function parsePartHeaders(headerBlock: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = headerBlock.split(CRLF);
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const name = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();
    if (name) headers[name] = value;
  }
  return headers;
}

function extractFieldName(disposition: string): string | null {
  const match = disposition.match(/name\s*=\s*"([^"]*)"/i);
  return match ? match[1]! : null;
}

function extractFilename(disposition: string): string | null {
  const match = disposition.match(/filename\s*=\s*"([^"]*)"/i);
  return match ? match[1]! : null;
}
