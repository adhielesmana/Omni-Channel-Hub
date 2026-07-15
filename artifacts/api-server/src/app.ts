import { createServer, Router } from "./lib/http-kit";
import router from "./routes";
import { promises as fs } from "fs";
import path from "path";
import { MEDIA_DIR, INLINE_EXTENSIONS } from "./lib/whatsapp-media";
import { getFromR2 } from "./lib/r2";

const apiRouter = Router();

apiRouter.use(router);

const MIME_TYPE_FALLBACK: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  "3gp": "video/3gpp",
  ogg: "audio/ogg",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  amr: "audio/amr",
  aac: "audio/aac",
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  bin: "application/octet-stream",
};

const mediaRouter = Router();

mediaRouter.get("/:filename", async (req, res): Promise<void> => {
  const filename = req.params.filename;
  if (!filename || filename.includes("/")) {
    res.status(400).json({ error: "Invalid media path" });
    return;
  }

  const ext = path.extname(filename).slice(1).toLowerCase();

  const fromR2 = await getFromR2(filename);
  if (fromR2) {
    res.setHeader("Content-Type", fromR2.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (!INLINE_EXTENSIONS.has(ext)) {
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    }
    res.end(fromR2.body);
    return;
  }

  const filepath = path.join(MEDIA_DIR, filename);
  try {
    const stat = await fs.stat(filepath);
    if (!stat.isFile()) throw new Error("Not a file");

    const mime = MIME_TYPE_FALLBACK[ext] ?? "application/octet-stream";
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (!INLINE_EXTENSIONS.has(ext)) {
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    }
    const content = await fs.readFile(filepath);
    res.end(content);
  } catch {
    res.status(404).json({ error: "Media not found" });
  }
});

const rootRouter = Router();
rootRouter.use("/api", apiRouter);
rootRouter.use("/api/media", mediaRouter);

const server = createServer(rootRouter, {
  bodyParser: {
    json: { limit: "500mb" },
    urlencoded: { limit: "500mb" },
  },
});

export default server;
