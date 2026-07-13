import { Router } from "../lib/http-kit";
import { insert, update, selectById, selectWhere, selectRaw } from "@workspace/db";
import type { Channel, Contact, Conversation, Message, WaTemplate } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireApiKey } from "../middlewares/api-key";
import { findBestTemplateMatch } from "../lib/template-matcher";

const router = Router();

export async function sendWhatsAppTemplate(
  channel: Channel,
  to: string,
  templateName: string,
  templateLanguage: string,
  params: string[]
): Promise<string | undefined> {
  const url = `https://graph.facebook.com/v18.0/${channel.externalId}/messages`;

  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: templateLanguage },
    },
  };

  if (params.length > 0) {
    (body.template as Record<string, unknown>).components = [
      {
        type: "body",
        parameters: params.map((p) => ({ type: "text", text: p })),
      },
    ];
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${channel.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as {
    messages?: Array<{ id: string }>;
    error?: { message: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message || `WhatsApp API error: ${res.status}`);
  }

  return data.messages?.[0]?.id;
}

async function findOrCreateContact(phone: string): Promise<Contact> {
  let [contact] = await selectRaw<Contact>(
    `SELECT * FROM contacts WHERE phone = $1`,
    [phone],
  );

  if (!contact) {
    contact = await insert<Contact>("contacts", {
      name: phone,
      phone,
      channel_type: "whatsapp",
      external_id: phone,
    });
  }

  return contact;
}

async function findOrCreateConversation(
  contactId: number,
  channelId: number,
  channel: Channel
): Promise<Conversation> {
  let [conversation] = await selectRaw<Conversation>(
    `SELECT * FROM conversations WHERE contact_id = $1 AND channel_id = $2`,
    [contactId, channelId],
  );

  if (!conversation) {
    conversation = await insert<Conversation>("conversations", {
      contact_id: contactId,
      channel_id: channelId,
      channel_type: "whatsapp",
      phone_number_id: channel.externalId,
      waba_id: channel.wabaId ?? null,
      status: "open",
      last_message_at: new Date(),
      unread_count: 0,
    });
  }

  return conversation;
}

router.post("/external/whatsapp-send", requireApiKey, async (req, res): Promise<void> => {
  const body = (req.body as Record<string, unknown>) ?? {};

  const channelName = body.channelName as string | undefined;
  const channelIdRaw = body.channelId;
  const to = body.to as string | undefined;
  const content = body.content as string | undefined;
  const templateName = body.templateName as string | undefined;
  const templateLanguage = body.templateLanguage as string | undefined;
  const templateParamsRaw = body.templateParams;

  const errors: string[] = [];
  if (typeof to !== "string" || to.trim().length === 0) {
    errors.push("to is required");
  }
  if (typeof content !== "string" || content.trim().length === 0) {
    errors.push("content is required");
  }
  if (!channelName && channelIdRaw == null) {
    errors.push("Either channelName or channelId is required");
  }

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join("; ") });
    return;
  }

  let matchedTemplateName: string | null = null;

  try {
    let channel: Channel | undefined;
    if (channelName) {
      [channel] = await selectRaw<Channel>(
        `SELECT * FROM channels WHERE name = $1 AND channel_type = 'whatsapp'`,
        [channelName],
      );
    } else {
      const cid = typeof channelIdRaw === "number" ? channelIdRaw : parseInt(String(channelIdRaw), 10);
      if (!isNaN(cid)) {
        [channel] = await selectRaw<Channel>(
          `SELECT * FROM channels WHERE id = $1 AND channel_type = 'whatsapp'`,
          [cid],
        );
      }
    }

    if (!channel) {
      res.status(400).json({ error: "WhatsApp channel not found" });
      return;
    }

    if (!channel.accessToken || !channel.externalId) {
      res.status(400).json({ error: "Channel is missing access token or external ID" });
      return;
    }

    const resolvedTemplateName = templateName || null;
    const resolvedTemplateLanguage = templateLanguage || "en";
    const templateParams: string[] = Array.isArray(templateParamsRaw)
      ? (templateParamsRaw as string[])
      : [];
    let resolvedParams: string[] = [];

    if (resolvedTemplateName) {
      const [dbTemplate] = await selectRaw<WaTemplate>(
        `SELECT * FROM wa_templates WHERE name = $1 AND channel_id = $2 AND status = 'APPROVED'`,
        [resolvedTemplateName, channel.id],
      );

      if (!dbTemplate) {
        res.status(400).json({
          error: `Template "${resolvedTemplateName}" not found or not approved for this channel. Sync templates first via /api/whatsapp-templates/sync`,
        });
        return;
      }

      matchedTemplateName = resolvedTemplateName;

      if (templateParams.length > 0) {
        resolvedParams = templateParams;
      } else {
        const match = findBestTemplateMatch(content!, [dbTemplate]);
        if (match && match.params.length > 0) {
          resolvedParams = match.params;
        }
      }
    } else {
      const dbTemplates = await selectRaw<WaTemplate>(
        `SELECT * FROM wa_templates WHERE channel_id = $1 AND status = 'APPROVED'`,
        [channel.id],
      );

      const match = findBestTemplateMatch(content!, dbTemplates);
      if (!match) {
        res.status(400).json({
          error: "No matching template found for the provided content. Use templateName for explicit selection or sync templates first.",
        });
        return;
      }

      resolvedParams = match.params;
      matchedTemplateName = match.templateName;
    }

    let contact: Contact;
    try {
      contact = await findOrCreateContact(to!);
    } catch (err) {
      logger.error({ err, to }, "Failed to find or create contact");
      res.status(500).json({ error: "Failed to resolve contact" });
      return;
    }

    let conversation: Conversation;
    try {
      conversation = await findOrCreateConversation(contact.id, channel.id, channel);
    } catch (err) {
      logger.error({ err, contactId: contact.id, channelId: channel.id }, "Failed to find or create conversation");
      res.status(500).json({ error: "Failed to resolve conversation" });
      return;
    }

    let externalMessageId: string | undefined;
    try {
      externalMessageId = await sendWhatsAppTemplate(
        channel,
        to!,
        matchedTemplateName!,
        resolvedTemplateLanguage,
        resolvedParams
      );
    } catch (err) {
      logger.error({ err, to, templateName: matchedTemplateName }, "WhatsApp template send failed");
      res.status(502).json({ error: `WhatsApp API error: ${(err as Error).message}` });
      return;
    }

    const messageRecord = await insert<Message>("messages", {
      conversation_id: conversation.id,
      sender_type: "system",
      direction: "outbound",
      content_type: "template",
      content,
      external_message_id: externalMessageId ?? null,
      delivery_status: externalMessageId ? "sent" : "pending",
    });

    await update<Conversation>("conversations", conversation.id, {
      status: "resolved",
      last_message_at: new Date(),
    });

    res.json({
      success: true,
      messageId: externalMessageId,
      externalMessageId: externalMessageId ?? null,
      conversationId: conversation.id,
      messageRecordId: messageRecord.id,
      templateMatched: matchedTemplateName,
    });
  } catch (err) {
    logger.error({ err, to, templateName: matchedTemplateName || templateName, channelName, channelId: channelIdRaw }, "Unhandled error in external whatsapp send");
    res.status(500).json({ error: (err as Error).message || "Internal server error" });
  }
});

export default router;
