import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { logger } from "./logger";
import { uploadToR2 } from "./r2";
import { optimizeImage } from "./media-optimizer";

export const MEDIA_DIR = path.resolve(process.env["MEDIA_DIR"] ?? "./media");

const MAX_BYTES = 25 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30_000;

void fs.mkdir(MEDIA_DIR, { recursive: true }).catch((err) => {
  logger.error({ err, MEDIA_DIR }, "Failed to create media directory");
});

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/3gpp": "3gp",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/amr": "amr",
  "audio/aac": "aac",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/zip": "zip",
};

export const INLINE_EXTENSIONS = new Set([
  "jpg",
  "png",
  "webp",
  "gif",
  "mp4",
  "3gp",
  "ogg",
  "mp3",
  "m4a",
  "amr",
  "aac",
]);

function extFromMime(mime: string): string {
  const clean = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  return MIME_EXT[clean] ?? "bin";
}

function isImageMime(cleanMime: string): boolean {
  return cleanMime.startsWith("image/");
}

export async function downloadWhatsAppMedia(
  mediaId: string,
  accessToken: string,
): Promise<{ url: string; mimeType: string } | null> {
  try {
    const metaRes = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!metaRes.ok) {
      logger.error({ mediaId, status: metaRes.status }, "Failed to fetch WhatsApp media metadata");
      return null;
    }
    const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
    if (!meta.url) {
      logger.error({ mediaId }, "WhatsApp media metadata missing url");
      return null;
    }

    const binRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!binRes.ok || !binRes.body) {
      logger.error({ mediaId, status: binRes.status }, "Failed to download WhatsApp media binary");
      return null;
    }

    const declaredLength = Number(binRes.headers.get("content-length") ?? "");
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BYTES) {
      logger.error({ mediaId, declaredLength }, "WhatsApp media exceeds size limit");
      return null;
    }

    const rawMime = meta.mime_type ?? binRes.headers.get("content-type") ?? "application/octet-stream";
    const cleanMime = rawMime.split(";")[0]?.trim().toLowerCase() ?? "application/octet-stream";
    const ext = extFromMime(cleanMime);
    const filename = `${randomUUID()}.${ext}`;

    const chunks: Buffer[] = [];
    let totalBytes = 0;
    const reader = binRes.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
      if (totalBytes > MAX_BYTES) {
        reader.cancel();
        logger.error({ mediaId, totalBytes }, "WhatsApp media exceeded size limit mid-stream");
        return null;
      }
      chunks.push(Buffer.from(value));
    }

    let buffer = Buffer.concat(chunks);

    if (isImageMime(cleanMime)) {
      const optimized = await optimizeImage(buffer, cleanMime);
      buffer = Buffer.from(optimized.buffer);
      logger.info(
        { mediaId, originalBytes: totalBytes, optimizedBytes: buffer.length, ratio: (buffer.length / totalBytes * 100).toFixed(1) + "%" },
        "WhatsApp image optimized",
      );
    }

    const uploaded = await uploadToR2(filename, buffer, cleanMime);
    if (!uploaded) {
      const filepath = path.join(MEDIA_DIR, filename);
      await fs.mkdir(MEDIA_DIR, { recursive: true });
      await fs.writeFile(filepath, buffer);
      logger.warn({ mediaId, filename }, "R2 upload failed, saved to disk fallback");
    }

    return { url: `/api/media/${filename}`, mimeType: rawMime };
  } catch (err) {
    logger.error({ err, mediaId }, "Error downloading WhatsApp media");
    return null;
  }
}
