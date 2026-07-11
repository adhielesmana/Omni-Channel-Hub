import sharp from "sharp";
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

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    let pipeline = image;

    if (
      (metadata.width && metadata.width > MAX_DIMENSION) ||
      (metadata.height && metadata.height > MAX_DIMENSION)
    ) {
      pipeline = pipeline.resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    const animated = metadata.pages && metadata.pages > 1;

    if (animated && cleanMime === "image/gif") {
      return { buffer, mimeType: cleanMime };
    }

    const outputFormat = cleanMime === "image/png" ? "png" : "jpeg";
    const outputMime = outputFormat === "png" ? "image/png" : "image/jpeg";

    if (outputFormat === "png") {
      pipeline = pipeline.png({ compressionLevel: 9, palette: true });
    } else {
      pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
    }

    const optimized = await pipeline.toBuffer();

    if (optimized.length >= buffer.length) {
      return { buffer, mimeType: cleanMime };
    }

    return { buffer: optimized, mimeType: outputMime };
  } catch (err) {
    logger.error({ err, mimeType }, "Image optimization failed, using original");
    return { buffer, mimeType: cleanMime };
  }
}
