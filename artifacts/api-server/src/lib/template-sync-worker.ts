import { eq, and } from "drizzle-orm";
import { db, waTemplatesTable, channelsTable } from "@workspace/db";
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

// Check if it's midnight, then sync
async function checkMidnightSync(): Promise<void> {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() < 5) {
    logger.info("Midnight trigger: syncing templates for all WhatsApp channels");
    const channels = await db
      .select()
      .from(channelsTable)
      .where(and(eq(channelsTable.channelType, "whatsapp"), eq(channelsTable.isActive, true)));

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
  channel: typeof channelsTable.$inferSelect,
): Promise<{ synced: number; total: number }> {
  const url = `${GRAPH_API_BASE}/${channel.wabaId}/message_templates`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${channel.accessToken}` },
  });

  const data = await response.json() as {
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

    const [existing] = await db
      .select()
      .from(waTemplatesTable)
      .where(and(
        eq(waTemplatesTable.metaTemplateId, templateId),
        eq(waTemplatesTable.channelId, channel.id),
      ));

    if (existing) {
      await db
        .update(waTemplatesTable)
        .set({
          name,
          language,
          status: status as typeof waTemplatesTable.$inferSelect.status,
          category: category ?? null,
          components: components ? JSON.stringify(components) : null,
          rejectReason: rejectReason ?? null,
          lastSyncedAt: new Date(),
        })
        .where(eq(waTemplatesTable.id, existing.id));
    } else {
      await db.insert(waTemplatesTable).values({
        metaTemplateId: templateId,
        name,
        language,
        status: status as typeof waTemplatesTable.$inferSelect.status,
        category: category ?? null,
        channelId: channel.id,
        components: components ? JSON.stringify(components) : null,
        rejectReason: rejectReason ?? null,
        lastSyncedAt: new Date(),
      });
    }
    synced++;
  }

  // Remove templates from local DB that no longer exist on Meta
  const localTemplates = await db
    .select()
    .from(waTemplatesTable)
    .where(eq(waTemplatesTable.channelId, channel.id));

  const metaIds = new Set(metaTemplates.map((mt) => mt.id as string));
  for (const local of localTemplates) {
    if (local.metaTemplateId && !metaIds.has(local.metaTemplateId)) {
      await db.delete(waTemplatesTable).where(eq(waTemplatesTable.id, local.id));
    }
  }

  logger.info({ channelId: channel.id, synced, total: metaTemplates.length }, "Templates synced from Meta");
  return { synced, total: metaTemplates.length };
}

export async function deleteTemplateOnMeta(
  channel: typeof channelsTable.$inferSelect,
  templateName: string,
  hsmId: string,
): Promise<void> {
  const url = `${GRAPH_API_BASE}/${channel.wabaId}/message_templates?name=${encodeURIComponent(templateName)}&hsm_id=${encodeURIComponent(hsmId)}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${channel.accessToken}` },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(data.error?.message || `Meta API error: ${response.status}`);
  }
}
