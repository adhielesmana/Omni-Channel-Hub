import { selectRaw, query } from "@workspace/db";
import type { Channel, WaTemplate } from "@workspace/db";
import { logger } from "./logger";

const GRAPH_API_BASE = "https://graph.facebook.com/v18.0";

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startTemplateSyncWorker(): void {
  if (intervalHandle) return;
  logger.info("Starting template sync worker (checks every 60min)");
  intervalHandle = setInterval(checkMidnightSync, 60_000);
}

export function stopTemplateSyncWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info("Template sync worker stopped");
  }
}

async function checkMidnightSync(): Promise<void> {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() < 5) {
    logger.info("Midnight trigger: syncing templates for all WhatsApp channels");
    const channels = await selectRaw<Channel>(
      `SELECT * FROM channels WHERE channel_type = 'whatsapp' AND is_active = true`,
    );

    for (const channel of channels) {
      if (channel.accessToken && channel.wabaId) {
        try {
          await syncTemplatesFromMeta(channel);
        } catch (err) {
          logger.error({ err, channelId: channel.id }, "Midnight template sync failed");
        }
      }
    }
  }
}

export async function syncTemplatesFromMeta(
  channel: Channel,
): Promise<{ synced: number; total: number }> {
  const url = `${GRAPH_API_BASE}/${channel.wabaId}/message_templates`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${channel.accessToken}` },
  });

  const data = (await response.json()) as {
    data?: Array<Record<string, unknown>>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message || `Meta API error: ${response.status}`);
  }

  const metaTemplates = data.data ?? [];
  let synced = 0;

  for (const mt of metaTemplates) {
    const templateId = mt.id as string;
    const name = mt.name as string;
    const language = mt.language as string;
    const status = mt.status as string;
    const category = mt.category as string | undefined;
    const components = mt.components as Array<Record<string, unknown>> | undefined;
    const rejectReason = (mt as Record<string, unknown>).reject_reason as string | undefined;

    const [existing] = await selectRaw<WaTemplate>(
      `SELECT * FROM wa_templates WHERE meta_template_id = $1 AND channel_id = $2`,
      [templateId, channel.id],
    );

    if (existing) {
      await query(
        `UPDATE wa_templates SET name = $1, language = $2, status = $3, category = $4, components = $5, reject_reason = $6, last_synced_at = NOW() WHERE id = $7`,
        [name, language, status, category ?? null, components ? JSON.stringify(components) : null, rejectReason ?? null, existing.id],
      );
    } else {
      await query(
        `INSERT INTO wa_templates (meta_template_id, name, language, status, category, channel_id, components, reject_reason, last_synced_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [templateId, name, language, status, category ?? null, channel.id, components ? JSON.stringify(components) : null, rejectReason ?? null],
      );
    }
    synced++;
  }

  const localTemplates = await selectRaw<WaTemplate>(
    `SELECT * FROM wa_templates WHERE channel_id = $1`,
    [channel.id],
  );

  const metaIds = new Set(metaTemplates.map((mt) => mt.id as string));
  for (const local of localTemplates) {
    if (local.metaTemplateId && !metaIds.has(local.metaTemplateId)) {
      await query(
        `DELETE FROM wa_templates WHERE id = $1`,
        [local.id],
      );
    }
  }

  logger.info({ channelId: channel.id, synced, total: metaTemplates.length }, "Templates synced from Meta");
  return { synced, total: metaTemplates.length };
}

export async function deleteTemplateOnMeta(
  channel: Channel,
  templateName: string,
  hsmId: string,
): Promise<void> {
  const url = `${GRAPH_API_BASE}/${channel.wabaId}/message_templates?name=${encodeURIComponent(templateName)}&hsm_id=${encodeURIComponent(hsmId)}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${channel.accessToken}` },
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(data.error?.message || `Meta API error: ${response.status}`);
  }
}
