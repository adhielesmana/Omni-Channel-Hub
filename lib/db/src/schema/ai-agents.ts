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
    "Kembalikan JSON dengan format:\n" +
    "{\n" +
    '  "analysis": "string — penjelasan singkat tentang isi percakapan",\n' +
    '  "sentiment": "positive" | "negative" | "neutral",\n' +
    '  "action": "respond_empathy" | "respond_payment" | "note_only",\n' +
    '  "team": "support" | "finance" | null,\n' +
    '  "response": "string — balasan yang akan dikirim (kosong jika action=note_only)"\n' +
    "}\n\n" +
    "Aturan:\n" +
    "1. Jika pelanggan mengeluh, tidak puas, atau komplain tentang layanan/kualitas internet — action: respond_empathy, team: support. Balas dengan empati dalam Bahasa Indonesia, minta maaf atas ketidaknyamanan, dan informasikan sedang dikoordinasikan dengan tim terkait. Jangan terdengar seperti bot atau template.\n" +
    "2. Jika pelanggan mengirim bukti pembayaran (screenshot/invoice) — action: respond_payment, team: finance. Balas dengan ucapan terima kasih dan informasikan akan diteruskan ke tim finance.\n" +
    "3. Jika tidak yakin atau kondisi tidak jelas — action: note_only, response: kosong. Catat analisis dan alasan tidak merespon.\n" +
    "4. Sentiment negative jika pelanggan marah, kecewa, atau komplain. Positive jika berterima kasih atau konfirmasi pembayaran. Neutral untuk lainnya."
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAiAgentsSettingsSchema = createInsertSchema(aiAgentsSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiAgentsSettings = z.infer<typeof insertAiAgentsSettingsSchema>;
export type AiAgentsSettings = typeof aiAgentsSettingsTable.$inferSelect;
