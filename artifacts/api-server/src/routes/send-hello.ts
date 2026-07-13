import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, channelsTable, contactsTable, conversationsTable, messagesTable, waTemplatesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { sendWhatsAppTemplate } from "./external-send";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function findOrCreateConversation(
  contactId: number,
  channelId: number,
  channel: typeof channelsTable.$inferSelect
) {
  const [existing] = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.contactId, contactId), eq(conversationsTable.channelId, channelId)));

  if (existing) return existing;

  const [created] = await db
    .insert(conversationsTable)
    .values({
      contactId,
      channelId,
      channelType: "whatsapp",
      phoneNumberId: channel.externalId,
      wabaId: channel.wabaId ?? null,
      status: "open",
      lastMessageAt: new Date(),
      unreadCount: 0,
    })
    .returning();

  return created;
}

router.post("/send-hello", requireAuth, async (req, res): Promise<void> => {
  const contactId = typeof req.body?.contactId === "number" ? req.body.contactId : Number(req.body?.contactId);
  if (!Number.isFinite(contactId) || contactId <= 0) {
    res.status(400).json({ error: "contactId must be a positive number" });
    return;
  }

  const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, contactId));
  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  if (!contact.phone) {
    res.status(400).json({ error: "Contact has no phone number" });
    return;
  }

  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(and(eq(channelsTable.name, "MaxnetPlus"), eq(channelsTable.channelType, "whatsapp")));

  if (!channel) {
    res.status(400).json({ error: "Default WhatsApp channel MaxnetPlus not found" });
    return;
  }

  if (!channel.accessToken || !channel.externalId) {
    res.status(400).json({ error: "Channel is missing access token or external ID" });
    return;
  }

  const [template] = await db
    .select()
    .from(waTemplatesTable)
    .where(and(eq(waTemplatesTable.name, "sapa_customer"), eq(waTemplatesTable.channelId, channel.id), eq(waTemplatesTable.status, "APPROVED")));

  if (!template) {
    res.status(400).json({ error: "Template sapa_customer not found or not approved for MaxnetPlus" });
    return;
  }

  try {
    const conversation = await findOrCreateConversation(contact.id, channel.id, channel);
    const params = [contact.name || contact.phone];
    const messageId = await sendWhatsAppTemplate(channel, contact.phone, "sapa_customer", template.language, params);

    let content = "";
    if (template.components) {
      try {
        const comps = JSON.parse(template.components) as Array<{ type: string; text?: string }>;
        const body = comps.find((c) => c.type === "BODY");
        if (body?.text) {
          content = body.text.replace(/\{\{\d+\}\}/g, () => params.shift() || "");
        }
      } catch { /* fall through */ }
    }
    if (!content) {
      content = `Halo Kak ${contact.name || contact.phone}, Kami dari MaxnetPlus, adakah yang bisa kami bantu ?`;
    }

    const isSuperadmin = req.userId === -1;
    const [messageRecord] = await db
      .insert(messagesTable)
      .values({
        conversationId: conversation.id,
        senderType: isSuperadmin ? "system" : "agent",
        senderId: isSuperadmin ? null : req.userId ?? null,
        direction: "outbound",
        contentType: "template",
        content,
        externalMessageId: messageId,
        deliveryStatus: "sent",
      })
      .returning();

    await db
      .update(conversationsTable)
      .set({
        status: "open",
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversationsTable.id, conversation.id));

    res.json({
      success: true,
      messageId,
      conversationId: conversation.id,
      messageRecordId: messageRecord.id,
    });
  } catch (err) {
    logger.error({ err, contactId }, "Failed to send hello message");
    res.status(502).json({ error: err instanceof Error ? err.message : "Failed to send hello message" });
  }
});

export default router;
