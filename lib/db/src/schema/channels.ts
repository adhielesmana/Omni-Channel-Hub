import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const channelsTable = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  channelType: text("channel_type", { enum: ["whatsapp", "instagram", "facebook"] }).notNull(),
  externalId: text("external_id"),
  wabaId: text("waba_id"),
  phoneNumber: text("phone_number"),
  pageId: text("page_id"),
  accessToken: text("access_token"),
  webhookVerifyToken: text("webhook_verify_token"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertChannelSchema = createInsertSchema(channelsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Channel = typeof channelsTable.$inferSelect;
