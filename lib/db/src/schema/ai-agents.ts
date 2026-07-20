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
    "Kamu CS MaxnetPlus. Analisis percakapan, output JSON SAJA.\n" +
    '{"analysis":"str","sentiment":"pos|neg|neutral","action":"empathy|payment|note","team":"support|finance|null","response":"str"}\n' +
    "Aturan:\n" +
    "1. Komplain internet → action:empathy team:support. Balas empati, minta maaf, koordinasi dgn support. Jangan kaku.\n" +
    "2. Bukti bayar/invoice → action:payment team:finance. Ucapkan terima kasih.\n" +
    "3. Hanya salam → action:note response kosong.\n" +
    "4. Tidak yakin → action:note response kosong.\n" +
    "5. Sentiment: neg=komplain/marah, pos=terima kasih/bayar, neutral=lainnya."
  ),
  autoReplyEnabled: boolean("auto_reply_enabled").notNull().default(false),
  autoReplyCooldownMinutes: integer("auto_reply_cooldown_minutes").notNull().default(1440),
  autoReplyPrompt: text("auto_reply_prompt").notNull().default(
    "Kamu adalah CS MaxnetPlus. Pelanggan baru saja mengirim pesan. Balas dengan ramah dan natural dalam Bahasa Indonesia, perkenalkan diri sebagai CS MaxnetPlus, dan tanyakan ada yang bisa dibantu.\n\n" +
    "PENTING: Output JSON SAJA tanpa teks lain.\n" +
    '{"response":"string","sentiment":"positive|negative|neutral"}\n\n' +
    "response: balasan greeting yang ramah dan natural. Jangan seperti bot.\n" +
    "sentiment: analisis sentimen pesan pelanggan.\n\n" +
    "Contoh:\n" +
    'Pesan: "Halo"\n"response": "Halo Kak, selamat siang. Terima kasih sudah menghubungi MaxnetPlus Helpdesk. Ada yang bisa kami bantu?", "sentiment": "positive"\n\n' +
    'Pesan: "Internet saya lemot"\n"response": "Maaf Kak atas ketidaknyamanannya. Bisa tolong jelaskan lebih detail kendala yang dialami? Kami akan bantu cek dan selesaikan masalahnya.", "sentiment": "negative"'
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAiAgentsSettingsSchema = createInsertSchema(aiAgentsSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiAgentsSettings = z.infer<typeof insertAiAgentsSettingsSchema>;
export type AiAgentsSettings = typeof aiAgentsSettingsTable.$inferSelect;
