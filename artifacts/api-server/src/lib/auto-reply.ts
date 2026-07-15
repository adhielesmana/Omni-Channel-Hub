import { selectRaw, insert, selectWhere } from "@workspace/db";
import type { Channel, Contact, Conversation, AutoReplySettings } from "@workspace/db";
import { logger } from "./logger";

function getTimeGreeting(): string {
  const now = new Date();
  const hours = parseInt(
    now.toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour: "numeric", hour12: false }),
    10,
  );

  if (hours >= 5 && hours < 12) return "Pagi";
  if (hours >= 12 && hours < 15) return "Siang";
  if (hours >= 15 && hours < 18) return "Sore";
  return "Malam";
}

function pickRandomTemplate(settings: AutoReplySettings): string {
  const templates = [
    settings.greetingTemplate1,
    settings.greetingTemplate2,
    settings.greetingTemplate3,
    settings.greetingTemplate4,
    settings.greetingTemplate5,
  ].filter(Boolean);

  if (templates.length === 0) {
    return "Selamat {time} Kak, Terima kasih telah menghubungi HelpDesk MaxnetPlus. Ada yang bisa saya bantu kak?";
  }

  return templates[Math.floor(Math.random() * templates.length)]!;
}

export function buildGreetingMessage(settings: AutoReplySettings, contactName?: string | null): string {
  const template = pickRandomTemplate(settings);
  const time = getTimeGreeting();
  const name = contactName?.trim() || "Kak";

  return template
    .replace(/{time}/g, time)
    .replace(/{name}/g, name);
}

export async function shouldAutoReply(conversationId: number): Promise<boolean> {
  const settings = await selectWhere<AutoReplySettings>("auto_reply_settings", {});
  if (!settings.length || !settings[0].isEnabled) return false;

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
  const cooldownMs = (settings[0].cooldownMinutes ?? 1440) * 60 * 1000;

  return now - lastAgentTime > cooldownMs;
}

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
