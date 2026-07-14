import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const autoReplySettingsTable = pgTable("auto_reply_settings", {
  id: serial("id").primaryKey(),
  isEnabled: boolean("is_enabled").notNull().default(false),
  cooldownMinutes: integer("cooldown_minutes").notNull().default(1440),
  greetingTemplate1: text("greeting_template_1").notNull().default("Selamat {time} Kak, Terima kasih telah menghubungi HelpDesk MaxnetPlus. Ada yang bisa saya bantu kak?"),
  greetingTemplate2: text("greeting_template_2").notNull().default("Halo Kak, selamat {time}. Terima kasih telah menghubungi HelpDesk MaxnetPlus. Ada kendala atau informasi yang bisa saya bantu kak?"),
  greetingTemplate3: text("greeting_template_3").notNull().default("{time} Kak {name}, terima kasih telah menghubungi HelpDesk MaxnetPlus. Ada yang bisa saya bantu kak?"),
  greetingTemplate4: text("greeting_template_4").notNull().default("Halo Kak {name}, selamat {time}. Terima kasih sudah menghubungi HelpDesk MaxnetPlus. Ada yang bisa kami bantu hari ini?"),
  greetingTemplate5: text("greeting_template_5").notNull().default("Selamat {time} Kak. Terima kasih sudah menghubungi HelpDesk MaxnetPlus. Silakan sampaikan kendala atau pertanyaan kakak, kami siap membantu!"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAutoReplySettingsSchema = createInsertSchema(autoReplySettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAutoReplySettings = z.infer<typeof insertAutoReplySettingsSchema>;
export type AutoReplySettings = typeof autoReplySettingsTable.$inferSelect;
