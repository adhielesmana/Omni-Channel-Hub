import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, channelsTable, contactsTable, conversationsTable, messagesTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { downloadWhatsAppMedia } from "../lib/whatsapp-media";

const router: IRouter = Router();

const WA_MEDIA_TYPES = new Set(["image", "video", "audio", "voice", "document", "sticker"]);

// Whether a stored contact name is just a placeholder (phone number) we should
// overwrite once we learn the customer's real WhatsApp profile name.
function isPlaceholderName(name: string | null | undefined, phone: string): boolean {
  if (!name) return true;
  if (name === phone) return true;
  return /^[+\d\s()-]+$/.test(name);
}

// GET — Meta webhook verification
router.get("/webhooks/meta", async (req, res): Promise<void> => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe") {
    // Verify against the stored webhook_verify_token of the channel
    const [channel] = await db
      .select()
      .from(channelsTable)
      .where(eq(channelsTable.webhookVerifyToken, token as string));

    if (channel) {
      req.log.info({ mode, token, channelId: channel.id }, "Meta webhook verified");
      res.status(200).send(challenge);
      return;
    }

    req.log.warn({ mode, token }, "Meta webhook verification failed: token mismatch");
    res.status(403).json({ error: "Forbidden: invalid verify token" });
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
      await processWhatsAppStatus(entry);
    } else if (object === "instagram" || object === "page") {
      await processMetaPageEntry(entry, object === "instagram" ? "instagram" : "facebook");
    }
  }
}

async function processWhatsAppStatus(entry: Record<string, unknown>) {
  const changes = entry.changes as Array<Record<string, unknown>>;
  if (!changes?.length) return;

  for (const change of changes) {
    const value = change.value as Record<string, unknown>;
    if (!value) continue;

    const statuses = value.statuses as Array<Record<string, unknown>>;
    if (!statuses?.length) continue;

    for (const status of statuses) {
      const statusType = status.status as string; // sent, delivered, read, failed
      const waId = status.id as string;
      if (!waId) continue;

      const newStatus = statusType === "read" ? "read" : statusType === "delivered" ? "delivered" : statusType === "sent" ? "sent" : "failed";
      await db
        .update(messagesTable)
        .set({ deliveryStatus: newStatus })
        .where(eq(messagesTable.externalMessageId, waId));
      logger.info({ waId, status: newStatus }, "WhatsApp delivery status updated");
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

    // Find channel by phone_number_id (stored in external_id)
    const [channel] = await db
      .select()
      .from(channelsTable)
      .where(eq(channelsTable.externalId, phoneNumberId));

    if (!channel) {
      logger.warn({ phoneNumberId }, "No WhatsApp channel found for incoming webhook");
      return;
    }

    for (const msg of messages) {
      const from = msg.from as string;
      const msgId = msg.id as string;
      const rawType = msg.type as string;

      // Resolve content + media from the message payload
      let content: string | null = null;
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;
      let contentType: "text" | "image" | "video" | "audio" | "document" | "location" | "sticker" = "text";

      if (rawType === "text") {
        content = ((msg.text as Record<string, unknown>)?.body as string) ?? null;
      } else if (rawType === "reaction") {
        content = ((msg.reaction as Record<string, unknown>)?.emoji as string) ?? null;
      } else if (rawType === "location") {
        const loc = msg.location as Record<string, unknown> | undefined;
        content =
          (loc?.name as string) ||
          (loc?.address as string) ||
          (loc ? `${loc.latitude}, ${loc.longitude}` : null);
        contentType = "location";
      } else if (WA_MEDIA_TYPES.has(rawType)) {
        const mediaObj = msg[rawType] as Record<string, unknown> | undefined;
        content = (mediaObj?.caption as string) ?? null;
        contentType = rawType === "voice" ? "audio" : (rawType as "image" | "video" | "audio" | "document" | "sticker");
        const mediaId = mediaObj?.id as string | undefined;
        if (mediaId && channel.accessToken) {
          const dl = await downloadWhatsAppMedia(mediaId, channel.accessToken);
          if (dl) {
            mediaUrl = dl.url;
            mediaType = dl.mimeType;
          } else {
            logger.warn({ mediaId, rawType }, "WhatsApp media could not be downloaded");
          }
        }
      }

      // Extract customer profile name from webhook contacts array
      const waContacts = value.contacts as Array<Record<string, unknown>>;
      const waProfile = waContacts?.find((c: Record<string, unknown>) => c.wa_id === from);
      const profileName = waProfile ? (waProfile.profile as Record<string, unknown>)?.name as string : undefined;

      // Find or create contact
      let contact = (await db.select().from(contactsTable).where(eq(contactsTable.externalId, from)))[0];
      if (!contact) {
        const contacts = await db.insert(contactsTable).values({
          name: profileName || from,
          phone: from,
          channelType: "whatsapp",
          externalId: from,
        }).returning();
        contact = contacts[0];
      } else if (profileName && profileName !== contact.name && isPlaceholderName(contact.name, from)) {
        // Upgrade a placeholder (phone-number) name to the real WhatsApp profile name
        await db.update(contactsTable).set({ name: profileName }).where(eq(contactsTable.id, contact.id));
        contact = { ...contact, name: profileName };
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
        contentType,
        content,
        mediaUrl,
        mediaType,
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
