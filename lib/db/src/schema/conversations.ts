import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull(),
  channelId: integer("channel_id").notNull(),
  channelType: text("channel_type", { enum: ["whatsapp", "instagram", "facebook"] }).notNull(),
  phoneNumberId: text("phone_number_id"),
  wabaId: text("waba_id"),
  departmentId: integer("department_id"),
  assignedAgentId: integer("assigned_agent_id"),
  status: text("status", { enum: ["open", "pending", "resolved", "snoozed"] }).notNull().default("open"),
  subject: text("subject"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  unreadCount: integer("unread_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversationsTable.$inferSelect;
