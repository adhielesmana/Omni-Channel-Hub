import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const whatsappBlastsTable = pgTable("whatsapp_blasts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  channelId: integer("channel_id").notNull(),
  templateName: text("template_name").notNull(),
  templateLanguage: text("template_language").notNull(),
  templateParams: text("template_params"),
  source: text("source", { enum: ["manual", "external"] }).notNull(),
  createdByUserId: integer("created_by_user_id"),
  externalApiKey: text("external_api_key"),
  externalSourceIp: text("external_source_ip"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  totalRecipients: integer("total_recipients").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  deliveredCount: integer("delivered_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  status: text("status", { enum: ["pending", "processing", "completed", "failed", "cancelled"] }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const whatsappBlastRecipientsTable = pgTable("whatsapp_blast_recipients", {
  id: serial("id").primaryKey(),
  blastId: integer("blast_id").notNull(),
  contactId: integer("contact_id"),
  phone: text("phone").notNull(),
  templateParams: text("template_params"),
  content: text("content"),
  status: text("status", { enum: ["pending", "sent", "delivered", "failed"] }).notNull().default("pending"),
  externalMessageId: text("external_message_id"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWhatsappBlastSchema = createInsertSchema(whatsappBlastsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWhatsappBlast = z.infer<typeof insertWhatsappBlastSchema>;
export type WhatsappBlast = typeof whatsappBlastsTable.$inferSelect;

export const insertWhatsappBlastRecipientSchema = createInsertSchema(whatsappBlastRecipientsTable).omit({ id: true, createdAt: true });
export type InsertWhatsappBlastRecipient = z.infer<typeof insertWhatsappBlastRecipientSchema>;
export type WhatsappBlastRecipient = typeof whatsappBlastRecipientsTable.$inferSelect;
