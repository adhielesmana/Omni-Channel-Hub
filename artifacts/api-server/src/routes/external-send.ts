import { Router, type IRouter } from "express";
import { eq, and, or } from "drizzle-orm";
import { db, channelsTable, contactsTable, conversationsTable, messagesTable, waTemplatesTable } from "@workspace/db";
import { ExternalWhatsappSendBody, ExternalWhatsappSendResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { requireApiKey } from "../middlewares/api-key";
import { findBestTemplateMatch } from "../lib/template-matcher";

const router: IRouter = Router();

export async function sendWhatsAppTemplate(
  channel: typeof channelsTable.$inferSelect,
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

function findOrCreateContact(phone: string): Promise<typeof contactsTable.$inferSelect> {
  return db.transaction(async (tx) => {
    let [contact] = await tx
      .select()
      .from(contactsTable)
      .where(eq(contactsTable.phone, phone));

    if (!contact) {
      [contact] = await tx
        .insert(contactsTable)
        .values({
          name: phone,
          phone,
          channelType: "whatsapp",
          externalId: phone,
        })
        .returning();
    }

    return contact;
  });
}

function findOrCreateConversation(
  contactId: number,
  channelId: number,
  channel: typeof channelsTable.$inferSelect
): Promise<typeof conversationsTable.$inferSelect> {
  return db.transaction(async (tx) => {
    let [conversation] = await tx
      .select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.contactId, contactId),
          eq(conversationsTable.channelId, channelId)
        )
      );

    if (!conversation) {
      [conversation] = await tx
        .insert(conversationsTable)
        .values({
          contactId,
          channelId,
          channelType: "whatsapp",
          phoneNumberId: channel.externalId,
          wabaId: channel.wabaId ?? null,
          status: "open",
          lastMessageAt: new Date(),
          unreadCount: 0,
        })
        .returning();
    }

    return conversation;
  });
}

router.post("/external/whatsapp-send", requireApiKey, async (req, res): Promise<void> => {
  const parsed = ExternalWhatsappSendBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { channelName, channelId, to, content, templateName, templateLanguage, templateParams } = parsed.data;

  let matchedTemplateName: string | null = null;

  try {
    // Find channel by name or ID
    const channelConditions = [];
    if (channelName) {
      channelConditions.push(eq(channelsTable.name, channelName));
    }
    if (channelId) {
      channelConditions.push(eq(channelsTable.id, channelId));
    }

    if (channelConditions.length === 0) {
      res.status(400).json({ error: "Either channelName or channelId is required" });
      return;
    }

    const [channel] = await db
      .select()
      .from(channelsTable)
      .where(and(or(...channelConditions), eq(channelsTable.channelType, "whatsapp")));

    if (!channel) {
      res.status(400).json({ error: "WhatsApp channel not found" });
      return;
    }

    if (!channel.accessToken || !channel.externalId) {
      res.status(400).json({ error: "Channel is missing access token or external ID" });
      return;
    }

    // Resolve template
    const resolvedTemplateName = templateName || null;
    const resolvedTemplateLanguage = templateLanguage || "en";
    let resolvedParams: string[] = [];

    if (resolvedTemplateName) {
      // Explicit template mode
      const [dbTemplate] = await db
        .select()
        .from(waTemplatesTable)
        .where(
          and(
            eq(waTemplatesTable.name, resolvedTemplateName),
            eq(waTemplatesTable.channelId, channel.id),
            eq(waTemplatesTable.status, "APPROVED")
          )
        );

      if (!dbTemplate) {
        res.status(400).json({
          error: `Template "${resolvedTemplateName}" not found or not approved for this channel. Sync templates first via /api/whatsapp-templates/sync`,
        });
        return;
      }

      matchedTemplateName = resolvedTemplateName;

      // Use explicitly provided templateParams, or auto-extract from content
      if (templateParams && templateParams.length > 0) {
        resolvedParams = templateParams;
      } else {
        const match = findBestTemplateMatch(content, [dbTemplate]);
        if (match && match.params.length > 0) {
          resolvedParams = match.params;
        }
      }
    } else {
      // Auto-match mode
      const dbTemplates = await db
        .select()
        .from(waTemplatesTable)
        .where(
          and(
            eq(waTemplatesTable.channelId, channel.id),
            eq(waTemplatesTable.status, "APPROVED")
          )
        );

      const match = findBestTemplateMatch(content, dbTemplates);
      if (!match) {
        res.status(400).json({
          error: "No matching template found for the provided content. Use templateName for explicit selection or sync templates first.",
        });
        return;
      }

      resolvedParams = match.params;
      matchedTemplateName = match.templateName;
    }

    // Find or create contact
    let contact: typeof contactsTable.$inferSelect;
    try {
      contact = await findOrCreateContact(to);
    } catch (err) {
      logger.error({ err, to }, "Failed to find or create contact");
      res.status(500).json({ error: "Failed to resolve contact" });
      return;
    }

    // Find or create conversation
    let conversation: typeof conversationsTable.$inferSelect;
    try {
      conversation = await findOrCreateConversation(contact.id, channel.id, channel);
    } catch (err) {
      logger.error({ err, contactId: contact.id, channelId: channel.id }, "Failed to find or create conversation");
      res.status(500).json({ error: "Failed to resolve conversation" });
      return;
    }

    // Send via WhatsApp template API
    let externalMessageId: string | undefined;
    try {
      externalMessageId = await sendWhatsAppTemplate(
        channel,
        to,
        matchedTemplateName!,
        resolvedTemplateLanguage,
        resolvedParams
      );
    } catch (err) {
      logger.error({ err, to, templateName: matchedTemplateName }, "WhatsApp template send failed");
      res.status(502).json({ error: `WhatsApp API error: ${(err as Error).message}` });
      return;
    }

    // Record the message
    const [messageRecord] = await db
      .insert(messagesTable)
      .values({
        conversationId: conversation.id,
        senderType: "system",
        direction: "outbound",
        contentType: "template",
        content,
        externalMessageId: externalMessageId ?? null,
        deliveryStatus: externalMessageId ? "sent" : "pending",
      })
      .returning();

    // Update conversation — auto-resolve so API messages don't clutter the inbox
    await db
      .update(conversationsTable)
      .set({ status: "resolved", lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversationsTable.id, conversation.id));

    res.json(ExternalWhatsappSendResponse.parse({
      success: true,
      messageId: externalMessageId,
      externalMessageId: externalMessageId ?? null,
      conversationId: conversation.id,
      messageRecordId: messageRecord.id,
      templateMatched: matchedTemplateName,
    }));
  } catch (err) {
    logger.error({ err, to, templateName: matchedTemplateName || templateName, channelName, channelId }, "Unhandled error in external whatsapp send");
    res.status(500).json({ error: (err as Error).message || "Internal server error" });
  }
});

export default router;
