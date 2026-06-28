import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, channelsTable, contactsTable, conversationsTable, messagesTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { downloadWhatsAppMedia } from "../lib/whatsapp-media";
import { toTitleCase } from "../lib/string";

const router: IRouter = Router();

const WA_MEDIA_TYPES = new Set(["image", "video", "audio", "voice", "document", "sticker"]);

// Whether a stored contact name is just a placeholder we should overwrite
// once we learn the customer's real profile name from the platform.
function isPlaceholderName(name: string | null | undefined, phone: string): boolean {
  if (!name) return true;
  if (name === phone) return true;
  if (name === "Instagram User" || name === "Facebook User") return true;
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

      // Extract customer profile name and picture from webhook contacts array
      const waContacts = value.contacts as Array<Record<string, unknown>>;
      const waProfile = waContacts?.find((c: Record<string, unknown>) => c.wa_id === from);
      const waProfileData = waProfile ? (waProfile.profile as Record<string, unknown>) : undefined;
      const profileName = waProfileData?.name as string | undefined;
      const profilePicture = waProfileData ? (waProfileData.picture as Record<string, unknown>)?.data as { url?: string } | undefined : undefined;
      const avatarUrl = profilePicture?.url ?? undefined;

      // Find or create contact
      let contact = (await db.select().from(contactsTable).where(eq(contactsTable.externalId, from)))[0];
      if (!contact) {
        const contacts = await db.insert(contactsTable).values({
          name: toTitleCase(profileName || from),
          phone: from,
          channelType: "whatsapp",
          externalId: from,
          avatarUrl: avatarUrl ?? undefined,
        }).returning();
        contact = contacts[0];
      } else {
        const updates: Partial<typeof contactsTable.$inferSelect> = {};
        // Always update contact name if WhatsApp profile name is available and different
        if (profileName && profileName !== contact.name) {
          updates.name = toTitleCase(profileName);
        }
        if (avatarUrl && avatarUrl !== contact.avatarUrl) {
          updates.avatarUrl = avatarUrl;
        }
        if (Object.keys(updates).length > 0) {
          await db.update(contactsTable).set(updates).where(eq(contactsTable.id, contact.id));
          contact = { ...contact, ...updates };
        }
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

/**
 * Fetch a Facebook Messenger user's real name and profile picture from
 * Meta's Graph API using their PSID and the channel's access token.
 */
async function fetchMessengerUserProfile(
  psid: string,
  accessToken: string | null | undefined
): Promise<{ name?: string; profilePic?: string }> {
  if (!accessToken) return {};
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${psid}?fields=name,profile_pic&access_token=${encodeURIComponent(accessToken)}`
    );
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (data.error) {
      logger.warn({ psid, error: data.error }, "Messenger profile API returned error");
      return {};
    }
    const name = data.name as string | undefined;
    const profilePic = data.profile_pic as string | undefined;
    return { name, profilePic };
  } catch (err) {
    logger.warn({ err, psid }, "Failed to fetch Messenger user profile");
  }
  return {};
}

/**
 * Fetch an Instagram user's name from Meta's Graph API using their IGSID.
 *
 * Strategy:
 * 1. Direct IGSID lookup via graph.facebook.com/v21.0/{igsid}?fields=name,username
 * 2. Fallback: scan page conversations to find the participant name
 * 3. If nothing works, return {} so the caller falls back to "Instagram User".
 *    We NEVER silently discard — a missing profile just means a placeholder name.
 */
async function fetchInstagramUserProfile(
  igsid: string,
  pageId: string | null | undefined,
  accessToken: string | null | undefined
): Promise<{ name?: string; profilePic?: string }> {
  if (!accessToken) return {};
  try {
    // 1. Direct IGSID lookup (v21.0 with name,username)
    const directRes = await fetch(
      `https://graph.facebook.com/v21.0/${igsid}?fields=name,username&access_token=${encodeURIComponent(accessToken)}`
    );
    const directData = (await directRes.json().catch(() => ({}))) as Record<string, unknown>;
    if (!directData.error) {
      const name = directData.name as string | undefined;
      const username = directData.username as string | undefined;
      if (name) {
        logger.info({ igsid, name }, "Fetched Instagram user profile (direct)");
        return { name };
      }
      if (username) {
        logger.info({ igsid, username }, "Fetched Instagram user profile (username fallback)");
        return { name: username };
      }
    } else {
      logger.warn({ igsid, error: directData.error }, "Instagram direct profile lookup failed");
    }

    // 2. Fallback: scan page conversations to find this IGSID
    if (pageId) {
      const convRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/conversations?fields=participants{name,username,id}&access_token=${encodeURIComponent(accessToken)}&limit=100`
      );
      const convData = (await convRes.json().catch(() => ({}))) as {
        data?: Array<{
          participants?: { data?: Array<{ id: string; name?: string; username?: string }> };
        }>;
      };
      for (const conv of convData.data || []) {
        for (const p of conv.participants?.data || []) {
          if (p.id === igsid && (p.name || p.username)) {
            logger.info({ igsid, name: p.name || p.username }, "Fetched Instagram user profile (conversations fallback)");
            return { name: p.name || p.username };
          }
        }
      }
    }
  } catch (err) {
    logger.warn({ err, igsid }, "Failed to fetch Instagram user profile");
  }
  return {};
}

async function processMetaPageEntry(entry: Record<string, unknown>, channelType: "instagram" | "facebook") {
  const messaging = entry.messaging as Array<Record<string, unknown>>;
  if (!messaging?.length) return;

  const [channel] = await db.select().from(channelsTable).where(eq(channelsTable.channelType, channelType));
  if (!channel) {
    logger.warn({ channelType }, "No channel found for incoming webhook");
    return;
  }

  const pageId = channel.pageId || channel.externalId;
  // Instagram Business Account ID (used as sender.id for auto-replies from the business)
  const igBusinessId = channelType === "instagram" ? "17841457916872770" : undefined;

  for (const event of messaging) {
    const sender = event.sender as Record<string, unknown>;
    const msgEvent = event.message as Record<string, unknown>;
    if (!sender || !msgEvent) continue;

    const senderId = sender.id as string;
    const msgId = msgEvent.mid as string;
    const text = msgEvent.text as string | undefined;

    // Skip auto-replies from the business page itself — these should appear
    // as outbound messages in the customer's conversation, not create a new one.
    // For Instagram, check both the Facebook Page ID and the Instagram Business Account ID.
    if (pageId && senderId === pageId) {
      logger.info({ senderId, channelType }, "Skipping business page auto-reply");
      continue;
    }
    if (channelType === "instagram" && igBusinessId && senderId === igBusinessId) {
      logger.info({ senderId, channelType }, "Skipping Instagram business account auto-reply");
      continue;
    }

    let contact = (await db.select().from(contactsTable).where(eq(contactsTable.externalId, senderId)))[0];
    if (!contact) {
      // Fetch real name + picture with the right API for each channel
      const profile =
        channelType === "instagram"
          ? await fetchInstagramUserProfile(senderId, channel.pageId || channel.externalId, channel.accessToken)
          : await fetchMessengerUserProfile(senderId, channel.accessToken);
      const contacts = await db.insert(contactsTable).values({
        name: toTitleCase(profile.name || `${channelType === "instagram" ? "Instagram" : "Facebook"} User`),
        channelType,
        externalId: senderId,
        avatarUrl: profile.profilePic ?? undefined,
      }).returning();
      contact = contacts[0];
    } else if (isPlaceholderName(contact.name, senderId) || !contact.avatarUrl) {
      // Update existing placeholder contact with real name + picture if available
      const profile =
        channelType === "instagram"
          ? await fetchInstagramUserProfile(senderId, channel.pageId || channel.externalId, channel.accessToken)
          : await fetchMessengerUserProfile(senderId, channel.accessToken);
      const updates: Partial<typeof contactsTable.$inferSelect> = {};
      if (profile.name && (isPlaceholderName(contact.name, senderId) || profile.name !== contact.name)) {
        updates.name = toTitleCase(profile.name);
      }
      if (profile.profilePic && !contact.avatarUrl) {
        updates.avatarUrl = profile.profilePic;
      }
      if (Object.keys(updates).length > 0) {
        await db.update(contactsTable).set(updates).where(eq(contactsTable.id, contact.id));
        contact = { ...contact, ...updates };
      }
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
