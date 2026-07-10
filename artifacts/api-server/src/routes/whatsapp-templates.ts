import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, waTemplatesTable, channelsTable } from "@workspace/db";
import {
  ListWaTemplatesQueryParams,
  CreateWaTemplateBody,
  SyncWaTemplatesBody,
  DeleteWaTemplateParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/auth";
import { syncTemplatesFromMeta, deleteTemplateOnMeta } from "../lib/template-sync-worker";

const router: IRouter = Router();

const GRAPH_API_BASE = "https://graph.facebook.com/v18.0";

// List templates from local DB
router.get("/whatsapp-templates", requireAuth, async (req, res): Promise<void> => {
  const params = ListWaTemplatesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const templates = await db
    .select()
    .from(waTemplatesTable)
    .where(eq(waTemplatesTable.channelId, params.data.channelId))
    .orderBy(waTemplatesTable.updatedAt);

  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, params.data.channelId));

  const result = templates.map((t) => ({
    ...t,
    channelName: channel?.name ?? null,
    components: t.components ? JSON.parse(t.components) : null,
  }));

  res.json(result);
});

// Create a new template on Meta (does not save locally)
router.post("/whatsapp-templates", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateWaTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { channelId, name, language, category, components } = parsed.data;

  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(and(eq(channelsTable.id, channelId), eq(channelsTable.channelType, "whatsapp")));

  if (!channel) {
    res.status(400).json({ error: "WhatsApp channel not found" });
    return;
  }

  if (!channel.accessToken || !channel.wabaId) {
    res.status(400).json({ error: "Channel missing access token or WABA ID" });
    return;
  }

  try {
    const metaComponents = components.map((c) => {
      const comp: Record<string, unknown> = { type: c.type };
      if (c.text) comp.text = c.text;
      if (c.format) comp.format = c.format;
      if (c.buttons) comp.buttons = c.buttons;
      return comp;
    });

    const url = `${GRAPH_API_BASE}/${channel.wabaId}/message_templates`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${channel.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        language,
        category,
        components: metaComponents,
      }),
    });

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      const metaMessage = (data.error as Record<string, unknown>)?.message || `Meta API error: ${response.status}`;
      res.status(502).json({ error: `Meta API: ${metaMessage}` });
      return;
    }

    // Sync all templates from Meta to local DB after creation
    syncTemplatesFromMeta(channel).catch((err) => {
      logger.error({ err, channelId }, "Background template sync after creation failed");
    });

    res.status(201).json({
      id: data.id as string,
      name: data.name as string,
      status: data.status as string,
    });
  } catch (err) {
    logger.error({ err }, "Meta template creation error");
    res.status(502).json({ error: "Failed to connect to Meta API" });
  }
});

// Sync templates from Meta to local DB
router.post("/whatsapp-templates/sync", requireAuth, async (req, res): Promise<void> => {
  const parsed = SyncWaTemplatesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { channelId } = parsed.data;

  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(and(eq(channelsTable.id, channelId), eq(channelsTable.channelType, "whatsapp")));

  if (!channel) {
    res.status(400).json({ error: "WhatsApp channel not found" });
    return;
  }

  if (!channel.accessToken || !channel.wabaId) {
    res.status(400).json({ error: "Channel missing access token or WABA ID" });
    return;
  }

  try {
    const result = await syncTemplatesFromMeta(channel);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Template sync error");
    res.status(502).json({ error: "Failed to sync templates from Meta" });
  }
});

// Delete template from local DB and Meta
router.delete("/whatsapp-templates/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteWaTemplateParams.safeParse({ id: parseInt(req.params.id as string, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [template] = await db
    .select()
    .from(waTemplatesTable)
    .where(eq(waTemplatesTable.id, params.data.id));

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, template.channelId));

  if (channel?.accessToken && channel.wabaId && template.metaTemplateId) {
    try {
      await deleteTemplateOnMeta(channel, template.name, template.metaTemplateId);
    } catch (err) {
      res.status(502).json({ error: `Meta API: ${(err as Error).message}` });
      return;
    }
  }

  await db.delete(waTemplatesTable).where(eq(waTemplatesTable.id, template.id));

  res.json({ status: "deleted" });
});

export default router;
