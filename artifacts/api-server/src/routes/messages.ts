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
import { requireAuth } from "../middlewares/auth";
import { canViewConversation, getAssignedAgentDepartment, loadConversationViewer } from "../lib/conversation-access";
import { isSuperadmin } from "../lib/auth";

const router: IRouter = Router();

async function sendWhatsAppMessage(channel: typeof channelsTable.$inferSelect, contact: typeof contactsTable.$inferSelect, content: string): Promise<{ messageId?: string; error?: { message: string } }> {
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

async function sendMessengerMessage(channel: typeof channelsTable.$inferSelect, contact: typeof contactsTable.$inferSelect, content: string): Promise<{ messageId?: string; error?: { message: string } }> {
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

async function sendInstagramMessage(channel: typeof channelsTable.$inferSelect, contact: typeof contactsTable.$inferSelect, content: string): Promise<{ messageId?: string; error?: { message: string } }> {
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

const toDto = (m: typeof messagesTable.$inferSelect) => ({
  ...m,
  createdAt: m.createdAt.toISOString(),
  deliveryStatus: m.deliveryStatus ?? "pending",
});

router.get("/conversations/:conversationId/messages", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;
  const params = ListMessagesParams.safeParse({ conversationId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const viewer = await loadConversationViewer(req.userId!);
  if (!viewer) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, params.data.conversationId));
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

router.post("/conversations/:conversationId/messages", requireAuth, async (req, res): Promise<void> => {
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

  const { contentType, content, mediaUrl, mediaType, senderName: bodySenderName } = parsed.data;
  const isNote = contentType === "note";
  const effectiveSenderId = req.userId!;
  const viewer = await loadConversationViewer(effectiveSenderId);
  if (!viewer) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, params.data.conversationId));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const assignedAgentDepartmentId = await getAssignedAgentDepartment(conv.assignedAgentId);
  if (viewer.role !== "admin" && !canViewConversation(conv, viewer, assignedAgentDepartmentId)) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  // Resolve sender name: prefer body value, then lookup from DB
  let senderName: string | null = bodySenderName ?? null;
  if (!senderName) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, effectiveSenderId));
    senderName = user?.name ?? null;
  }

  let [message] = await db.insert(messagesTable).values({
    conversationId: params.data.conversationId,
    senderType: "agent",
    senderId: effectiveSenderId,
    direction: "outbound",
    contentType,
    content: content ?? null,
    mediaUrl: mediaUrl ?? null,
    mediaType: mediaType ?? null,
    isRead: false,
    senderName,
  }).returning();

  if (conv) {
    const updateFields: Record<string, unknown> = { lastMessageAt: new Date(), updatedAt: new Date() };

    if (!isSuperadmin(effectiveSenderId)) {
      updateFields["assignedAgentId"] = effectiveSenderId;
    }

    if (!conv.departmentId && viewer.role !== "admin") {
      const [agentUser] = await db
        .select({ departmentId: usersTable.departmentId })
        .from(usersTable)
        .where(eq(usersTable.id, effectiveSenderId));
      if (agentUser?.departmentId) {
        updateFields["departmentId"] = agentUser.departmentId;
      }
    }

    await db
      .update(conversationsTable)
      .set(updateFields)
      .where(eq(conversationsTable.id, params.data.conversationId));
  }

  // Return response immediately — channel send is async
  res.status(201).json({ ...toDto(message), senderName });

  // Send to channel API (skip for notes and non-text for now)
  if (!isNote && contentType === "text" && content) {
    (async () => {
      try {
        const [channel] = await db
          .select()
          .from(channelsTable)
          .where(eq(channelsTable.id, conv.channelId));
        const [contact] = await db
          .select()
          .from(contactsTable)
          .where(eq(contactsTable.id, conv.contactId));

        if (!contact) {
          logger.warn({ messageId: message.id }, "Contact not found for send");
          await db.update(messagesTable).set({ deliveryStatus: "failed" }).where(eq(messagesTable.id, message.id));
          return;
        }

        // Collect candidate channels: primary (last inbound) first, then fallback to other channels of same type
        const candidates: Array<typeof channelsTable.$inferSelect> = [];
        if (channel && channel.accessToken) {
          candidates.push(channel);
        }
        const sameTypeChannels = await db
          .select()
          .from(channelsTable)
          .where(eq(channelsTable.channelType, conv.channelType));
        for (const c of sameTypeChannels) {
          if (c.id !== channel?.id && c.accessToken && c.externalId) {
            candidates.push(c);
          }
        }

        let usedChannel: typeof channelsTable.$inferSelect | null = null;
        let sendResult: { messageId?: string } = {};

        for (const candidate of candidates) {
          try {
            if (candidate.channelType === "whatsapp" && candidate.externalId && contact.phone) {
              sendResult = await sendWhatsAppMessage(candidate, contact, content);
              if (sendResult.messageId) {
                usedChannel = candidate;
                break;
              }
            } else if (candidate.channelType === "facebook") {
              sendResult = await sendMessengerMessage(candidate, contact, content);
              if (sendResult.messageId) {
                usedChannel = candidate;
                break;
              }
            } else if (candidate.channelType === "instagram") {
              sendResult = await sendInstagramMessage(candidate, contact, content);
              if (sendResult.messageId) {
                usedChannel = candidate;
                break;
              }
            }
          } catch (candidateErr) {
            logger.warn({ err: candidateErr, channelId: candidate.id, channelName: candidate.name }, "Candidate channel failed");
          }
        }

        if (sendResult.messageId && usedChannel) {
          await db
            .update(messagesTable)
            .set({ externalMessageId: sendResult.messageId, deliveryStatus: "sent" })
            .where(eq(messagesTable.id, message.id));
          logger.info({ messageId: message.id, channelId: usedChannel.id, channelName: usedChannel.name, waId: sendResult.messageId }, "Message sent via channel");

          // Update conversation channelId to the working channel for future replies
          if (usedChannel.id !== channel?.id) {
            await db
              .update(conversationsTable)
              .set({ channelId: usedChannel.id })
              .where(eq(conversationsTable.id, params.data.conversationId));
            logger.info({ conversationId: params.data.conversationId, fromChannelId: channel?.id, toChannelId: usedChannel.id }, "Conversation channel fallback updated");
          }
        } else {
          logger.warn({ messageId: message.id }, "All channel candidates failed to send");
          await db
            .update(messagesTable)
            .set({ deliveryStatus: "failed" })
            .where(eq(messagesTable.id, message.id));
        }
      } catch (err) {
        logger.error({ err, messageId: message.id, channelId: conv.channelId }, "Failed to send channel message");
        await db
          .update(messagesTable)
          .set({ deliveryStatus: "failed" })
          .where(eq(messagesTable.id, message.id));
      }
    })();
  }
});

export default router;
