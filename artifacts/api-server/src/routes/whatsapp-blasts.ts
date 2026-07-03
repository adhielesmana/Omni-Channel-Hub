import { Router, type IRouter } from "express";
import { eq, desc, like, and, asc, sql } from "drizzle-orm";
import { db, whatsappBlastsTable, whatsappBlastRecipientsTable, contactsTable, channelsTable, usersTable } from "@workspace/db";
import {
  ListWhatsappBlastsQueryParams,
  ListWhatsappBlastsResponse,
  CreateWhatsappBlastBody,
  GetWhatsappBlastParams,
  GetWhatsappBlastResponse,
  CancelWhatsappBlastParams,
  ListWhatsappBlastTemplatesQueryParams,
  ListWhatsappBlastTemplatesResponse,
  ListWhatsappBlastTemplatesResponseItem,
  GetWhatsappBlastSettingsResponse,
  UpdateWhatsappBlastSettingsBody,
  UpdateWhatsappBlastSettingsResponse,
  ExternalCreateWhatsappBlastBody,
  ExternalGetWhatsappBlastStatusParams,
  ExternalGetWhatsappBlastStatusResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/auth";
import { requireApiKey } from "../middlewares/api-key";
import { getBlastSettings, updateBlastSettings } from "../lib/blast-settings";

const router: IRouter = Router();

const toBlastDto = (b: typeof whatsappBlastsTable.$inferSelect) => ({
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

const toRecipientDto = (r: typeof whatsappBlastRecipientsTable.$inferSelect) => ({
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

// Internal: List blasts (paginated, searchable)
router.get("/whatsapp-blasts", requireAuth, async (req, res): Promise<void> => {
  const params = ListWhatsappBlastsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { page, limit, search } = params.data;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) {
    conditions.push(
      sql`(${whatsappBlastsTable.name}::text ILIKE ${`%${search}%`}
        OR EXISTS (
          SELECT 1 FROM ${whatsappBlastRecipientsTable}
          WHERE ${whatsappBlastRecipientsTable.blastId} = ${whatsappBlastsTable.id}
          AND ${whatsappBlastRecipientsTable.phone}::text ILIKE ${`%${search}%`}
        )
        OR ${whatsappBlastsTable.externalApiKey}::text ILIKE ${`%${search}%`}
        OR ${whatsappBlastsTable.externalSourceIp}::text ILIKE ${`%${search}%`})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const blasts = await db
    .select()
    .from(whatsappBlastsTable)
    .where(whereClause)
    .orderBy(desc(whatsappBlastsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(whatsappBlastsTable)
    .where(whereClause);

  // Enrich with creator name
  const enriched = await Promise.all(blasts.map(async (b) => {
    const dto = toBlastDto(b);
    if (b.createdByUserId) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, b.createdByUserId));
      dto.createdByUserName = user?.name ?? null;
    }

    // Get first few recipients for preview
    const recipients = await db
      .select()
      .from(whatsappBlastRecipientsTable)
      .where(eq(whatsappBlastRecipientsTable.blastId, b.id))
      .limit(5);

    return { ...dto, recipients: recipients.map(toRecipientDto) };
  }));

  res.json(ListWhatsappBlastsResponse.parse({
    data: enriched,
    total: Number(count),
    page,
    limit,
  }));
});

// Internal: Create manual blast
router.post("/whatsapp-blasts", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateWhatsappBlastBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, channelId, templateName, templateLanguage, templateParams, scheduledAt, contactIds } = parsed.data;

  // Verify channel exists and is WhatsApp
  const [channel] = await db.select().from(channelsTable).where(eq(channelsTable.id, channelId));
  if (!channel) {
    res.status(400).json({ error: "Channel not found" });
    return;
  }
  if (channel.channelType !== "whatsapp") {
    res.status(400).json({ error: "Channel must be a WhatsApp channel" });
    return;
  }

  // Determine target contacts
  let targetContacts: typeof contactsTable.$inferSelect[];
  if (contactIds && contactIds.length > 0) {
    targetContacts = await db
      .select()
      .from(contactsTable)
      .where(and(eq(contactsTable.channelType, "whatsapp"), sql`${contactsTable.id} = ANY(${contactIds})`));
  } else {
    targetContacts = await db
      .select()
      .from(contactsTable)
      .where(eq(contactsTable.channelType, "whatsapp"));
  }

  if (targetContacts.length === 0) {
    res.status(400).json({ error: "No WhatsApp contacts found to blast" });
    return;
  }

  const [blast] = await db.insert(whatsappBlastsTable).values({
    name,
    channelId,
    templateName,
    templateLanguage,
    templateParams: templateParams ? JSON.stringify(templateParams) : null,
    source: "manual",
    createdByUserId: req.userId!,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    totalRecipients: targetContacts.length,
    status: "pending",
  }).returning();

  // Insert recipients
  const recipientValues = targetContacts.map((c) => ({
    blastId: blast.id,
    contactId: c.id,
    phone: c.phone ?? c.externalId,
    templateParams: null as string | null,
    content: null as string | null,
    status: "queued" as const,
  }));

  await db.insert(whatsappBlastRecipientsTable).values(recipientValues);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  const dto = toBlastDto(blast);
  dto.createdByUserName = user?.name ?? null;

  res.status(201).json(dto);
});

// Internal: Get blast detail
router.get("/whatsapp-blasts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetWhatsappBlastParams.safeParse({ id: parseInt(req.params.id as string, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [blast] = await db
    .select()
    .from(whatsappBlastsTable)
    .where(eq(whatsappBlastsTable.id, params.data.id));

  if (!blast) {
    res.status(404).json({ error: "Blast not found" });
    return;
  }

  const recipients = await db
    .select()
    .from(whatsappBlastRecipientsTable)
    .where(eq(whatsappBlastRecipientsTable.blastId, blast.id))
    .orderBy(asc(whatsappBlastRecipientsTable.id));

  const dto = toBlastDto(blast);
  if (blast.createdByUserId) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, blast.createdByUserId));
    dto.createdByUserName = user?.name ?? null;
  }

  res.json(GetWhatsappBlastResponse.parse({
    blast: dto,
    recipients: recipients.map(toRecipientDto),
    total: recipients.length,
  }));
});

// Internal: Cancel pending blast
router.delete("/whatsapp-blasts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = CancelWhatsappBlastParams.safeParse({ id: parseInt(req.params.id as string, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [blast] = await db
    .select()
    .from(whatsappBlastsTable)
    .where(eq(whatsappBlastsTable.id, params.data.id));

  if (!blast) {
    res.status(404).json({ error: "Blast not found" });
    return;
  }

  if (blast.status !== "pending") {
    res.status(400).json({ error: "Can only cancel pending blasts" });
    return;
  }

  await db
    .update(whatsappBlastsTable)
    .set({ status: "cancelled" })
    .where(eq(whatsappBlastsTable.id, blast.id));

  await db
    .update(whatsappBlastRecipientsTable)
    .set({ status: "failed", errorMessage: "Blast was cancelled" })
    .where(eq(whatsappBlastRecipientsTable.blastId, blast.id));

  res.json({ status: "cancelled" });
});

// Internal: Fetch approved templates from Meta
router.get("/whatsapp-blasts/templates", requireAuth, async (req, res): Promise<void> => {
  const params = ListWhatsappBlastTemplatesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(and(eq(channelsTable.id, params.data.channelId), eq(channelsTable.channelType, "whatsapp")));

  if (!channel) {
    res.status(400).json({ error: "WhatsApp channel not found" });
    return;
  }

  if (!channel.accessToken) {
    res.status(400).json({ error: "Channel missing access token" });
    return;
  }

  if (!channel.wabaId && !channel.externalId) {
    res.status(400).json({ error: "Channel missing WABA ID and Phone Number ID" });
    return;
  }

  try {
    // Try fetching templates from Meta using WABA ID first
    let templates: Array<Record<string, unknown>> = [];

    if (channel.wabaId) {
      const url = `https://graph.facebook.com/v18.0/${channel.wabaId}/message_templates?status=APPROVED`;
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${channel.accessToken}` },
      });

      if (response.ok) {
        const data = (await response.json()) as { data?: Array<Record<string, unknown>> };
        templates = data.data ?? [];
      } else {
        const errorData = (await response.json().catch(() => ({}))) as { error?: { message?: string; code?: number } };
        const metaError = errorData.error?.message || `Meta API error: ${response.status}`;
        const errorCode = errorData.error?.code;
        logger.warn({ status: response.status, errorCode, metaError, wabaId: channel.wabaId }, "Meta template fetch failed via WABA ID");

        // If WABA ID failed, try phone number ID as fallback
        if (channel.externalId) {
          const fallbackUrl = `https://graph.facebook.com/v18.0/${channel.externalId}/message_templates?status=APPROVED`;
          const fallbackRes = await fetch(fallbackUrl, {
            headers: { "Authorization": `Bearer ${channel.accessToken}` },
          });

          if (fallbackRes.ok) {
            const fallbackData = (await fallbackRes.json()) as { data?: Array<Record<string, unknown>> };
            templates = fallbackData.data ?? [];
          } else {
            const fbErr = (await fallbackRes.json().catch(() => ({}))) as { error?: { message?: string; code?: number } };
            res.status(502).json({ error: `Meta API: ${fbErr.error?.message || metaError}` });
            return;
          }
        } else {
          res.status(502).json({ error: `Meta API: ${metaError}` });
          return;
        }
      }
    } else if (channel.externalId) {
      // No WABA ID — try phone number ID directly
      const url = `https://graph.facebook.com/v18.0/${channel.externalId}/message_templates?status=APPROVED`;
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${channel.accessToken}` },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: { message?: string; code?: number } };
        res.status(502).json({ error: `Meta API: ${errorData.error?.message || `Error ${response.status}`}` });
        return;
      }

      const data = (await response.json()) as { data?: Array<Record<string, unknown>> };
      templates = data.data ?? [];
    } else {
      res.status(400).json({ error: "Channel missing WABA ID and Phone Number ID" });
      return;
    }

    const result = (templates).map((t: Record<string, unknown>) =>
      ListWhatsappBlastTemplatesResponseItem.parse({
        id: t.id as string,
        name: t.name as string,
        language: (t.language as string) ?? null,
        status: t.status as string,
        category: t.category as string,
        components: t.components as Array<Record<string, unknown>>,
        channelId: channel.id,
        channelName: channel.name,
      })
    );

    res.json(ListWhatsappBlastTemplatesResponse.parse(result));
  } catch (err) {
    logger.error({ err }, "Meta template fetch error");
    res.status(502).json({ error: "Failed to connect to Meta API" });
  }
});

// Internal: Get blast settings
router.get("/whatsapp-blasts/settings", requireAuth, async (req, res): Promise<void> => {
  res.json(GetWhatsappBlastSettingsResponse.parse(getBlastSettings()));
});

// Internal: Update blast settings
router.put("/whatsapp-blasts/settings", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateWhatsappBlastSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const settings = updateBlastSettings(parsed.data);
  res.json(UpdateWhatsappBlastSettingsResponse.parse(settings));
});

// External: Receive blast from external app
router.post("/external/whatsapp-blast", requireApiKey, async (req, res): Promise<void> => {
  const parsed = ExternalCreateWhatsappBlastBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { channelId, recipients } = parsed.data;

  // Verify channel
  const [channel] = await db.select().from(channelsTable).where(eq(channelsTable.id, channelId));
  if (!channel) {
    res.status(400).json({ error: "Channel not found" });
    return;
  }
  if (channel.channelType !== "whatsapp") {
    res.status(400).json({ error: "Channel must be a WhatsApp channel" });
    return;
  }

  const [blast] = await db.insert(whatsappBlastsTable).values({
    name: `External Blast - ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
    channelId,
    templateName: "",
    templateLanguage: "",
    source: "external",
    externalApiKey: req.externalApiKey,
    externalSourceIp: req.externalSourceIp,
    totalRecipients: recipients.length,
    status: "pending",
  }).returning();

  // Insert recipients — each can have different params/content
  const recipientValues = recipients.map((r) => ({
    blastId: blast.id,
    phone: r.phone,
    templateParams: r.templateParams ? JSON.stringify(r.templateParams) : null,
    content: r.content ?? null,
    status: "queued" as const,
  }));

  await db.insert(whatsappBlastRecipientsTable).values(recipientValues);

  res.status(201).json(toBlastDto(blast));
});

// External: Check blast status
router.get("/external/whatsapp-blast/:id", requireApiKey, async (req, res): Promise<void> => {
  const params = ExternalGetWhatsappBlastStatusParams.safeParse({ id: parseInt(req.params.id as string, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [blast] = await db
    .select()
    .from(whatsappBlastsTable)
    .where(eq(whatsappBlastsTable.id, params.data.id));

  if (!blast) {
    res.status(404).json({ error: "Blast not found" });
    return;
  }

  res.json(ExternalGetWhatsappBlastStatusResponse.parse(toBlastDto(blast)));
});

export default router;
