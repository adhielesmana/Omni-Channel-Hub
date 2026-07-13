import { Router } from "../lib/http-kit";
import { selectWhere, selectById, update } from "@workspace/db";
import type { User } from "@workspace/db";
import { comparePassword, hashPassword, createToken, invalidateToken, SUPERADMIN, isSuperadmin } from "../lib/auth";
import { requireAuth } from "../middlewares/auth";
import { createRateLimiter } from "../lib/rate-limit";
import { logger } from "../lib/logger";

const authRateLimit = createRateLimiter({ windowMs: 60_000, max: 10 });

const router = Router();

const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;
if (!SUPERADMIN_PASSWORD) {
  logger.warn("SUPERADMIN_PASSWORD not set \u2014 superadmin login will fail");
}

router.post("/auth/login", authRateLimit, async (req, res): Promise<void> => {
  const body = (req.body as Record<string, unknown>) ?? {};
  const email = body.email;
  const password = body.password;

  if (typeof email !== "string" || email.trim().length === 0) {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  if (typeof password !== "string" || password.length === 0) {
    res.status(400).json({ error: "Password is required" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (normalizedEmail === SUPERADMIN.email) {
    if (!SUPERADMIN_PASSWORD || password !== SUPERADMIN_PASSWORD) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const token = createToken(SUPERADMIN.id);
    res.json({
      token,
      user: { ...SUPERADMIN, createdAt: SUPERADMIN.createdAt.toISOString() },
    });
    return;
  }

  const users = await selectWhere<User>("users", { email: normalizedEmail });
  const user = users[0] ?? null;
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = createToken(user.id);
  res.json({
    token,
    user: { ...user, createdAt: user.createdAt.toISOString() },
  });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    invalidateToken(authHeader.slice(7));
  }
  res.json({ status: "ok" });
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  if (isSuperadmin(req.userId!)) {
    res.status(403).json({ error: "Superadmin password cannot be changed here" });
    return;
  }

  const body = (req.body as Record<string, unknown>) ?? {};
  const currentPassword = body.currentPassword;
  const newPassword = body.newPassword;

  if (typeof currentPassword !== "string" || currentPassword.length === 0) {
    res.status(400).json({ error: "Current password is required" });
    return;
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }

  const user = await selectById<User>("users", req.userId!);
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid current password" });
    return;
  }

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid current password" });
    return;
  }

  const newHash = await hashPassword(newPassword);
  await update("users", req.userId!, { passwordHash: newHash });
  res.json({ status: "ok" });
});

export default router;
