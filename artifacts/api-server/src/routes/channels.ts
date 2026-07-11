import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, channelsTable } from "@workspace/db";
import {
  ListChannelsResponse,
  CreateChannelBody,
  GetChannelParams,
  GetChannelResponse,
  UpdateChannelParams,
  UpdateChannelBody,
  UpdateChannelResponse,
  DeleteChannelParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function maskToken(token: string | null): string | null {
  if (!token || token.length < 8) return token;
  return token.slice(0, 4) + "****" + token.slice(-4);
}

const toDto = (c: typeof channelsTable.$inferSelect) => ({
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
});

router.get("/channels", requireAuth, async (req, res): Promise<void> => {
  const channels = await db.select().from(channelsTable).orderBy(channelsTable.createdAt);
  res.json(ListChannelsResponse.parse(channels.map(toDto)));
});

router.post("/channels", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateChannelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [channel] = await db.insert(channelsTable).values(parsed.data).returning();
  res.status(201).json(GetChannelResponse.parse(toDto(channel)));
});

router.get("/channels/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetChannelParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [channel] = await db.select().from(channelsTable).where(eq(channelsTable.id, params.data.id));
  if (!channel) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }
  res.json(GetChannelResponse.parse(toDto(channel)));
});

router.patch("/channels/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateChannelParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateChannelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [channel] = await db.update(channelsTable).set(parsed.data).where(eq(channelsTable.id, params.data.id)).returning();
  if (!channel) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }
  res.json(UpdateChannelResponse.parse(toDto(channel)));
});

router.delete("/channels/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteChannelParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [channel] = await db.delete(channelsTable).where(eq(channelsTable.id, params.data.id)).returning();
  if (!channel) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
