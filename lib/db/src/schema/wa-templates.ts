import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { channelsTable } from "./channels";

export const waTemplatesTable = pgTable("wa_templates", {
  id: serial("id").primaryKey(),
  metaTemplateId: text("meta_template_id"),
  name: text("name").notNull(),
  language: text("language").notNull(),
  category: text("category"),
  channelId: integer("channel_id").notNull().references(() => channelsTable.id),
  status: text("status", { enum: ["APPROVED", "PENDING", "REJECTED", "PAUSED", "DISABLED"] }).notNull().default("PENDING"),
  components: text("components"),
  rejectReason: text("reject_reason"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWaTemplateSchema = createInsertSchema(waTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWaTemplate = z.infer<typeof insertWaTemplateSchema>;
export type WaTemplate = typeof waTemplatesTable.$inferSelect;
