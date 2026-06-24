import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderType: text("sender_type", { enum: ["contact", "agent", "system"] }).notNull(),
  senderId: integer("sender_id"),
  direction: text("direction", { enum: ["inbound", "outbound"] }).notNull(),
  contentType: text("content_type", { enum: ["text", "image", "video", "audio", "document", "location", "sticker", "template", "note"] }).notNull().default("text"),
  content: text("content"),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  isRead: boolean("is_read").notNull().default(false),
  externalMessageId: text("external_message_id"),
  metadata: text("metadata"),
  senderName: text("sender_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
