import { selectRaw, insert, selectWhere } from "@workspace/db";
import type { Channel, Contact, AiAgentsSettings } from "@workspace/db";
import { createHash } from "crypto";
import { logger } from "./logger";

// ── Cache ─────────────────────────────────────────────────────────────────
const CACHE_MAX = 200;
const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { response: string; ts: number }>();

function cacheKey(prompt: string, context: string): string {
  const input = prompt.slice(0, 200) + "||" + context.slice(0, 200);
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function getCached(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.response;
}

function setCache(key: string, response: string): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { response, ts: Date.now() });
}

// ── Extract JSON ──────────────────────────────────────────────────────────
function extractJsonObject(content: string): string | null {
  const start = content.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < content.length; i++) {
    const char = content[i];
    if (escaped) { escaped = false; continue; }
    if (char === "\\" && inString) { escaped = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (!inString) {
      if (char === "{") depth++;
      if (char === "}") {
        depth--;
        if (depth === 0) return content.slice(start, i + 1);
      }
    }
  }
  return null;
}

// ── Should auto-reply ──────────────────────────────────────────────────────
export async function shouldAutoReply(conversationId: number): Promise<boolean> {
  const settings = await selectWhere<AiAgentsSettings>("ai_agents_settings", {});
  if (!settings.length || !settings[0].autoReplyEnabled) return false;

  const outboundMessages = await selectRaw<{ id: number }>(
    `SELECT id FROM messages WHERE conversation_id = $1 AND direction = 'outbound' AND sender_type = 'agent' ORDER BY created_at DESC LIMIT 1`,
    [conversationId],
  );

  if (outboundMessages.length === 0) return true;

  const lastOutbound = await selectRaw<{ created_at: string }>(
    `SELECT created_at FROM messages WHERE conversation_id = $1 AND direction = 'outbound' AND sender_type = 'agent' ORDER BY created_at DESC LIMIT 1`,
    [conversationId],
  );

  if (!lastOutbound.length) return true;

  const lastAgentTime = new Date(lastOutbound[0].created_at).getTime();
  const now = Date.now();
  const cooldownMs = (settings[0].autoReplyCooldownMinutes ?? 1440) * 60 * 1000;

  return now - lastAgentTime > cooldownMs;
}

// ── AI-powered greeting generation ─────────────────────────────────────────
export async function buildAiAutoReply(
  settings: AiAgentsSettings,
  customerMessage: string | null,
  contactName?: string | null,
): Promise<string | null> {
  const prompt = settings.autoReplyPrompt;
  if (!prompt) return null;

  const context = `Nama: ${contactName?.trim() || "-"}\nPesan: ${customerMessage?.trim() || "-"}`;

  // Check cache
  const key = cacheKey(prompt, context);
  const cached = getCached(key);
  if (cached) {
    logger.info("AI auto-reply cache hit");
    return cached;
  }

  const endpoint = settings.apiEndpoint || "https://opencode.ai/zen/go/v1/chat/completions";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (settings.apiKey) {
    headers["Authorization"] = `Bearer ${settings.apiKey}`;
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: settings.model || "deepseek-v4-flash",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: context },
        ],
        temperature: 0.7,
        max_tokens: 256,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error({ status: res.status, body: text.slice(0, 300) }, "AI auto-reply API error");
      return null;
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      logger.warn("AI auto-reply returned empty response");
      return null;
    }

    const jsonStr = extractJsonObject(content);
    if (!jsonStr) {
      logger.warn({ content }, "AI auto-reply response is not valid JSON");
      return null;
    }

    const parsed = JSON.parse(jsonStr) as { response?: string; sentiment?: string };
    if (!parsed.response) {
      logger.warn({ parsed }, "AI auto-reply missing response field");
      return null;
    }

    setCache(key, parsed.response);
    return parsed.response;
  } catch (err) {
    logger.error({ err }, "AI auto-reply call failed");
    return null;
  }
}

// ── Platform senders ───────────────────────────────────────────────────────
async function sendWhatsAppAutoReply(channel: Channel, contact: Contact, content: string): Promise<string | null> {
  const url = `https://graph.facebook.com/v18.0/${channel.externalId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${channel.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: contact.phone,
      type: "text",
      text: { body: content },
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { messages?: Array<{ id: string }>; error?: { message: string } };
  if (!res.ok) {
    logger.error({ status: res.status, data }, "WhatsApp auto-reply send failed");
    return null;
  }
  return data.messages?.[0]?.id ?? null;
}

async function sendMessengerAutoReply(channel: Channel, contact: Contact, content: string): Promise<string | null> {
  const pageId = channel.pageId || channel.externalId;
  const psid = contact.externalId;
  if (!pageId || !psid) return null;

  const url = `https://graph.facebook.com/v18.0/${pageId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${channel.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: psid },
      message: { text: content },
      messaging_type: "RESPONSE",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { message_id?: string; error?: { message: string } };
  if (!res.ok) {
    logger.error({ status: res.status, data }, "Messenger auto-reply send failed");
    return null;
  }
  return data.message_id ?? null;
}

async function sendInstagramAutoReply(channel: Channel, contact: Contact, content: string): Promise<string | null> {
  const pageId = channel.pageId || channel.externalId;
  const igSid = contact.externalId;
  if (!pageId || !igSid) return null;

  const url = `https://graph.facebook.com/v18.0/${pageId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${channel.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: igSid },
      message: { text: content },
      messaging_type: "RESPONSE",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { message_id?: string; error?: { message: string } };
  if (!res.ok) {
    logger.error({ status: res.status, data }, "Instagram auto-reply send failed");
    return null;
  }
  return data.message_id ?? null;
}

export async function sendAutoReply(
  channel: Channel,
  contact: Contact,
  conversationId: number,
  message: string,
): Promise<void> {
  let externalMessageId: string | null = null;

  try {
    if (channel.channelType === "whatsapp") {
      externalMessageId = await sendWhatsAppAutoReply(channel, contact, message);
    } else if (channel.channelType === "facebook") {
      externalMessageId = await sendMessengerAutoReply(channel, contact, message);
    } else if (channel.channelType === "instagram") {
      externalMessageId = await sendInstagramAutoReply(channel, contact, message);
    }
  } catch (err) {
    logger.error({ err, conversationId, channelType: channel.channelType }, "Auto-reply send error");
  }

  await insert("messages", {
    conversation_id: conversationId,
    sender_type: "system",
    direction: "outbound",
    content_type: "text",
    content: message,
    external_message_id: externalMessageId,
    delivery_status: externalMessageId ? "sent" : "failed",
    sender_name: "Auto Reply",
  });

  logger.info({ conversationId, channelType: channel.channelType, sent: !!externalMessageId }, "Auto-reply sent");
}
