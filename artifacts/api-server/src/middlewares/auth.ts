import type { EnhancedRequest, EnhancedResponse } from "../lib/http-kit";
import { verifyToken } from "../lib/auth";

declare global {
  namespace HttpKit {
    interface Request {
      userId?: number;
    }
  }
}

export function requireAuth(req: EnhancedRequest, res: EnhancedResponse, next: () => void): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.userId = payload.userId;
  next();
}
