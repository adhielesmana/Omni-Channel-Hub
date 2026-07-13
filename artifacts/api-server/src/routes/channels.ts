import { Router } from "../lib/http-kit";
import { selectAll, selectById, insert, update, del } from "@workspace/db";
import type { Channel } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const VALID_CHANNEL_TYPES = ["whatsapp", "instagram", "facebook"] as const;

function maskToken(token: string | null): string | null {
  if (!token || token.length < 8) return token;
  return token.slice(0, 4) + "****" + token.slice(-4);
}

function toDto(c: Channel) {
  return {
    id: c.id,
    name: c.name,
    channelType: c.channelType,
    externalId: c.externalId,
    wabaId: c.wabaId,
    phoneNumber: c.phoneNumber,
    pageId: c.pageId,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    accessToken: maskToken(c.accessToken),
    webhookVerifyToken: maskToken(c.webhookVerifyToken),
  };
}

router.get("/channels", requireAuth, async (_req, res): Promise<void> => {
  const channels = await selectAll<Channel>("channels", { column: "created_at", dir: "ASC" });
  res.json(channels.map(toDto));
});

router.post("/channels", requireAuth, async (req, res): Promise<void> => {
  const body = (req.body as Record<string, unknown>) ?? {};

  const errors: string[] = [];
  const name = body.name;
  if (typeof name !== "string" || name.trim().length === 0) {
    errors.push("Name is required");
  }
  const channelType = body.channelType;
  if (typeof channelType !== "string" || !VALID_CHANNEL_TYPES.includes(channelType as any)) {
    errors.push("Channel type must be one of: whatsapp, instagram, facebook");
  }
  const externalId = typeof body.externalId === "string" ? (body.externalId as string).trim() || null : null;
  const wabaId = typeof body.wabaId === "string" ? (body.wabaId as string).trim() || null : null;
  const phoneNumber = typeof body.phoneNumber === "string" ? (body.phoneNumber as string).trim() || null : null;
  const pageId = typeof body.pageId === "string" ? (body.pageId as string).trim() || null : null;
  const accessToken = typeof body.accessToken === "string" ? (body.accessToken as string).trim() || null : null;
  const webhookVerifyToken = typeof body.webhookVerifyToken === "string" ? (body.webhookVerifyToken as string).trim() || null : null;
  const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join("; ") });
    return;
  }

  const channel = await insert<Channel>("channels", {
    name: (name as string).trim(),
    channelType,
    externalId,
    wabaId,
    phoneNumber,
    pageId,
    accessToken,
    webhookVerifyToken,
    isActive,
  });

  res.status(201).json(toDto(channel));
});

router.get("/channels/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const channel = await selectById<Channel>("channels", id);
  if (!channel) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }
  res.json(toDto(channel));
});

router.patch("/channels/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const body = (req.body as Record<string, unknown>) ?? {};
  const updates: Record<string, unknown> = {};

  if ("name" in body) {
    if (typeof body.name !== "string" || (body.name as string).trim().length === 0) {
      res.status(400).json({ error: "Name must be a non-empty string" });
      return;
    }
    updates.name = (body.name as string).trim();
  }
  if ("channelType" in body) {
    if (typeof body.channelType !== "string" || !VALID_CHANNEL_TYPES.includes(body.channelType as any)) {
      res.status(400).json({ error: "Channel type must be one of: whatsapp, instagram, facebook" });
      return;
    }
    updates.channelType = body.channelType;
  }
  if ("externalId" in body) {
    updates.externalId = typeof body.externalId === "string" ? (body.externalId as string).trim() || null : null;
  }
  if ("wabaId" in body) {
    updates.wabaId = typeof body.wabaId === "string" ? (body.wabaId as string).trim() || null : null;
  }
  if ("phoneNumber" in body) {
    updates.phoneNumber = typeof body.phoneNumber === "string" ? (body.phoneNumber as string).trim() || null : null;
  }
  if ("pageId" in body) {
    updates.pageId = typeof body.pageId === "string" ? (body.pageId as string).trim() || null : null;
  }
  if ("accessToken" in body) {
    updates.accessToken = typeof body.accessToken === "string" ? (body.accessToken as string).trim() || null : null;
  }
  if ("webhookVerifyToken" in body) {
    updates.webhookVerifyToken = typeof body.webhookVerifyToken === "string" ? (body.webhookVerifyToken as string).trim() || null : null;
  }
  if ("isActive" in body) {
    if (typeof body.isActive !== "boolean") {
      res.status(400).json({ error: "isActive must be a boolean" });
      return;
    }
    updates.isActive = body.isActive;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const channel = await update<Channel>("channels", id, updates);
  if (!channel) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }
  res.json(toDto(channel));
});

router.delete("/channels/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const channel = await del<Channel>("channels", id);
  if (!channel) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
