import { Router } from "../lib/http-kit";
import { insert, update, selectById, selectRaw } from "@workspace/db";
import type { Contact, Channel, Conversation, Message, WaTemplate } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { sendWhatsAppTemplate } from "./external-send";
import { logger } from "../lib/logger";

function getTimeGreeting(): string {
  const now = new Date();
  const jakartaOffset = 7 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const jakartaMinutes = (utcMinutes + jakartaOffset) % (24 * 60);
  const hours = Math.floor(jakartaMinutes / 60);

  if (hours >= 5 && hours < 12) return "Pagi";
  if (hours >= 12 && hours < 15) return "Siang";
  if (hours >= 15 && hours < 18) return "Sore";
  return "Malam";
}

const router = Router();

async function findOrCreateConversation(
  contactId: number,
  channelId: number,
  channel: Channel
): Promise<Conversation> {
  const [existing] = await selectRaw<Conversation>(
    `SELECT * FROM conversations WHERE contact_id = $1 AND channel_id = $2`,
    [contactId, channelId],
  );

  if (existing) return existing;

  const created = await insert<Conversation>("conversations", {
    contact_id: contactId,
    channel_id: channelId,
    channel_type: "whatsapp",
    phone_number_id: channel.externalId,
    waba_id: channel.wabaId ?? null,
    status: "open",
    last_message_at: new Date(),
    unread_count: 0,
  });

  return created;
}

router.post("/send-hello", requireAuth, async (req, res): Promise<void> => {
  const body = (req.body as Record<string, unknown>) ?? {};
  const contactId = typeof body?.contactId === "number" ? body.contactId : Number(body?.contactId);
  if (!Number.isFinite(contactId) || contactId <= 0) {
    res.status(400).json({ error: "contactId must be a positive number" });
    return;
  }

  const contact = await selectById<Contact>("contacts", contactId);
  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  if (!contact.phone) {
    res.status(400).json({ error: "Contact has no phone number" });
    return;
  }

  const [channel] = await selectRaw<Channel>(
    `SELECT * FROM channels WHERE name = $1 AND channel_type = 'whatsapp'`,
    ["MaxnetPlus"],
  );

  if (!channel) {
    res.status(400).json({ error: "Default WhatsApp channel MaxnetPlus not found" });
    return;
  }

  if (!channel.accessToken || !channel.externalId) {
    res.status(400).json({ error: "Channel is missing access token or external ID" });
    return;
  }

  const [template] = await selectRaw<WaTemplate>(
    `SELECT * FROM wa_templates WHERE name = $1 AND channel_id = $2 AND status = 'APPROVED'`,
    ["sapa_customer", channel.id],
  );

  if (!template) {
    res.status(400).json({ error: "Template sapa_customer not found or not approved for MaxnetPlus" });
    return;
  }

  try {
    const conversation = await findOrCreateConversation(contact.id, channel.id, channel);
    const timeGreeting = getTimeGreeting();
    const params = [contact.name || contact.phone, timeGreeting];
    const messageId = await sendWhatsAppTemplate(channel, contact.phone, "sapa_customer", template.language, params);

    let content = "";
    if (template.components) {
      try {
        const comps = JSON.parse(template.components) as Array<{ type: string; text?: string }>;
        const bodyComp = comps.find((c) => c.type === "BODY");
        if (bodyComp?.text) {
          content = bodyComp.text.replace(/\{\{\d+\}\}/g, () => params.shift() || "");
        }
      } catch { /* fall through */ }
    }
    if (!content) {
      content = `Halo Kak ${contact.name || contact.phone}, Kami dari MaxnetPlus, adakah yang bisa kami bantu ?`;
    }

    const isSuperadminUser = req.userId === -1;
    const messageRecord = await insert<Message>("messages", {
      conversation_id: conversation.id,
      sender_type: isSuperadminUser ? "system" : "agent",
      sender_id: isSuperadminUser ? null : req.userId ?? null,
      direction: "outbound",
      content_type: "template",
      content,
      external_message_id: messageId,
      delivery_status: "sent",
    });

    await update<Conversation>("conversations", conversation.id, {
      status: "open",
      last_message_at: new Date(),
    });

    res.json({
      success: true,
      messageId,
      conversationId: conversation.id,
      messageRecordId: messageRecord.id,
    });
  } catch (err) {
    logger.error({ err, contactId }, "Failed to send hello message");
    res.status(502).json({ error: err instanceof Error ? err.message : "Failed to send hello message" });
  }
});

export default router;
