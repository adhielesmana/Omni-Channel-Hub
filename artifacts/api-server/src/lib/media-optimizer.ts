import { logger } from "./logger";

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 80;
const WEBP_QUALITY = 80;
const MIN_BYTES_TO_OPTIMIZE = 10_000;

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/tiff",
  "image/avif",
]);

export async function optimizeImage(
  buffer: Buffer,
  mimeType: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const cleanMime = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";

  if (!IMAGE_MIMES.has(cleanMime)) {
    return { buffer, mimeType: cleanMime };
  }

  if (buffer.length < MIN_BYTES_TO_OPTIMIZE && cleanMime === "image/webp") {
    return { buffer, mimeType: cleanMime };
  }

  // Image optimization was removed to eliminate the sharp dependency.
  // Original implementation would resize to MAX_DIMENSION and re-encode as JPEG/PNG.
  // For production with image processing needs, install sharp and restore the logic.
  logger.info({ mimeType, size: buffer.length }, "Image optimization skipped — no-op path (sharp not available)");

  return { buffer, mimeType: cleanMime };
}
