import { eq, and, lte, isNull, or, sql } from "drizzle-orm";
import { db, whatsappBlastsTable, whatsappBlastRecipientsTable, channelsTable, contactsTable, waTemplatesTable } from "@workspace/db";
import { logger } from "./logger";
import { getBlastSettings } from "./blast-settings";

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

export function startBlastWorker(): void {
  if (intervalHandle) return;

  logger.info("Starting WhatsApp blast worker");
  intervalHandle = setInterval(processBlasts, 10_000);
}

export function stopBlastWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info("WhatsApp blast worker stopped");
  }
}

async function processBlasts(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // Find pending blasts that are ready to process
    const pendingBlasts = await db
      .select()
      .from(whatsappBlastsTable)
      .where(
        and(
          eq(whatsappBlastsTable.status, "pending"),
          or(
            isNull(whatsappBlastsTable.scheduledAt),
            lte(whatsappBlastsTable.scheduledAt, new Date())
          )
        )
      )
      .orderBy(sql`${whatsappBlastsTable.createdAt} ASC`)
      .limit(1);

    for (const blast of pendingBlasts) {
      await processBlast(blast);
    }
  } catch (err) {
    logger.error({ err }, "Blast worker error");
  } finally {
    isProcessing = false;
  }
}

async function processBlast(blast: typeof whatsappBlastsTable.$inferSelect): Promise<void> {
  logger.info({ blastId: blast.id, name: blast.name }, "Processing blast");

  // Mark as processing
  await db
    .update(whatsappBlastsTable)
    .set({ status: "processing", startedAt: new Date() })
    .where(eq(whatsappBlastsTable.id, blast.id));

  // Get channel info
  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, blast.channelId));

  if (!channel || !channel.accessToken || !channel.externalId) {
    logger.error({ blastId: blast.id, channelId: blast.channelId }, "Channel missing access config");
    await db
      .update(whatsappBlastsTable)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(whatsappBlastsTable.id, blast.id));
    return;
  }

  // If the blast uses a template, check how many body placeholders it has
  let templatePlaceholderCount = 0;
  if (blast.templateName) {
    const [tmpl] = await db
      .select()
      .from(waTemplatesTable)
      .where(
        and(
          eq(waTemplatesTable.channelId, blast.channelId),
          eq(waTemplatesTable.name, blast.templateName)
        )
      );
    if (tmpl?.components) {
      try {
        const parsed = JSON.parse(tmpl.components) as Array<{ type: string; text?: string }>;
        const body = parsed.find((c) => c.type === "BODY");
        if (body?.text) {
          templatePlaceholderCount = (body.text.match(/\{\{\d+\}\}/g) || []).length;
        }
      } catch { /* ignore parse errors */ }
    }
  }

  const settings = getBlastSettings();

  // Process recipients in batches
  let offset = 0;
  let totalSent = 0;
  let totalFailed = 0;
  let totalDelivered = 0;

  while (true) {
    const recipients = await db
      .select()
      .from(whatsappBlastRecipientsTable)
      .where(
        and(
          eq(whatsappBlastRecipientsTable.blastId, blast.id),
          eq(whatsappBlastRecipientsTable.status, "queued")
        )
      )
      .orderBy(sql`${whatsappBlastRecipientsTable.id} ASC`)
      .limit(settings.batchSize)
      .offset(offset);

    if (recipients.length === 0) break;

    for (const recipient of recipients) {
      // Mark as pending (in-flight)
      await db
        .update(whatsappBlastRecipientsTable)
        .set({ status: "pending" })
        .where(eq(whatsappBlastRecipientsTable.id, recipient.id));

      try {
        // Determine template params: use per-recipient if available, else blast-level
        let templateParams: string[] = [];
        if (recipient.templateParams) {
          templateParams = JSON.parse(recipient.templateParams);
        } else if (blast.templateParams) {
          templateParams = JSON.parse(blast.templateParams);
        }

        // Validate that params are provided when template has placeholders
        if (blast.templateName && templateParams.length === 0 && templatePlaceholderCount > 0) {
          logger.warn({ recipientId: recipient.id, phone: recipient.phone, templateName: blast.templateName, placeholderCount: templatePlaceholderCount }, "Template has placeholders but no params provided");
          await db
            .update(whatsappBlastRecipientsTable)
            .set({ status: "failed", errorMessage: `Template "${blast.templateName}" has ${templatePlaceholderCount} placeholder(s) but no parameters provided` })
            .where(eq(whatsappBlastRecipientsTable.id, recipient.id));
          totalFailed++;
          continue;
        }

        // For external blasts with custom content but no template, we send as text
        let messageId: string | undefined;

        if (blast.templateName) {
          // Send as template message
          messageId = await sendWhatsAppTemplate(
            channel,
            recipient.phone,
            blast.templateName,
            blast.templateLanguage,
            templateParams
          );
        } else if (recipient.content) {
          // Send as text message (for external blasts with per-recipient content)
          messageId = await sendWhatsAppText(
            channel,
            recipient.phone,
            recipient.content
          );
        } else {
          // No template name and no content — skip
          logger.warn({ recipientId: recipient.id }, "No template name or content for recipient");
          await db
            .update(whatsappBlastRecipientsTable)
            .set({ status: "failed", errorMessage: "No template or content configured" })
            .where(eq(whatsappBlastRecipientsTable.id, recipient.id));
          totalFailed++;
          continue;
        }

        await db
          .update(whatsappBlastRecipientsTable)
          .set({
            status: "sent",
            externalMessageId: messageId,
            sentAt: new Date(),
          })
          .where(eq(whatsappBlastRecipientsTable.id, recipient.id));
        totalSent++;
      } catch (err) {
        logger.error({ err, recipientId: recipient.id, phone: recipient.phone }, "Recipient send failed");
        await db
          .update(whatsappBlastRecipientsTable)
          .set({ status: "failed", errorMessage: (err as Error).message })
          .where(eq(whatsappBlastRecipientsTable.id, recipient.id));
        totalFailed++;
      }
    }

    offset += recipients.length;

    // Update blast progress
    await db
      .update(whatsappBlastsTable)
      .set({ sentCount: totalSent, failedCount: totalFailed })
      .where(eq(whatsappBlastsTable.id, blast.id));

    // Delay between batches
    if (settings.delayBetweenBatchesMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, settings.delayBetweenBatchesMs));
    }
  }

  // Mark blast as completed
  const status = totalFailed > 0 && totalSent === 0 ? "failed" : "completed";
  await db
    .update(whatsappBlastsTable)
    .set({
      status,
      completedAt: new Date(),
      sentCount: totalSent,
      failedCount: totalFailed,
    })
    .where(eq(whatsappBlastsTable.id, blast.id));

  logger.info({ blastId: blast.id, sent: totalSent, failed: totalFailed }, "Blast completed");
}

async function sendWhatsAppTemplate(
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

async function sendWhatsAppText(
  channel: typeof channelsTable.$inferSelect,
  to: string,
  content: string
): Promise<string | undefined> {
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
      to,
      type: "text",
      text: { body: content },
    }),
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
