import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, channelsTable, contactsTable, conversationsTable, messagesTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// GET — Meta webhook verification
router.get("/webhooks/meta", async (req, res): Promise<void> => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe") {
    // Accept any verify token for now (production: compare against stored channel tokens)
    req.log.info({ mode, token }, "Meta webhook verification");
    res.status(200).send(challenge);
    return;
  }

  res.status(403).json({ error: "Forbidden" });
});

// POST — receive Meta webhook events
router.post("/webhooks/meta", async (req, res): Promise<void> => {
  const payload = req.body;
  req.log.info({ object: payload?.object }, "Received Meta webhook");

  // Acknowledge immediately (Meta requires < 5s)
  res.status(200).json({ status: "ok" });

  // Process async
  processWebhook(payload).catch((err) => {
    logger.error({ err }, "Error processing Meta webhook");
  });
});

async function processWebhook(payload: Record<string, unknown>) {
  const object = payload.object as string;
  const entries = payload.entry as Array<Record<string, unknown>>;

  if (!entries?.length) return;

  for (const entry of entries) {
    if (object === "whatsapp_business_account") {
      await processWhatsAppEntry(entry);
    } else if (object === "instagram" || object === "page") {
      await processMetaPageEntry(entry, object === "instagram" ? "instagram" : "facebook");
    }
  }
}

async function processWhatsAppEntry(entry: Record<string, unknown>) {
  const changes = entry.changes as Array<Record<string, unknown>>;
  if (!changes?.length) return;

  for (const change of changes) {
    const value = change.value as Record<string, unknown>;
    if (!value) continue;

    const phoneNumberId = value.metadata ? (value.metadata as Record<string, unknown>).phone_number_id as string : null;
    const messages = value.messages as Array<Record<string, unknown>>;
    if (!messages?.length || !phoneNumberId) continue;

    // Find channel by phone_number_id
    const [channel] = await db
      .select()
      .from(channelsTable)
      .where(eq(channelsTable.channelType, "whatsapp"));

    if (!channel) {
      logger.warn({ phoneNumberId }, "No WhatsApp channel found for incoming webhook");
      return;
    }

    for (const msg of messages) {
      const from = msg.from as string;
      const msgId = msg.id as string;
      const msgType = msg.type as string;
      const text = msgType === "text" ? (msg.text as Record<string, unknown>)?.body as string : null;

      // Find or create contact
      let contact = (await db.select().from(contactsTable).where(eq(contactsTable.externalId, from)))[0];
      if (!contact) {
        const contacts = await db.insert(contactsTable).values({
          name: from,
          phone: from,
          channelType: "whatsapp",
          externalId: from,
        }).returning();
        contact = contacts[0];
      }

      // Find or create conversation
      let conversation = (await db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.contactId, contact.id)))[0];

      if (!conversation) {
        const convs = await db.insert(conversationsTable).values({
          contactId: contact.id,
          channelId: channel.id,
          channelType: "whatsapp",
          status: "open",
          lastMessageAt: new Date(),
          unreadCount: 1,
        }).returning();
        conversation = convs[0];
      } else {
        await db.update(conversationsTable).set({
          status: "open",
          lastMessageAt: new Date(),
          unreadCount: (conversation.unreadCount ?? 0) + 1,
        }).where(eq(conversationsTable.id, conversation.id));
      }

      // Store message
      await db.insert(messagesTable).values({
        conversationId: conversation.id,
        senderType: "contact",
        direction: "inbound",
        contentType: msgType === "text" ? "text" : (msgType as "image" | "audio" | "document" | "video" | "location" | "sticker") ?? "text",
        content: text,
        externalMessageId: msgId,
        senderName: contact.name,
      });

      logger.info({ contactId: contact.id, conversationId: conversation.id }, "Processed WhatsApp inbound message");
    }
  }
}

async function processMetaPageEntry(entry: Record<string, unknown>, channelType: "instagram" | "facebook") {
  const messaging = entry.messaging as Array<Record<string, unknown>>;
  if (!messaging?.length) return;

  const [channel] = await db.select().from(channelsTable).where(eq(channelsTable.channelType, channelType));
  if (!channel) {
    logger.warn({ channelType }, "No channel found for incoming webhook");
    return;
  }

  for (const event of messaging) {
    const sender = event.sender as Record<string, unknown>;
    const msgEvent = event.message as Record<string, unknown>;
    if (!sender || !msgEvent) continue;

    const senderId = sender.id as string;
    const msgId = msgEvent.mid as string;
    const text = msgEvent.text as string | undefined;

    let contact = (await db.select().from(contactsTable).where(eq(contactsTable.externalId, senderId)))[0];
    if (!contact) {
      const contacts = await db.insert(contactsTable).values({
        name: `${channelType === "instagram" ? "Instagram" : "Facebook"} User`,
        channelType,
        externalId: senderId,
      }).returning();
      contact = contacts[0];
    }

    let conversation = (await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.contactId, contact.id)))[0];

    if (!conversation) {
      const convs = await db.insert(conversationsTable).values({
        contactId: contact.id,
        channelId: channel.id,
        channelType,
        status: "open",
        lastMessageAt: new Date(),
        unreadCount: 1,
      }).returning();
      conversation = convs[0];
    } else {
      await db.update(conversationsTable).set({
        status: "open",
        lastMessageAt: new Date(),
        unreadCount: (conversation.unreadCount ?? 0) + 1,
      }).where(eq(conversationsTable.id, conversation.id));
    }

    await db.insert(messagesTable).values({
      conversationId: conversation.id,
      senderType: "contact",
      direction: "inbound",
      contentType: "text",
      content: text ?? null,
      externalMessageId: msgId,
      senderName: contact.name,
    });

    logger.info({ contactId: contact.id, conversationId: conversation.id, channelType }, "Processed inbound message");
  }
}

export default router;
