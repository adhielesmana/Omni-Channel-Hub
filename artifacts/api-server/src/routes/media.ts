import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../middlewares/auth";
import { MEDIA_DIR } from "../lib/whatsapp-media";

const router: IRouter = Router();

const storage = multer.diskStorage({
  destination: MEDIA_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

const upload = multer({
  storage,
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

router.post("/upload", requireAuth, upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }
  const url = `/api/media/${req.file.filename}`;
  res.json({ url });
});

export default router;
