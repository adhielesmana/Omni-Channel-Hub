import { selectWhere, selectRaw } from "@workspace/db";
import type { AiAgentsSettings, Conversation, Contact, Channel } from "@workspace/db";
import { logger } from "./logger";
import { processAiAgentConversation } from "./ai-agent";

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

export function startAiAgentWorker(): void {
  if (intervalHandle) return;
  logger.info("Starting AI agent worker");
  intervalHandle = setInterval(processIdleConversations, 60_000);
}

export function stopAiAgentWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info("AI agent worker stopped");
  }
}

async function processIdleConversations(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const settings = await selectWhere<AiAgentsSettings>("ai_agents_settings", {});
    if (!settings.length || !settings[0].isEnabled) return;

    const s = settings[0];
    const idleMinutes = s.idleMinutes ?? 60;

    const rawConversations = await selectRaw<{
      id: number;
      contact_id: number;
      channel_id: number;
      channel_type: string;
      last_message_at: string | null;
      status: string;
    }>(
      `SELECT c.id, c.contact_id, c.channel_id, c.channel_type, c.last_message_at, c.status
       FROM conversations c
       WHERE c.status NOT IN ('resolved')
         AND c.last_message_at IS NOT NULL
         AND c.last_message_at < NOW() - INTERVAL '1 minute' * $1
         AND EXISTS (
           SELECT 1 FROM messages m
           WHERE m.conversation_id = c.id
             AND m.sender_type = 'contact'
             AND m.direction = 'inbound'
             AND m.created_at = c.last_message_at
         )
         AND NOT EXISTS (
           SELECT 1 FROM messages m
           WHERE m.conversation_id = c.id
             AND m.sender_type = 'system'
             AND m.sender_name = 'AI Agent'
             AND m.created_at > c.last_message_at
         )
       ORDER BY c.last_message_at ASC
       LIMIT 5`,
      [idleMinutes],
    );

    if (!rawConversations.length) return;

    logger.info({ count: rawConversations.length }, "AI agent found idle conversations");

    for (const raw of rawConversations) {
      const conversation = raw as unknown as Conversation;

      try {
        const contacts = await selectWhere<Contact>("contacts", { id: conversation.contactId });
        if (!contacts.length) {
          logger.warn({ conversationId: conversation.id }, "Contact not found for AI agent");
          continue;
        }

        const channels = await selectWhere<Channel>("channels", { id: conversation.channelId });
        if (!channels.length) {
          logger.warn({ conversationId: conversation.id }, "Channel not found for AI agent");
          continue;
        }

        const contact = contacts[0];
        const channel = channels[0];

        if (!channel.accessToken) {
          logger.warn({ conversationId: conversation.id }, "Channel has no access token");
          continue;
        }

        await processAiAgentConversation(conversation, contact, channel, s);
      } catch (err) {
        logger.error({ err, conversationId: conversation.id }, "AI agent processing error");
      }
    }
  } catch (err) {
    logger.error({ err }, "AI agent worker error");
  } finally {
    isProcessing = false;
  }
}
