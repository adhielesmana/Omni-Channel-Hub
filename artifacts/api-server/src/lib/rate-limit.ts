import type { IncomingMessage, ServerResponse } from "node:http";

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max } = options;
  const store = new Map<string, RateLimitEntry>();

  // Periodically clean up stale entries
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      const valid = entry.timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        store.delete(key);
      } else {
        entry.timestamps = valid;
      }
    }
  }, windowMs * 2);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  function getClientIp(req: IncomingMessage): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
      const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0])?.trim();
      if (ip) return ip;
    }
    return req.socket?.remoteAddress ?? "unknown";
  }

  return function rateLimitMiddleware(
    req: IncomingMessage,
    res: ServerResponse,
    next?: () => void,
  ): void {
    const ip = getClientIp(req);
    const now = Date.now();

    let entry = store.get(ip);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(ip, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

    if (entry.timestamps.length >= max) {
      const retryAfter = Math.ceil(
        (entry.timestamps[0]! + windowMs - now) / 1000,
      );

      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", String(Math.ceil((entry.timestamps[0]! + windowMs) / 1000)));
      res.end(JSON.stringify({ error: "Too many requests, please try again later" }));
      return;
    }

    entry.timestamps.push(now);

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(max - entry.timestamps.length));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil((now + windowMs) / 1000)));

    if (next) next();
  };
}
