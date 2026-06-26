import { promises as fs, createWriteStream } from "fs";
import { Readable } from "stream";
import path from "path";
import { randomUUID } from "crypto";
import { logger } from "./logger";

export const MEDIA_DIR = path.resolve(process.env["MEDIA_DIR"] ?? "./media");

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB cap per media file
const FETCH_TIMEOUT_MS = 30_000;

void fs.mkdir(MEDIA_DIR, { recursive: true }).catch((err) => {
  logger.error({ err, MEDIA_DIR }, "Failed to create media directory");
});

// Strict allowlist: only known-safe WhatsApp media types map to a real extension.
// Anything else (including text/html, image/svg+xml, application/xml) falls back
// to "bin" and is served as an attachment, never inline — preventing stored XSS.
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

// Extensions safe to serve inline (rendered directly in the inbox via img/video/audio).
// Everything else is served as a download attachment.
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

/**
 * Downloads a WhatsApp media object by its media id and stores it on disk.
 * Streams to disk with a hard size cap and request timeout.
 * Returns the locally servable URL and the mime type, or null on failure.
 */
export async function downloadWhatsAppMedia(
  mediaId: string,
  accessToken: string,
): Promise<{ url: string; mimeType: string } | null> {
  let filepath: string | null = null;
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

    const mimeType = meta.mime_type ?? binRes.headers.get("content-type") ?? "application/octet-stream";
    const filename = `${randomUUID()}.${extFromMime(mimeType)}`;
    filepath = path.join(MEDIA_DIR, filename);
    await fs.mkdir(MEDIA_DIR, { recursive: true });

    const out = createWriteStream(filepath);
    const source = Readable.fromWeb(binRes.body as Parameters<typeof Readable.fromWeb>[0]);
    let bytes = 0;
    for await (const chunk of source) {
      bytes += (chunk as Buffer).length;
      if (bytes > MAX_BYTES) {
        out.destroy();
        await fs.rm(filepath, { force: true }).catch(() => {});
        logger.error({ mediaId, bytes }, "WhatsApp media exceeded size limit mid-stream");
        return null;
      }
      if (!out.write(chunk)) {
        await new Promise<void>((resolve) => out.once("drain", () => resolve()));
      }
    }
    await new Promise<void>((resolve, reject) => {
      out.end(() => resolve());
      out.on("error", reject);
    });

    return { url: `/api/media/${filename}`, mimeType };
  } catch (err) {
    if (filepath) await fs.rm(filepath, { force: true }).catch(() => {});
    logger.error({ err, mediaId }, "Error downloading WhatsApp media");
    return null;
  }
}
