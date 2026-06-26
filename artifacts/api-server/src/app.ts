import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { MEDIA_DIR, INLINE_EXTENSIONS } from "./lib/whatsapp-media";

const app: Express = express();

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  "/api/media",
  express.static(MEDIA_DIR, {
    maxAge: "1y",
    immutable: true,
    fallthrough: false,
    setHeaders: (res, filePath) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      const ext = path.extname(filePath).slice(1).toLowerCase();
      if (!INLINE_EXTENSIONS.has(ext)) {
        res.setHeader("Content-Disposition", "attachment");
      }
    },
  }),
);
app.use("/api", router);

export default app;
