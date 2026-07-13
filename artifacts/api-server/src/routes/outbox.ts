import { Router } from "../lib/http-kit";
import { selectRaw, count } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/outbox", requireAuth, async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  let whereSql = "WHERE sender_type = 'system' AND direction = 'outbound'";
  const params: unknown[] = [];

  if (status) {
    const idx = params.length + 1;
    whereSql += ` AND delivery_status = $${idx}`;
    params.push(status);
  }

  const countRows = await selectRaw<{ count: string }>(
    `SELECT count(*)::int AS count FROM messages ${whereSql}`,
    params,
  );
  const total = Number(countRows[0]?.count ?? 0);

  const rows = await selectRaw<{
    id: number;
    conversation_id: number;
    direction: string;
    content_type: string;
    content: string | null;
    media_url: string | null;
    external_message_id: string | null;
    delivery_status: string | null;
    created_at: Date;
    recipient_phone: string | null;
    recipient_name: string | null;
    channel_name: string | null;
  }>(
    `SELECT m.id, m.conversation_id, m.direction, m.content_type, m.content,
            m.media_url, m.external_message_id, m.delivery_status, m.created_at,
            c.phone AS recipient_phone, c.name AS recipient_name,
            ch.name AS channel_name
     FROM messages m
     LEFT JOIN conversations cv ON m.conversation_id = cv.id
     LEFT JOIN contacts c ON cv.contact_id = c.id
     LEFT JOIN channels ch ON cv.channel_id = ch.id
     ${whereSql}
     ORDER BY m.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  res.json({
    messages: rows,
    total,
    page,
    limit,
  });
});

export default router;
