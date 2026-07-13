import { Router } from "../lib/http-kit";
import { selectRaw } from "@workspace/db";
import type { Channel, WaTemplate } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/auth";
import { syncTemplatesFromMeta, deleteTemplateOnMeta } from "../lib/template-sync-worker";

const router = Router();

const GRAPH_API_BASE = "https://graph.facebook.com/v18.0";

router.get("/whatsapp-templates", requireAuth, async (req, res): Promise<void> => {
  const channelId = parseInt(req.query.channelId as string, 10);
  if (isNaN(channelId)) {
    res.status(400).json({ error: "channelId is required" });
    return;
  }

  const templates = await selectRaw<WaTemplate>(
    `SELECT * FROM wa_templates WHERE channel_id = $1 ORDER BY updated_at`,
    [channelId],
  );

  const [channel] = await selectRaw<{ name: string }>(
    `SELECT name FROM channels WHERE id = $1`,
    [channelId],
  );

  const result = templates.map((t) => ({
    ...t,
    channelName: channel?.name ?? null,
    components: t.components ? JSON.parse(t.components) : null,
  }));

  res.json(result);
});

router.post("/whatsapp-templates", requireAuth, async (req, res): Promise<void> => {
  const body = (req.body as Record<string, unknown>) ?? {};

  const errors: string[] = [];
  const channelIdRaw = body.channelId;
  const channelId = typeof channelIdRaw === "number" ? channelIdRaw : parseInt(String(channelIdRaw ?? ""), 10);
  if (isNaN(channelId) || channelId <= 0) {
    errors.push("channelId must be a positive number");
  }
  const name = body.name;
  if (typeof name !== "string" || name.trim().length === 0) {
    errors.push("Name is required");
  }
  const language = body.language;
  if (typeof language !== "string" || language.trim().length === 0) {
    errors.push("Language is required");
  }
  const category = body.category;
  if (typeof category !== "string" || category.trim().length === 0) {
    errors.push("Category is required");
  }
  const components = body.components;
  if (!Array.isArray(components) || components.length === 0) {
    errors.push("Components must be a non-empty array");
  }

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join("; ") });
    return;
  }

  const [channel] = await selectRaw<Channel>(
    `SELECT * FROM channels WHERE id = $1 AND channel_type = 'whatsapp'`,
    [channelId],
  );

  if (!channel) {
    res.status(400).json({ error: "WhatsApp channel not found" });
    return;
  }

  if (!channel.accessToken || !channel.wabaId) {
    res.status(400).json({ error: "Channel missing access token or WABA ID" });
    return;
  }

  try {
    const metaComponents = (components as Array<Record<string, unknown>>).map((c) => {
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

router.post("/whatsapp-templates/sync", requireAuth, async (req, res): Promise<void> => {
  const body = (req.body as Record<string, unknown>) ?? {};
  const channelIdRaw = body.channelId;
  const channelId = typeof channelIdRaw === "number" ? channelIdRaw : parseInt(String(channelIdRaw ?? ""), 10);
  if (isNaN(channelId) || channelId <= 0) {
    res.status(400).json({ error: "channelId must be a positive number" });
    return;
  }

  const [channel] = await selectRaw<Channel>(
    `SELECT * FROM channels WHERE id = $1 AND channel_type = 'whatsapp'`,
    [channelId],
  );

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

router.delete("/whatsapp-templates/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [template] = await selectRaw<WaTemplate>(
    `SELECT * FROM wa_templates WHERE id = $1`,
    [id],
  );

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  const [channel] = await selectRaw<Channel>(
    `SELECT * FROM channels WHERE id = $1`,
    [template.channelId],
  );

  if (channel?.accessToken && channel.wabaId && template.metaTemplateId) {
    try {
      await deleteTemplateOnMeta(channel, template.name, template.metaTemplateId);
    } catch (err) {
      res.status(502).json({ error: `Meta API: ${(err as Error).message}` });
      return;
    }
  }

  await selectRaw(
    `DELETE FROM wa_templates WHERE id = $1`,
    [id],
  );

  res.json({ status: "deleted" });
});

export default router;
