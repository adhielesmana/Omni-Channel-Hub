import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

declare global {
  namespace Express {
    interface Request {
      externalApiKey?: string;
      externalSourceIp?: string;
    }
  }
}

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers["x-api-key"] as string | undefined;
  const expectedKey = process.env.EXTERNAL_API_KEY;

  if (!expectedKey) {
    logger.warn("EXTERNAL_API_KEY not configured — external API requests are disabled");
    res.status(503).json({ error: "External API not configured" });
    return;
  }

  if (!apiKey || apiKey !== expectedKey) {
    res.status(401).json({ error: "Invalid or missing API key" });
    return;
  }

  req.externalApiKey = apiKey;
  req.externalSourceIp = req.ip || req.socket.remoteAddress || "unknown";
  next();
}
