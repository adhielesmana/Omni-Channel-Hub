import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, messagesTable, conversationsTable, usersTable } from "@workspace/db";
import {
  ListMessagesResponse,
  ListMessagesParams,
  SendMessageParams,
  SendMessageBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const toDto = (m: typeof messagesTable.$inferSelect) => ({
  ...m,
  createdAt: m.createdAt.toISOString(),
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

  const { contentType, content, mediaUrl, mediaType, senderId } = parsed.data;
  const isNote = contentType === "note";

  // Resolve sender name
  let senderName: string | null = null;
  if (senderId) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, senderId));
    senderName = user?.name ?? null;
  }

  const [message] = await db.insert(messagesTable).values({
    conversationId: params.data.conversationId,
    senderType: "agent",
    senderId: senderId ?? null,
    direction: isNote ? "outbound" : "outbound",
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

  res.status(201).json({ ...toDto(message), senderName });
});

export default router;
