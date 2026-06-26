import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, messagesTable, conversationsTable, usersTable, channelsTable, contactsTable } from "@workspace/db";
import {
  ListMessagesResponse,
  ListMessagesParams,
  SendMessageParams,
  SendMessageBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function sendWhatsAppMessage(channel: typeof channelsTable.$inferSelect, contact: typeof contactsTable.$inferSelect, content: string): Promise<{ messages?: Array<{ id: string }>; error?: { message: string } }> {
  const url = `https://graph.facebook.com/v18.0/${channel.externalId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${channel.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: contact.phone,
      type: "text",
      text: { body: content },
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { messages?: Array<{ id: string }>; error?: { message: string } };
  if (!res.ok) {
    logger.error({ status: res.status, data }, "WhatsApp send failed");
    throw new Error(data.error?.message || `WhatsApp send failed: ${res.status}`);
  }
  return data;
}

const toDto = (m: typeof messagesTable.$inferSelect) => ({
  ...m,
  createdAt: m.createdAt.toISOString(),
  deliveryStatus: m.deliveryStatus ?? "pending",
});

router.get("/conversations/:conversationId/messages", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;
  const params = ListMessagesParams.safeParse({ conversationId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.conversationId))
    .orderBy(asc(messagesTable.createdAt));

  // Enrich with sender name
  const enriched = await Promise.all(messages.map(async (m) => {
    let senderName = m.senderName;
    if (!senderName && m.senderId && m.senderType === "agent") {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, m.senderId));
      senderName = user?.name ?? null;
    }
    return { ...toDto(m), senderName };
  }));

  // Mark inbound messages as read
  await db
    .update(messagesTable)
    .set({ isRead: true })
    .where(eq(messagesTable.conversationId, params.data.conversationId));

  // Reset unread count
  await db
    .update(conversationsTable)
    .set({ unreadCount: 0 })
    .where(eq(conversationsTable.id, params.data.conversationId));

  res.json(ListMessagesResponse.parse(enriched));
});

router.post("/conversations/:conversationId/messages", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;
  const params = SendMessageParams.safeParse({ conversationId: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { contentType, content, mediaUrl, mediaType, senderId, senderName: bodySenderName } = parsed.data;
  const isNote = contentType === "note";

  // Resolve sender name: prefer body value, then lookup from DB
  let senderName: string | null = bodySenderName ?? null;
  if (!senderName && senderId) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, senderId));
    senderName = user?.name ?? null;
  }

  let [message] = await db.insert(messagesTable).values({
    conversationId: params.data.conversationId,
    senderType: "agent",
    senderId: senderId ?? null,
    direction: "outbound",
    contentType,
    content: content ?? null,
    mediaUrl: mediaUrl ?? null,
    mediaType: mediaType ?? null,
    isRead: false,
    senderName,
  }).returning();

  // Update conversation lastMessageAt
  await db
    .update(conversationsTable)
    .set({ lastMessageAt: new Date(), updatedAt: new Date() })
    .where(eq(conversationsTable.id, params.data.conversationId));

  // Send to WhatsApp Cloud API (skip for notes and non-text for now)
  if (!isNote && contentType === "text" && content) {
    try {
      const [conv] = await db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, params.data.conversationId));
      if (conv) {
        const [channel] = await db
          .select()
          .from(channelsTable)
          .where(eq(channelsTable.id, conv.channelId));
        const [contact] = await db
          .select()
          .from(contactsTable)
          .where(eq(contactsTable.id, conv.contactId));
        if (channel && contact && channel.channelType === "whatsapp" && channel.accessToken && channel.externalId && contact.phone) {
          const waRes = await sendWhatsAppMessage(channel, contact, content);
          if (waRes.messages?.[0]?.id) {
            await db
              .update(messagesTable)
              .set({ externalMessageId: waRes.messages[0].id, deliveryStatus: "sent" })
              .where(eq(messagesTable.id, message.id));
            logger.info({ messageId: message.id, waId: waRes.messages[0].id }, "WhatsApp message sent");
            // Reflect the updated status in the returned message so the frontend doesn't show pending
            message = { ...message, deliveryStatus: "sent" };
          }
        }
      }
    } catch (err) {
      // Log but don't fail — message is already saved
      logger.error({ err, messageId: message.id }, "Failed to send WhatsApp message");
    }
  }

  res.status(201).json({ ...toDto(message), senderName });
});

export default router;
