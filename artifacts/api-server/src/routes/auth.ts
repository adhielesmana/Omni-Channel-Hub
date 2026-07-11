import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody, LoginResponse, ChangePasswordBody } from "@workspace/api-zod";
import { comparePassword, hashPassword, createToken, invalidateToken, SUPERADMIN, isSuperadmin } from "../lib/auth";
import { requireAuth } from "../middlewares/auth";
import { authRateLimit } from "../app";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;
if (!SUPERADMIN_PASSWORD) {
  logger.warn("SUPERADMIN_PASSWORD not set — superadmin login will fail");
}

router.post("/auth/login", authRateLimit, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  if (email.toLowerCase().trim() === SUPERADMIN.email) {
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

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
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
  res.json(LoginResponse.parse({
    token,
    user: { ...user, createdAt: user.createdAt.toISOString() },
  }));
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

  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
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
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, req.userId!));
  res.json({ status: "ok" });
});

export default router;
