import { Router, type IRouter } from "express";
import { eq, asc, sql, and } from "drizzle-orm";
import { db, messagesTable, conversationsTable, contactsTable, channelsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/outbox", requireAuth, async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  const conditions = [
    eq(messagesTable.senderType, "system"),
    eq(messagesTable.direction, "outbound"),
  ];

  if (status) {
    conditions.push(eq(messagesTable.deliveryStatus, status as "pending" | "sent" | "delivered" | "read" | "failed"));
  }

  const where = and(...conditions);

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .where(where);

  const rows = await db
    .select({
      id: messagesTable.id,
      conversationId: messagesTable.conversationId,
      direction: messagesTable.direction,
      contentType: messagesTable.contentType,
      content: messagesTable.content,
      mediaUrl: messagesTable.mediaUrl,
      externalMessageId: messagesTable.externalMessageId,
      deliveryStatus: messagesTable.deliveryStatus,
      createdAt: messagesTable.createdAt,
      recipientPhone: contactsTable.phone,
      recipientName: contactsTable.name,
      channelName: channelsTable.name,
    })
    .from(messagesTable)
    .leftJoin(conversationsTable, eq(messagesTable.conversationId, conversationsTable.id))
    .leftJoin(contactsTable, eq(conversationsTable.contactId, contactsTable.id))
    .leftJoin(channelsTable, eq(conversationsTable.channelId, channelsTable.id))
    .where(where)
    .orderBy(asc(messagesTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    messages: rows,
    total,
    page,
    limit,
  });
});

export default router;
