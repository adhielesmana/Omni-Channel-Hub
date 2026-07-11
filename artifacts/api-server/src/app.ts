import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import pinoHttp from "pino-http";
import { promises as fs } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { MEDIA_DIR, INLINE_EXTENSIONS } from "./lib/whatsapp-media";
import { getFromR2 } from "./lib/r2";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "https:", "'unsafe-inline'"],
        upgradeInsecureRequests: [],
      },
    },
  }),
);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    credentials: true,
  }),
);

const globalRateLimit = rateLimit({
  windowMs: 60_000,
  max: parseInt(process.env.RATE_LIMIT_MAX ?? "200", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
app.use(globalRateLimit);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api", router);
app.use("/api/media", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const filename = path.basename(req.path);
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

    const ext = path.extname(filepath).slice(1).toLowerCase();
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

app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  logger.error({ err }, "Unhandled error");
  if (process.env.NODE_ENV === "production") {
    res.status(500).json({ error: "Internal server error" });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

export default app;
