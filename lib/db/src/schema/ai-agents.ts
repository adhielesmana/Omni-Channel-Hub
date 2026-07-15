import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiAgentsSettingsTable = pgTable("ai_agents_settings", {
  id: serial("id").primaryKey(),
  isEnabled: boolean("is_enabled").notNull().default(false),
  idleMinutes: integer("idle_minutes").notNull().default(60),
  lookbackHours: integer("lookback_hours").notNull().default(24),
  apiEndpoint: text("api_endpoint").notNull().default("https://opencode.ai/zen/go/v1/chat/completions"),
  apiKey: text("api_key"),
  model: text("model").notNull().default("deepseek-v4-flash"),
  systemPrompt: text("system_prompt").notNull().default(
    "Anda adalah asisten customer service untuk penyedia layanan internet MaxnetPlus. " +
    "Analisis percakapan berikut dan tentukan tindakan yang tepat.\n\n" +
    "PENTING: Hanya output JSON tanpa teks lain, tanpa markdown, tanpa backticks.\n\n" +
    "Kembalikan JSON:\n" +
    '{"analysis": "string", "sentiment": "positive"|"negative"|"neutral", "action": "respond_empathy"|"respond_payment"|"note_only", "team": "support"|"finance"|null, "response": "string"}\n\n' +
    "Aturan:\n" +
    "1. Jika pelanggan komplain tentang internet/kualitas — action: respond_empathy, team: support. Balas empati dalam Bahasa Indonesia, minta maaf, koordinasikan dengan tim support. Jangan seperti bot.\n" +
    "2. Jika pelanggan kirim bukti bayar/invoice/transfer — action: respond_payment, team: finance. Balas terima kasih, akan diteruskan ke tim finance.\n" +
    "3. Jika hanya salam/sapaan tanpa masalah jelas — action: note_only, response: kosong. Catat analisis.\n" +
    "4. Jika tidak yakin — action: note_only, response: kosong.\n" +
    "5. Sentiment: negative jika komplain/marah, positive jika terima kasih/konfirmasi bayar, neutral untuk lainnya."
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAiAgentsSettingsSchema = createInsertSchema(aiAgentsSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiAgentsSettings = z.infer<typeof insertAiAgentsSettingsSchema>;
export type AiAgentsSettings = typeof aiAgentsSettingsTable.$inferSelect;
