import { selectRaw, update, query } from "@workspace/db";
import type { WhatsappBlast, Channel, WaTemplate, WhatsappBlastRecipient } from "@workspace/db";
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
    const pendingBlasts = await selectRaw<WhatsappBlast>(
      `SELECT * FROM whatsapp_blasts
       WHERE status = 'pending'
         AND (scheduled_at IS NULL OR scheduled_at <= NOW())
       ORDER BY created_at ASC
       LIMIT 1`,
    );

    for (const blast of pendingBlasts) {
      await processBlast(blast);
    }
  } catch (err) {
    logger.error({ err }, "Blast worker error");
  } finally {
    isProcessing = false;
  }
}

async function processBlast(blast: WhatsappBlast): Promise<void> {
  logger.info({ blastId: blast.id, name: blast.name }, "Processing blast");

  await query(
    `UPDATE whatsapp_blasts SET status = 'processing', started_at = NOW() WHERE id = $1`,
    [blast.id],
  );

  const [channel] = await selectRaw<Channel>(
    `SELECT * FROM channels WHERE id = $1`,
    [blast.channelId],
  );

  if (!channel || !channel.accessToken || !channel.externalId) {
    logger.error({ blastId: blast.id, channelId: blast.channelId }, "Channel missing access config");
    await query(
      `UPDATE whatsapp_blasts SET status = 'failed', completed_at = NOW() WHERE id = $1`,
      [blast.id],
    );
    return;
  }

  let templatePlaceholderCount = 0;
  if (blast.templateName) {
    const [tmpl] = await selectRaw<WaTemplate>(
      `SELECT * FROM wa_templates WHERE channel_id = $1 AND name = $2`,
      [blast.channelId, blast.templateName],
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

  let offset = 0;
  let totalSent = 0;
  let totalFailed = 0;
  let totalDelivered = 0;

  while (true) {
    const recipients = await selectRaw<WhatsappBlastRecipient>(
      `SELECT * FROM whatsapp_blast_recipients
       WHERE blast_id = $1 AND status = 'queued'
       ORDER BY id ASC
       LIMIT $2 OFFSET $3`,
      [blast.id, settings.batchSize, offset],
    );

    if (recipients.length === 0) break;

    for (const recipient of recipients) {
      await query(
        `UPDATE whatsapp_blast_recipients SET status = 'pending' WHERE id = $1`,
        [recipient.id],
      );

      try {
        let templateParams: string[] = [];
        if (recipient.templateParams) {
          templateParams = JSON.parse(recipient.templateParams);
        } else if (blast.templateParams) {
          templateParams = JSON.parse(blast.templateParams);
        }

        if (blast.templateName && templateParams.length === 0 && templatePlaceholderCount > 0) {
          logger.warn({ recipientId: recipient.id, phone: recipient.phone, templateName: blast.templateName, placeholderCount: templatePlaceholderCount }, "Template has placeholders but no params provided");
          await query(
            `UPDATE whatsapp_blast_recipients SET status = 'failed', error_message = $1 WHERE id = $2`,
            [`Template "${blast.templateName}" has ${templatePlaceholderCount} placeholder(s) but no parameters provided`, recipient.id],
          );
          totalFailed++;
          continue;
        }

        let messageId: string | undefined;

        if (blast.templateName) {
          messageId = await sendWhatsAppTemplate(channel, recipient.phone, blast.templateName, blast.templateLanguage, templateParams);
        } else if (recipient.content) {
          messageId = await sendWhatsAppText(channel, recipient.phone, recipient.content);
        } else {
          logger.warn({ recipientId: recipient.id }, "No template name or content for recipient");
          await query(
            `UPDATE whatsapp_blast_recipients SET status = 'failed', error_message = 'No template or content configured' WHERE id = $1`,
            [recipient.id],
          );
          totalFailed++;
          continue;
        }

        await query(
          `UPDATE whatsapp_blast_recipients SET status = 'sent', external_message_id = $1, sent_at = NOW() WHERE id = $2`,
          [messageId ?? null, recipient.id],
        );
        totalSent++;
      } catch (err) {
        logger.error({ err, recipientId: recipient.id, phone: recipient.phone }, "Recipient send failed");
        await query(
          `UPDATE whatsapp_blast_recipients SET status = 'failed', error_message = $1 WHERE id = $2`,
          [(err as Error).message, recipient.id],
        );
        totalFailed++;
      }
    }

    offset += recipients.length;

    await query(
      `UPDATE whatsapp_blasts SET sent_count = $1, failed_count = $2 WHERE id = $3`,
      [totalSent, totalFailed, blast.id],
    );

    if (settings.delayBetweenBatchesMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, settings.delayBetweenBatchesMs));
    }
  }

  const status = totalFailed > 0 && totalSent === 0 ? "failed" : "completed";
  await query(
    `UPDATE whatsapp_blasts SET status = $1, completed_at = NOW(), sent_count = $2, failed_count = $3 WHERE id = $4`,
    [status, totalSent, totalFailed, blast.id],
  );

  logger.info({ blastId: blast.id, sent: totalSent, failed: totalFailed }, "Blast completed");
}

async function sendWhatsAppTemplate(
  channel: Channel,
  to: string,
  templateName: string,
  templateLanguage: string,
  params: string[],
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
  channel: Channel,
  to: string,
  content: string,
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
