import { Router } from "../lib/http-kit";
import { insert, update, selectById, selectRaw } from "@workspace/db";
import type { User, Contact, Message, Conversation, Channel } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/auth";
import { canViewConversation, getAssignedAgentDepartment, loadConversationViewer } from "../lib/conversation-access";
import { isSuperadmin } from "../lib/auth";

const router = Router();

async function sendWhatsAppMessage(channel: Channel, contact: Contact, content: string): Promise<{ messageId?: string; error?: { message: string } }> {
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
  return { messageId: data.messages?.[0]?.id };
}

async function sendMessengerMessage(channel: Channel, contact: Contact, content: string): Promise<{ messageId?: string; error?: { message: string } }> {
  const pageId = channel.pageId || channel.externalId;
  const psid = contact.externalId;
  if (!pageId || !psid) {
    throw new Error("Missing pageId or recipient PSID for Messenger send");
  }
  const url = `https://graph.facebook.com/v18.0/${pageId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${channel.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: psid },
      message: { text: content },
      messaging_type: "RESPONSE",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { message_id?: string; error?: { message: string } };
  if (!res.ok) {
    logger.error({ status: res.status, data, pageId, psid }, "Messenger send failed");
    throw new Error(data.error?.message || `Messenger send failed: ${res.status}`);
  }
  return { messageId: data.message_id };
}

async function sendInstagramMessage(channel: Channel, contact: Contact, content: string): Promise<{ messageId?: string; error?: { message: string } }> {
  const pageId = channel.pageId || channel.externalId;
  const igSid = contact.externalId;
  if (!pageId || !igSid) {
    throw new Error("Missing pageId or recipient IG ID for Instagram send");
  }
  const url = `https://graph.facebook.com/v18.0/${pageId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${channel.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: igSid },
      message: { text: content },
      messaging_type: "RESPONSE",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { message_id?: string; error?: { message: string } };
  if (!res.ok) {
    logger.error({ status: res.status, data, pageId, igSid }, "Instagram send failed");
    throw new Error(data.error?.message || `Instagram send failed: ${res.status}`);
  }
  return { messageId: data.message_id };
}

const toDto = (m: Message) => ({
  ...m,
  createdAt: m.createdAt.toISOString(),
  deliveryStatus: m.deliveryStatus ?? "pending",
});

router.get("/conversations/:conversationId/messages", requireAuth, async (req, res): Promise<void> => {
  const conversationId = parseInt(req.params.conversationId, 10);
  if (isNaN(conversationId)) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  const viewer = await loadConversationViewer(req.userId!);
  if (!viewer) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const conversation = await selectById<Conversation>("conversations", conversationId);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  if (viewer.role !== "admin") {
    const assignedAgentDepartmentId = await getAssignedAgentDepartment(conversation.assignedAgentId);
    if (!canViewConversation(conversation, viewer, assignedAgentDepartmentId)) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
  }

  const messages = await selectRaw<Message>(
    `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversationId],
  );

  const enriched = await Promise.all(messages.map(async (m) => {
    let senderName = m.senderName;
    if (!senderName && m.senderId && m.senderType === "agent") {
      const user = await selectById<User>("users", m.senderId);
      senderName = user?.name ?? null;
    }
    return { ...toDto(m), senderName };
  }));

  await selectRaw(
    `UPDATE messages SET is_read = true WHERE conversation_id = $1`,
    [conversationId],
  );

  await selectRaw(
    `UPDATE conversations SET unread_count = 0 WHERE id = $1`,
    [conversationId],
  );

  res.json(enriched);
});

router.post("/conversations/:conversationId/messages", requireAuth, async (req, res): Promise<void> => {
  const conversationId = parseInt(req.params.conversationId, 10);
  if (isNaN(conversationId)) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  const body = (req.body as Record<string, unknown>) ?? {};
  const errors: string[] = [];

  const contentType = body.contentType as string;
  const validContentTypes = ["text", "image", "video", "audio", "document", "location", "sticker", "template", "note"];
  if (typeof contentType !== "string" || !validContentTypes.includes(contentType)) {
    errors.push("contentType must be one of: text, image, video, audio, document, location, sticker, template, note");
  }

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join("; ") });
    return;
  }

  const content = body.content as string | undefined;
  const mediaUrl = body.mediaUrl as string | undefined;
  const mediaType = body.mediaType as string | undefined;
  const bodySenderName = body.senderName as string | undefined;

  const isNote = contentType === "note";
  const effectiveSenderId = req.userId!;
  const viewer = await loadConversationViewer(effectiveSenderId);
  if (!viewer) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const conv = await selectById<Conversation>("conversations", conversationId);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const assignedAgentDepartmentId = await getAssignedAgentDepartment(conv.assignedAgentId);
  if (viewer.role !== "admin" && !canViewConversation(conv, viewer, assignedAgentDepartmentId)) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  let senderName: string | null = bodySenderName ?? null;
  if (!senderName) {
    const user = await selectById<User>("users", effectiveSenderId);
    senderName = user?.name ?? null;
  }

  let message = await insert<Message>("messages", {
    conversation_id: conversationId,
    sender_type: "agent",
    sender_id: effectiveSenderId,
    direction: "outbound",
    content_type: contentType,
    content: content ?? null,
    media_url: mediaUrl ?? null,
    media_type: mediaType ?? null,
    is_read: false,
    sender_name: senderName,
  });

  if (conv) {
    const updateFields: Record<string, unknown> = { last_message_at: new Date() };

    if (!isSuperadmin(effectiveSenderId)) {
      updateFields["assigned_agent_id"] = effectiveSenderId;
    }

    if (!conv.departmentId && viewer.role !== "admin") {
      const [agentUser] = await selectRaw<{ departmentId: number | null }>(
        `SELECT department_id AS "departmentId" FROM users WHERE id = $1`,
        [effectiveSenderId],
      );
      if (agentUser?.departmentId) {
        updateFields["department_id"] = agentUser.departmentId;
      }
    }

    await update<Conversation>("conversations", conversationId, updateFields);
  }

  res.status(201).json({ ...toDto(message), senderName });

  if (!isNote && contentType === "text" && content) {
    (async () => {
      try {
        const [channel] = await selectRaw<Channel>(
          `SELECT * FROM channels WHERE id = $1`,
          [conv.channelId],
        );
        const [contact] = await selectRaw<Contact>(
          `SELECT * FROM contacts WHERE id = $1`,
          [conv.contactId],
        );

        if (!contact) {
          logger.warn({ messageId: message.id }, "Contact not found for send");
          await update<Message>("messages", message.id, { delivery_status: "failed" });
          return;
        }

        if (!channel || !channel.accessToken || !channel.externalId) {
          logger.warn({ messageId: message.id, channelId: conv.channelId }, "Conversation channel is missing send configuration");
          await update<Message>("messages", message.id, { delivery_status: "failed" });
          return;
        }

        let sendResult: { messageId?: string } = {};

        if (channel.channelType === "whatsapp") {
          if (!contact.phone) {
            throw new Error("Missing contact phone number for WhatsApp reply");
          }
          sendResult = await sendWhatsAppMessage(channel, contact, content);
        } else if (channel.channelType === "facebook") {
          sendResult = await sendMessengerMessage(channel, contact, content);
        } else if (channel.channelType === "instagram") {
          sendResult = await sendInstagramMessage(channel, contact, content);
        } else {
          throw new Error(`Unsupported channel type: ${channel.channelType}`);
        }

        if (sendResult.messageId) {
          await update<Message>("messages", message.id, {
            external_message_id: sendResult.messageId,
            delivery_status: "sent",
          });
          logger.info({ messageId: message.id, channelId: channel.id, channelName: channel.name, waId: sendResult.messageId }, "Message sent via channel");
        } else {
          logger.warn({ messageId: message.id, channelId: channel.id, channelName: channel.name }, "Channel failed to send");
          await update<Message>("messages", message.id, { delivery_status: "failed" });
        }
      } catch (err) {
        logger.error({ err, messageId: message.id, channelId: conv.channelId }, "Failed to send channel message");
        await update<Message>("messages", message.id, { delivery_status: "failed" });
      }
    })();
  }
});

export default router;
