import { selectRaw, insert, update } from "@workspace/db";
import type { Channel, Contact, Conversation, AiAgentsSettings } from "@workspace/db";
import { logger } from "./logger";

export interface AiAgentDecision {
  analysis: string;
  sentiment: "positive" | "negative" | "neutral";
  action: "respond_empathy" | "respond_payment" | "note_only";
  team: "support" | "finance" | null;
  response: string;
}

export async function buildConversationContext(
  conversationId: number,
  contact: Contact,
  lookbackHours: number,
): Promise<string> {
  const messages = await selectRaw<{
    senderType: string;
    senderName: string | null;
    content: string | null;
    contentType: string;
    createdAt: string;
  }>(
    `SELECT sender_type, sender_name, content, content_type, created_at
     FROM messages
     WHERE conversation_id = $1
       AND created_at > NOW() - INTERVAL '1 hour' * $2
     ORDER BY created_at ASC`,
    [conversationId, lookbackHours],
  );

  const lines = messages.map((m) => {
    const sender = m.senderType === "contact" ? "Pelanggan" : (m.senderName || "Agent");
    const content = m.contentType === "text" ? m.content : `[${m.contentType}]`;
    const time = new Date(m.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    return `[${time}] ${sender}: ${content}`;
  });

  return [
    `Info Pelanggan: Nama=${contact.name || "Tidak diketahui"}, No=${contact.phone || "-"}, Channel=${contact.externalId?.split("@")[1] || "-"}`,
    "",
    ...lines,
  ].join("\n");
}

function extractJsonObject(content: string): string | null {
  const start = content.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < content.length; i++) {
    const char = content[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{") depth++;
      if (char === "}") {
        depth--;
        if (depth === 0) {
          return content.slice(start, i + 1);
        }
      }
    }
  }
  return null;
}

export async function callAiAgent(
  settings: AiAgentsSettings,
  conversationContext: string,
): Promise<AiAgentDecision | null> {
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
          { role: "system", content: settings.systemPrompt },
          { role: "user", content: conversationContext },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      logger.error({ status: res.status, statusText: res.statusText }, "AI agent API error");
      return null;
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      logger.warn("AI agent returned empty response");
      return null;
    }

    const jsonStr = extractJsonObject(content);
    if (!jsonStr) {
      logger.warn({ content }, "AI agent response is not valid JSON");
      return null;
    }

    const parsed = JSON.parse(jsonStr) as AiAgentDecision;

    if (!parsed.action || !parsed.analysis) {
      logger.warn({ parsed }, "AI agent response missing required fields");
      return null;
    }

    return parsed;
  } catch (err) {
    logger.error({ err }, "AI agent call failed");
    return null;
  }
}

async function sendAiReply(channel: Channel, contact: Contact, content: string): Promise<string | null> {
  try {
    let url: string;
    let body: Record<string, unknown>;

    if (channel.channelType === "whatsapp") {
      url = `https://graph.facebook.com/v18.0/${channel.externalId}/messages`;
      body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: contact.phone,
        type: "text",
        text: { body: content },
      };
    } else {
      const pageId = channel.pageId || channel.externalId;
      const recipientId = contact.externalId;
      if (!pageId || !recipientId) return null;
      url = `https://graph.facebook.com/v18.0/${pageId}/messages`;
      body = {
        recipient: { id: recipientId },
        message: { text: content },
        messaging_type: "RESPONSE",
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channel.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      logger.error({ status: res.status, data }, "AI agent send failed");
      return null;
    }

    const messageId =
      (data.messages as Array<{ id: string }> | undefined)?.[0]?.id ??
      (data.message_id as string | undefined) ??
      null;
    return messageId;
  } catch (err) {
    logger.error({ err }, "AI agent send error");
    return null;
  }
}

async function isWithinConversationWindow(conversation: Conversation): Promise<boolean> {
  if (!conversation.lastMessageAt) return false;
  const hoursSinceLastMessage = (Date.now() - conversation.lastMessageAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastMessage < 24;
}

export async function processAiAgentConversation(
  conversation: Conversation,
  contact: Contact,
  channel: Channel,
  settings: AiAgentsSettings,
): Promise<void> {
  const context = await buildConversationContext(
    conversation.id,
    contact,
    settings.lookbackHours ?? 24,
  );

  const decision = await callAiAgent(settings, context);
  if (!decision) {
    await insert("messages", {
      conversation_id: conversation.id,
      sender_type: "system",
      direction: "outbound",
      content_type: "note",
      content: `AI Agent: Gagal mendapatkan analisis dari AI untuk percakapan ini. Kemungkinan error koneksi atau response tidak valid.`,
      sender_name: "AI Agent",
    });
    return;
  }

  const noteHeader = `AI Agent Analysis (${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })})
━━━━━━━━━━━━━━━━━━━━
Sentimen: ${decision.sentiment}
Tim: ${decision.team || "N/A"}
Tindakan: ${decision.action}
━━━━━━━━━━━━━━━━━━━━
Analisis: ${decision.analysis}`;

  await insert("messages", {
    conversation_id: conversation.id,
    sender_type: "system",
    direction: "outbound",
    content_type: "note",
    content: noteHeader,
    sender_name: "AI Agent",
  });

  if (decision.action === "note_only") {
    logger.info({ conversationId: conversation.id }, "AI agent chose note_only — no reply sent");
    return;
  }

  if (!decision.response) {
    logger.warn({ conversationId: conversation.id }, "AI agent decided to respond but response is empty");
    return;
  }

  if (!(await isWithinConversationWindow(conversation))) {
    await insert("messages", {
      conversation_id: conversation.id,
      sender_type: "system",
      direction: "outbound",
      content_type: "note",
      content: `AI Agent: Tidak dapat merespon secara otomatis karena percakapan sudah melebihi 24 jam sejak pesan terakhir pelanggan (di luar jendela percakapan Meta).`,
      sender_name: "AI Agent",
    });
    logger.info({ conversationId: conversation.id }, "AI agent skipped reply — outside 24h Meta conversation window");
    return;
  }

  await update("conversations", conversation.id, {
    status: "open",
  });

  const externalMessageId = await sendAiReply(channel, contact, decision.response);

  await insert("messages", {
    conversation_id: conversation.id,
    sender_type: "system",
    direction: "outbound",
    content_type: "text",
    content: decision.response,
    external_message_id: externalMessageId,
    delivery_status: externalMessageId ? "sent" : "failed",
    sender_name: "AI Agent",
  });

  if (decision.team) {
    const teamNote = `AI Agent: Merespon sebagai tim ${decision.team.toUpperCase()}`;
    await insert("messages", {
      conversation_id: conversation.id,
      sender_type: "system",
      direction: "outbound",
      content_type: "note",
      content: teamNote,
      sender_name: "AI Agent",
    });
  }

  logger.info({
    conversationId: conversation.id,
    action: decision.action,
    team: decision.team,
    sentiment: decision.sentiment,
  }, "AI agent processed conversation");
}
