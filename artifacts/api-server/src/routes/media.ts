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

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpg, png, gif, webp, svg) are allowed"));
    }
  },
});

router.post("/media/upload", requireAuth, upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }
  const url = `/api/media/${req.file.filename}`;
  res.json({ url });
});

export default router;
