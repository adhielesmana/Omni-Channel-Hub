import { Router } from "../lib/http-kit";
import { insert, insertMany, update, selectById, selectRaw } from "@workspace/db";
import type { User, WhatsappBlast, WhatsappBlastRecipient, Channel } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/auth";
import { requireApiKey } from "../middlewares/api-key";
import { getBlastSettings, updateBlastSettings } from "../lib/blast-settings";

const router = Router();

const toBlastDto = (b: WhatsappBlast) => ({
  id: b.id,
  name: b.name,
  channelId: b.channelId,
  templateName: b.templateName,
  templateLanguage: b.templateLanguage,
  templateParams: b.templateParams,
  source: b.source as "manual" | "external",
  createdByUserId: b.createdByUserId,
  createdByUserName: null as string | null,
  externalApiKey: b.externalApiKey,
  externalSourceIp: b.externalSourceIp,
  scheduledAt: b.scheduledAt?.toISOString() ?? null,
  startedAt: b.startedAt?.toISOString() ?? null,
  completedAt: b.completedAt?.toISOString() ?? null,
  totalRecipients: b.totalRecipients,
  sentCount: b.sentCount,
  deliveredCount: b.deliveredCount,
  failedCount: b.failedCount,
  status: b.status as "pending" | "processing" | "completed" | "failed" | "cancelled",
  createdAt: b.createdAt.toISOString(),
  updatedAt: b.updatedAt.toISOString(),
});

const toRecipientDto = (r: WhatsappBlastRecipient) => ({
  id: r.id,
  blastId: r.blastId,
  contactId: r.contactId,
  phone: r.phone,
  templateParams: r.templateParams,
  content: r.content,
  status: r.status as "queued" | "pending" | "processing" | "sent" | "delivered" | "failed",
  externalMessageId: r.externalMessageId,
  errorMessage: r.errorMessage,
  sentAt: r.sentAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
});

router.get("/whatsapp-blasts", requireAuth, async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const search = req.query.search as string | undefined;
  const offset = (page - 1) * limit;

  let blasts: WhatsappBlast[];
  let totalCount: number;

  if (search) {
    const searchPattern = `%${search}%`;
    blasts = await selectRaw<WhatsappBlast>(
      `SELECT * FROM whatsapp_blasts WHERE name ILIKE $1 OR external_api_key ILIKE $1 OR external_source_ip ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [searchPattern, limit, offset],
    );
    const [countRow] = await selectRaw<{ count: number }>(
      `SELECT count(*)::int AS count FROM whatsapp_blasts WHERE name ILIKE $1 OR external_api_key ILIKE $1 OR external_source_ip ILIKE $1`,
      [searchPattern],
    );
    totalCount = countRow?.count ?? 0;
  } else {
    blasts = await selectRaw<WhatsappBlast>(
      `SELECT * FROM whatsapp_blasts ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    const [countRow] = await selectRaw<{ count: number }>(
      `SELECT count(*)::int AS count FROM whatsapp_blasts`,
    );
    totalCount = countRow?.count ?? 0;
  }

  const enriched = await Promise.all(blasts.map(async (b) => {
    const dto = toBlastDto(b);
    if (b.createdByUserId) {
      const user = await selectById<User>("users", b.createdByUserId);
      dto.createdByUserName = user?.name ?? null;
    }

    const recipients = await selectRaw<WhatsappBlastRecipient>(
      `SELECT * FROM whatsapp_blast_recipients WHERE blast_id = $1 LIMIT 5`,
      [b.id],
    );

    return { ...dto, recipients: recipients.map(toRecipientDto) };
  }));

  res.json({
    data: enriched,
    total: totalCount,
    page,
    limit,
  });
});

router.post("/whatsapp-blasts", requireAuth, async (req, res): Promise<void> => {
  const body = (req.body as Record<string, unknown>) ?? {};

  const errors: string[] = [];
  const name = body.name;
  if (typeof name !== "string" || name.trim().length === 0) {
    errors.push("Name is required");
  }
  const channelIdRaw = body.channelId;
  const channelId = typeof channelIdRaw === "number" ? channelIdRaw : parseInt(String(channelIdRaw ?? ""), 10);
  if (isNaN(channelId) || channelId <= 0) {
    errors.push("channelId must be a positive number");
  }
  const templateName = body.templateName;
  if (typeof templateName !== "string" || templateName.trim().length === 0) {
    errors.push("templateName is required");
  }
  const templateLanguage = body.templateLanguage;
  if (typeof templateLanguage !== "string" || templateLanguage.trim().length === 0) {
    errors.push("templateLanguage is required");
  }

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join("; ") });
    return;
  }

  const channel = await selectById<Channel>("channels", channelId);
  if (!channel) {
    res.status(400).json({ error: "Channel not found" });
    return;
  }
  if (channel.channelType !== "whatsapp") {
    res.status(400).json({ error: "Channel must be a WhatsApp channel" });
    return;
  }

  const contactIdsRaw = body.contactIds;
  const contactIds: number[] = Array.isArray(contactIdsRaw)
    ? (contactIdsRaw as number[]).filter((id) => typeof id === "number" && !isNaN(id))
    : [];

  let targetContacts: Array<{ id: number; phone: string | null; externalId: string }>;
  if (contactIds.length > 0) {
    targetContacts = await selectRaw<{ id: number; phone: string | null; externalId: string }>(
      `SELECT id, phone, external_id AS "externalId" FROM contacts WHERE channel_type = 'whatsapp' AND id = ANY($1)`,
      [contactIds],
    );
  } else {
    targetContacts = await selectRaw<{ id: number; phone: string | null; externalId: string }>(
      `SELECT id, phone, external_id AS "externalId" FROM contacts WHERE channel_type = 'whatsapp'`,
    );
  }

  if (targetContacts.length === 0) {
    res.status(400).json({ error: "No WhatsApp contacts found to blast" });
    return;
  }

  const templateParamsRaw = body.templateParams;

  const blast = await insert<WhatsappBlast>("whatsapp_blasts", {
    name: name as string,
    channel_id: channelId,
    template_name: templateName as string,
    template_language: templateLanguage as string,
    template_params: Array.isArray(templateParamsRaw) ? JSON.stringify(templateParamsRaw) : null,
    source: "manual",
    created_by_user_id: req.userId!,
    scheduled_at: typeof body.scheduledAt === "string" ? new Date(body.scheduledAt) : null,
    total_recipients: targetContacts.length,
    status: "pending",
  });

  const recipientValues = targetContacts.map((c) => ({
    blast_id: blast.id,
    contact_id: c.id,
    phone: c.phone ?? c.externalId,
    template_params: null as string | null,
    content: null as string | null,
    status: "queued" as const,
  }));

  await insertMany<WhatsappBlastRecipient>("whatsapp_blast_recipients", recipientValues);

  const user = await selectById<User>("users", req.userId!);
  const dto = toBlastDto(blast);
  dto.createdByUserName = user?.name ?? null;

  res.status(201).json(dto);
});

router.get("/whatsapp-blasts/templates", requireAuth, async (req, res): Promise<void> => {
  const channelId = parseInt(req.query.channelId as string, 10);
  if (isNaN(channelId)) {
    res.status(400).json({ error: "channelId is required" });
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

  if (!channel.accessToken) {
    res.status(400).json({ error: "Channel missing access token" });
    return;
  }

  if (!channel.wabaId) {
    res.status(400).json({
      error: "Channel missing WABA ID (WhatsApp Business Account ID). Add it in Channels > Configure.",
    });
    return;
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${channel.wabaId}/message_templates?status=APPROVED`;
    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${channel.accessToken}` },
    });

    const data = await response.json() as { data?: Array<Record<string, unknown>>; error?: { message?: string; code?: number } };

    if (!response.ok) {
      const metaMessage = data.error?.message || `Meta API error: ${response.status}`;
      const code = data.error?.code;

      if (code === 100 && (metaMessage.includes("missing permissions") || metaMessage.includes("does not support"))) {
        res.status(502).json({
          error: "Your access token is missing 'whatsapp_business_management' permission. Go to Meta Business Manager > System Users > Generate New Token and add this permission.",
        });
        return;
      }

      res.status(502).json({ error: `Meta API: ${metaMessage}` });
      return;
    }

    const templates = (data.data ?? []).map((t: Record<string, unknown>) => ({
      id: t.id as string,
      name: t.name as string,
      language: (t.language as string) ?? null,
      status: t.status as string,
      category: t.category as string,
      components: t.components as Array<Record<string, unknown>>,
      channelId: channel.id,
      channelName: channel.name,
    }));

    res.json(templates);
  } catch (err) {
    logger.error({ err }, "Meta template fetch error");
    res.status(502).json({ error: "Failed to connect to Meta API" });
  }
});

router.get("/whatsapp-blasts/settings", requireAuth, async (_req, res): Promise<void> => {
  res.json(getBlastSettings());
});

router.patch("/whatsapp-blasts/settings", requireAuth, async (req, res): Promise<void> => {
  const body = (req.body as Record<string, unknown>) ?? {};
  const settings: Record<string, unknown> = {};
  if (typeof body.batchSize === "number" && body.batchSize > 0) settings["batchSize"] = body.batchSize;
  if (typeof body.delayBetweenBatchesMs === "number" && body.delayBetweenBatchesMs >= 0) settings["delayBetweenBatchesMs"] = body.delayBetweenBatchesMs;
  if (typeof body.maxRetries === "number" && body.maxRetries >= 0) settings["maxRetries"] = body.maxRetries;
  const updated = updateBlastSettings(settings);
  res.json(updated);
});

router.get("/whatsapp-blasts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const blast = await selectById<WhatsappBlast>("whatsapp_blasts", id);
  if (!blast) {
    res.status(404).json({ error: "Blast not found" });
    return;
  }

  const recipients = await selectRaw<WhatsappBlastRecipient>(
    `SELECT * FROM whatsapp_blast_recipients WHERE blast_id = $1 ORDER BY id ASC`,
    [blast.id],
  );

  const dto = toBlastDto(blast);
  if (blast.createdByUserId) {
    const user = await selectById<User>("users", blast.createdByUserId);
    dto.createdByUserName = user?.name ?? null;
  }

  res.json({
    blast: dto,
    recipients: recipients.map(toRecipientDto),
    total: recipients.length,
  });
});

router.delete("/whatsapp-blasts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const blast = await selectById<WhatsappBlast>("whatsapp_blasts", id);
  if (!blast) {
    res.status(404).json({ error: "Blast not found" });
    return;
  }

  if (blast.status !== "pending") {
    res.status(400).json({ error: "Can only cancel pending blasts" });
    return;
  }

  await update<WhatsappBlast>("whatsapp_blasts", blast.id, { status: "cancelled" });

  await selectRaw(
    `UPDATE whatsapp_blast_recipients SET status = $1, error_message = $2 WHERE blast_id = $3`,
    ["failed", "Blast was cancelled", blast.id],
  );

  res.json({ status: "cancelled" });
});

router.post("/external/whatsapp-blast", requireApiKey, async (req, res): Promise<void> => {
  const body = (req.body as Record<string, unknown>) ?? {};

  const channelIdRaw = body.channelId;
  const channelId = typeof channelIdRaw === "number" ? channelIdRaw : parseInt(String(channelIdRaw ?? ""), 10);
  if (isNaN(channelId) || channelId <= 0) {
    res.status(400).json({ error: "channelId must be a positive number" });
    return;
  }

  const recipients = body.recipients;
  if (!Array.isArray(recipients) || recipients.length === 0) {
    res.status(400).json({ error: "recipients must be a non-empty array" });
    return;
  }

  const channel = await selectById<Channel>("channels", channelId);
  if (!channel) {
    res.status(400).json({ error: "Channel not found" });
    return;
  }
  if (channel.channelType !== "whatsapp") {
    res.status(400).json({ error: "Channel must be a WhatsApp channel" });
    return;
  }

  const blast = await insert<WhatsappBlast>("whatsapp_blasts", {
    name: `External Blast - ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
    channel_id: channelId,
    template_name: "",
    template_language: "",
    source: "external",
    external_api_key: req.externalApiKey,
    external_source_ip: req.externalSourceIp,
    total_recipients: recipients.length,
    status: "pending",
  });

  const recipientValues = (recipients as Array<Record<string, unknown>>).map((r) => ({
    blast_id: blast.id,
    phone: r.phone as string,
    template_params: Array.isArray(r.templateParams) ? JSON.stringify(r.templateParams) : null,
    content: (r.content as string) ?? null,
    status: "queued" as const,
  }));

  await insertMany<WhatsappBlastRecipient>("whatsapp_blast_recipients", recipientValues);

  res.status(201).json(toBlastDto(blast));
});

router.get("/external/whatsapp-blast/:id", requireApiKey, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const blast = await selectById<WhatsappBlast>("whatsapp_blasts", id);
  if (!blast) {
    res.status(404).json({ error: "Blast not found" });
    return;
  }

  res.json(toBlastDto(blast));
});

export default router;
