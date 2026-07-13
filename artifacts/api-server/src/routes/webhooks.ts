import { Router } from "../lib/http-kit";
import { randomUUID } from "crypto";
import { selectWhere, insert, query } from "@workspace/db";
import type { Channel, Contact, Conversation, Message } from "@workspace/db";
import { logger } from "../lib/logger";
import { downloadWhatsAppMedia } from "../lib/whatsapp-media";
import { uploadToR2 } from "../lib/r2";
import { optimizeImage } from "../lib/media-optimizer";
import { toTitleCase } from "../lib/string";
import { fetchCustomerProfile } from "../lib/meta-profile";

const router = Router();

const WA_MEDIA_TYPES = new Set(["image", "video", "audio", "voice", "document", "sticker"]);

const META_ATTACHMENT_MIME_MAP: Record<string, string> = {
  image: "image/jpeg",
  video: "video/mp4",
  audio: "audio/mpeg",
  file: "application/octet-stream",
};

async function downloadAndStoreMetaMedia(
  url: string,
  attachmentType: string,
  accessToken?: string,
): Promise<{ url: string; mimeType: string } | null> {
  try {
    const fetchUrl = accessToken ? `${url}&access_token=${encodeURIComponent(accessToken)}` : url;
    const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok || !res.body) return null;

    const chunks: Buffer[] = [];
    const reader = res.body.getReader();
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
      if (totalBytes > 25 * 1024 * 1024) {
        reader.cancel();
        return null;
      }
      chunks.push(Buffer.from(value));
    }

    let buffer = Buffer.concat(chunks);
    const mimeType = META_ATTACHMENT_MIME_MAP[attachmentType] ?? "application/octet-stream";

    if (attachmentType === "image") {
      const optimized = await optimizeImage(buffer, mimeType);
      buffer = Buffer.from(optimized.buffer);
    }

    const ext = attachmentType === "image" ? "jpg" : attachmentType === "video" ? "mp4" : attachmentType === "audio" ? "mp3" : "bin";
    const filename = `${randomUUID()}.${ext}`;

    const uploaded = await uploadToR2(filename, buffer, mimeType);
    if (!uploaded) {
      const { promises: fs } = await import("fs");
      const path = await import("path");
      const mediaDir = path.default.resolve(process.env["MEDIA_DIR"] ?? "./media");
      await fs.mkdir(mediaDir, { recursive: true });
      await fs.writeFile(path.default.join(mediaDir, filename), buffer);
    }

    return { url: `/api/media/${filename}`, mimeType };
  } catch (err) {
    logger.error({ err, url, attachmentType }, "Failed to download meta media attachment");
    return null;
  }
}

// GET — Meta webhook verification
router.get("/webhooks/meta", async (req, res): Promise<void> => {
  const parsedUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const mode = parsedUrl.searchParams.get("hub.mode");
  const token = parsedUrl.searchParams.get("hub.verify_token");
  const challenge = parsedUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe") {
    const [channel] = await selectWhere<Channel>("channels", { webhook_verify_token: token ?? "" });

    if (channel) {
      req.log.info({ mode, token, channelId: channel.id }, "Meta webhook verified");
      res.status(200).send(challenge ?? "");
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
  const payload = req.body as Record<string, unknown> | null;
  req.log.info({ object: payload?.object }, "Received Meta webhook");

  // Acknowledge immediately (Meta requires < 5s)
  res.status(200).json({ status: "ok" });

  // Process async
  processWebhook(payload ?? {}).catch((err) => {
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
      const statusType = status.status as string;
      const waId = status.id as string;
      if (!waId) continue;

      const newStatus = statusType === "read" ? "read" : statusType === "delivered" ? "delivered" : statusType === "sent" ? "sent" : "failed";
      await query("UPDATE messages SET delivery_status = $1 WHERE external_message_id = $2", [newStatus, waId]);
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
    const [channel] = await selectWhere<Channel>("channels", { external_id: phoneNumberId });

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

      // Extract customer profile name from the webhook contacts array when available.
      const waContacts = value.contacts as Array<Record<string, unknown>>;
      const waProfile = waContacts?.find((c: Record<string, unknown>) => c.wa_id === from);
      const waProfileData = waProfile ? (waProfile.profile as Record<string, unknown>) : undefined;
      const profileName = waProfileData?.name as string | undefined;
      const profilePicture = waProfileData ? (waProfileData.picture as Record<string, unknown>)?.data as { url?: string } | undefined : undefined;
      const whatsappAvatarUrl = profilePicture?.url ?? undefined;

      const remoteProfile = channel.channelType === "whatsapp"
        ? null
        : await fetchCustomerProfile(channel.channelType, from, channel.accessToken ?? "");
      const remoteProfileName = remoteProfile?.name ?? remoteProfile?.username ?? null;
      const remoteAvatarUrl = remoteProfile?.avatarUrl ?? null;

      const avatarUrl = remoteAvatarUrl ?? whatsappAvatarUrl;
      const contactName = remoteProfileName ?? profileName;

      // Find or create contact
      let contact: Contact;
      const existingContacts = await selectWhere<Contact>("contacts", { external_id: from });
      if (existingContacts.length === 0) {
        contact = await insert<Contact>("contacts", {
          name: toTitleCase(contactName || from),
          phone: from,
          channel_type: "whatsapp",
          external_id: from,
          avatar_url: avatarUrl ?? null,
        });
      } else {
        contact = existingContacts[0];
        const updates: Record<string, unknown> = {};
        if (contactName && contactName !== contact.name) {
          updates.name = toTitleCase(contactName);
        }
        if (avatarUrl && avatarUrl !== contact.avatarUrl) {
          updates.avatar_url = avatarUrl;
        }
        if (Object.keys(updates).length > 0) {
          const updated = await query<Contact>(
            "UPDATE contacts SET name = COALESCE($1, name), avatar_url = COALESCE($2, avatar_url), updated_at = NOW() WHERE id = $3 RETURNING *",
            [updates.name ?? null, updates.avatar_url ?? null, contact.id],
          );
          if (updated.length > 0) contact = updated[0];
        }
      }

      // Find or create conversation
      let conversation: Conversation;
      const existingConvs = await selectWhere<Conversation>("conversations", { contact_id: contact.id });
      const wabaId = entry.id as string | undefined;

      if (existingConvs.length === 0) {
        conversation = await insert<Conversation>("conversations", {
          contact_id: contact.id,
          channel_id: channel.id,
          channel_type: "whatsapp",
          phone_number_id: phoneNumberId,
          waba_id: wabaId ?? channel.wabaId ?? null,
          status: "open",
          last_message_at: new Date(),
          unread_count: 1,
        });
      } else {
        conversation = existingConvs[0];
        const updates: Record<string, unknown> = {
          status: "open",
          last_message_at: new Date(),
          unread_count: (conversation.unreadCount ?? 0) + 1,
          updated_at: new Date(),
        };
        if (phoneNumberId && !conversation.phoneNumberId) updates.phone_number_id = phoneNumberId;
        if (wabaId && !conversation.wabaId) updates.waba_id = wabaId;
        if (conversation.channelId !== channel.id) updates.channel_id = channel.id;

        const updated = await query<Conversation>(
          `UPDATE conversations SET ${Object.keys(updates).map((k, i) => `"${k}" = $${i + 1}`).join(", ")} WHERE id = $${Object.keys(updates).length + 1} RETURNING *`,
          [...Object.values(updates), conversation.id],
        );
        if (updated.length > 0) conversation = updated[0];
      }

      // Store message
      await insert("messages", {
        conversation_id: conversation.id,
        sender_type: "contact",
        direction: "inbound",
        content_type: contentType,
        content,
        media_url: mediaUrl,
        media_type: mediaType,
        external_message_id: msgId,
        sender_name: contact.name,
      });

      logger.info({ contactId: contact.id, conversationId: conversation.id }, "Processed WhatsApp inbound message");
    }
  }
}

async function processMetaPageEntry(entry: Record<string, unknown>, channelType: "instagram" | "facebook") {
  const messaging = entry.messaging as Array<Record<string, unknown>>;
  if (!messaging?.length) return;

  const [channel] = await selectWhere<Channel>("channels", { channel_type: channelType });
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
    const attachments = msgEvent.attachments as Array<Record<string, unknown>> | undefined;

    const remoteProfile = channel.accessToken
      ? await fetchCustomerProfile(channelType, senderId, channel.accessToken)
      : null;

    let contact: Contact;
    const existingContacts = await selectWhere<Contact>("contacts", { external_id: senderId });
    const remoteProfileName = remoteProfile?.name ?? remoteProfile?.username ?? null;

    if (existingContacts.length === 0) {
      contact = await insert<Contact>("contacts", {
        name: toTitleCase(remoteProfileName ?? senderId),
        channel_type: channelType,
        external_id: senderId,
        avatar_url: remoteProfile?.avatarUrl ?? null,
      });
    } else {
      contact = existingContacts[0];
      const updates: Record<string, unknown> = {};
      if (remoteProfileName && remoteProfileName !== contact.name) {
        updates.name = toTitleCase(remoteProfileName);
      }
      if (remoteProfile?.avatarUrl && remoteProfile.avatarUrl !== contact.avatarUrl) {
        updates.avatar_url = remoteProfile.avatarUrl;
      }
      if (Object.keys(updates).length > 0) {
        const updated = await query<Contact>(
          "UPDATE contacts SET name = COALESCE($1, name), avatar_url = COALESCE($2, avatar_url), updated_at = NOW() WHERE id = $3 RETURNING *",
          [updates.name ?? null, updates.avatar_url ?? null, contact.id],
        );
        if (updated.length > 0) contact = updated[0];
      }
    }

    let conversation: Conversation;
    const existingConvs = await selectWhere<Conversation>("conversations", { contact_id: contact.id });

    if (existingConvs.length === 0) {
      conversation = await insert<Conversation>("conversations", {
        contact_id: contact.id,
        channel_id: channel.id,
        channel_type: channelType,
        status: "open",
        last_message_at: new Date(),
        unread_count: 1,
      });
    } else {
      conversation = existingConvs[0];
      await query(
        "UPDATE conversations SET status = 'open', last_message_at = NOW(), unread_count = $1, updated_at = NOW() WHERE id = $2",
        [(conversation.unreadCount ?? 0) + 1, conversation.id],
      );
    }

    if (attachments?.length) {
      for (const att of attachments) {
        const attType = att.type as string;
        const payload = att.payload as Record<string, unknown> | undefined;
        const attUrl = payload?.url as string | undefined;

        const attContentType = attType === "image" ? "image" : attType === "video" ? "video" : attType === "audio" ? "audio" : "document";

        let mediaUrl: string | null = null;
        let mediaType: string | null = null;

        if (attUrl) {
          const stored = await downloadAndStoreMetaMedia(attUrl, attType, channel.accessToken ?? undefined);
          if (stored) {
            mediaUrl = stored.url;
            mediaType = stored.mimeType;
          }
        }

        await insert("messages", {
          conversation_id: conversation.id,
          sender_type: "contact",
          direction: "inbound",
          content_type: attContentType,
          content: text ?? null,
          media_url: mediaUrl,
          media_type: mediaType,
          external_message_id: msgId,
          sender_name: contact.name,
        });
      }
    } else {
      await insert("messages", {
        conversation_id: conversation.id,
        sender_type: "contact",
        direction: "inbound",
        content_type: "text",
        content: text ?? null,
        external_message_id: msgId,
        sender_name: contact.name,
      });
    }

    logger.info({ contactId: contact.id, conversationId: conversation.id, channelType }, "Processed inbound message");
  }
}

export default router;
