import { Router } from "../lib/http-kit";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../middlewares/auth";
import { uploadToR2 } from "../lib/r2";
import { optimizeImage } from "../lib/media-optimizer";
import { parseMultipart } from "../lib/multipart";
import { promises as fs } from "fs";
import path from "path";

const router = Router();

const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

router.post("/upload", requireAuth, async (req, res): Promise<void> => {
  let files: Array<{ fieldname: string; originalname: string; mimetype: string; buffer: Buffer; size: number }>;
  try {
    const result = await parseMultipart(req, { maxFileSize: 10 * 1024 * 1024 });
    files = result.files;
  } catch (err) {
    res.status(400).json({ error: "Failed to parse multipart upload" });
    return;
  }

  if (!files || files.length === 0) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  const file = files[0];
  const ext = path.extname(file.originalname).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
    res.status(400).json({ error: "Only image files (jpg, png, gif, webp) are allowed" });
    return;
  }
  if (!ALLOWED_MIMES.has(file.mimetype)) {
    res.status(400).json({ error: "Invalid file type: MIME type not allowed" });
    return;
  }

  const filename = `${randomUUID()}${ext}`;

  try {
    const { buffer, mimeType } = await optimizeImage(file.buffer, file.mimetype);

    const uploaded = await uploadToR2(filename, buffer, mimeType);
    if (!uploaded) {
      const MEDIA_DIR = process.env["MEDIA_DIR"] || "./media";
      const filepath = path.join(MEDIA_DIR, filename);
      await fs.mkdir(MEDIA_DIR, { recursive: true });
      await fs.writeFile(filepath, Buffer.from(buffer));
    }

    res.json({ url: `/api/media/${filename}` });
  } catch (err) {
    req.log.error({ err }, "Upload error");
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
