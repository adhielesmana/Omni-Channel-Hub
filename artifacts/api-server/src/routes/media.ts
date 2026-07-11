import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../middlewares/auth";
import { uploadToR2 } from "../lib/r2";
import { optimizeImage } from "../lib/media-optimizer";
import { MEDIA_DIR } from "../lib/whatsapp-media";
import { promises as fs } from "fs";
import path from "path";

const router: IRouter = Router();

const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      cb(new Error("Only image files (jpg, png, gif, webp) are allowed"));
      return;
    }
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      cb(new Error("Invalid file type: MIME type not allowed"));
      return;
    }
    cb(null, true);
  },
});

router.post("/upload", requireAuth, upload.single("file"), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  const filename = `${randomUUID()}${ext}`;

  try {
    const { buffer, mimeType } = await optimizeImage(req.file.buffer, req.file.mimetype);

    const uploaded = await uploadToR2(filename, buffer, mimeType);
    if (!uploaded) {
      const filepath = path.join(MEDIA_DIR, filename);
      await fs.mkdir(MEDIA_DIR, { recursive: true });
      await fs.writeFile(filepath, Buffer.from(buffer));
    }

    res.json({ url: `/api/media/${filename}` });
  } catch (err) {
    next(err);
  }
});

export default router;
