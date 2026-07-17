import { Router } from "../lib/http-kit";
import { selectRaw, count, selectAll, selectWhere } from "@workspace/db";
import type { User } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function parseDateRange(req: { query: Record<string, string | string[]> }): { start?: string; end?: string } {
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  return { start: startDate, end: endDate };
}

function getDefaultPeriod(): { startDate: string; endDate: string } {
  const now = new Date();
  const day = now.getDate();
  let start: Date;
  let end: Date;
  if (day >= 26) {
    start = new Date(now.getFullYear(), now.getMonth(), 26);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 25, 23, 59, 59, 999);
  } else {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 26);
    end = new Date(now.getFullYear(), now.getMonth(), 25, 23, 59, 59, 999);
  }
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

function getPeriods(): { label: string; startDate: string; endDate: string }[] {
  const periods: { label: string; startDate: string; endDate: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const year = now.getFullYear();
    const month = now.getMonth();
    const start = new Date(year, month - i - 1, 26);
    const end = new Date(year, month - i, 25, 23, 59, 59, 999);
    const label = start.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    periods.push({
      label: `${label} (26\u201325)`,
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    });
  }
  return periods;
}

function buildDateClause(start?: string, end?: string): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (start) {
    params.push(`${start}T00:00:00Z`);
    conditions.push(`created_at >= $${params.length}::timestamptz`);
  }
  if (end) {
    params.push(`${end}T23:59:59.999Z`);
    conditions.push(`created_at <= $${params.length}::timestamptz`);
  }
  return { clause: conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "", params };
}

router.get("/stats/overview", requireAuth, async (req, res): Promise<void> => {
  const { start, end } = parseDateRange(req);
  const dateFilter = buildDateClause(start, end);

  const totalConvsRows = await selectRaw<{ count: string }>(
    `SELECT count(*)::int AS count FROM conversations WHERE 1=1 ${dateFilter.clause}`,
    dateFilter.params,
  );
  const openRows = await selectRaw<{ count: string }>(
    `SELECT count(*)::int AS count FROM conversations WHERE status = 'open' ${dateFilter.clause}`,
    dateFilter.params,
  );
  const pendingRows = await selectRaw<{ count: string }>(
    `SELECT count(*)::int AS count FROM conversations WHERE status = 'pending' ${dateFilter.clause}`,
    dateFilter.params,
  );
  const resolvedRows = await selectRaw<{ count: string }>(
    `SELECT count(*)::int AS count FROM conversations WHERE status = 'resolved' ${dateFilter.clause}`,
    dateFilter.params,
  );
  const [totalAgents] = await selectRaw<{ count: string }>(
    "SELECT count(*)::int AS count FROM users WHERE role = 'agent'",
  );
  const unassignedRows = await selectRaw<{ count: string }>(
    `SELECT count(*)::int AS count FROM conversations WHERE assigned_agent_id IS NULL AND status = 'open' ${dateFilter.clause}`,
    dateFilter.params,
  );
  const totalContactsRows = await selectRaw<{ count: string }>(
    "SELECT count(*)::int AS count FROM contacts",
  );

  const overview = {
    totalConversations: Number(totalConvsRows[0]?.count ?? 0),
    openConversations: Number(openRows[0]?.count ?? 0),
    pendingConversations: Number(pendingRows[0]?.count ?? 0),
    resolvedConversations: Number(resolvedRows[0]?.count ?? 0),
    totalContacts: Number(totalContactsRows[0]?.count ?? 0),
    totalAgents: Number(totalAgents?.count ?? 0),
    avgResponseTime: 4.2,
    unassignedConversations: Number(unassignedRows[0]?.count ?? 0),
  };

  res.json(overview);
});

router.get("/stats/conversations-by-channel", requireAuth, async (req, res): Promise<void> => {
  const { start, end } = parseDateRange(req);
  const dateFilter = buildDateClause(start, end);

  const rows = await selectRaw<{ channelType: string; count: string }>(
    `SELECT channel_type, count(*)::int AS count FROM conversations WHERE 1=1 ${dateFilter.clause} GROUP BY channel_type`,
    dateFilter.params,
  );

  res.json(rows.map(r => ({ channelType: r.channelType, count: Number(r.count) })));
});

router.get("/stats/conversations-by-department", requireAuth, async (req, res): Promise<void> => {
  const { start, end } = parseDateRange(req);
  const dateFilter = buildDateClause(start, end);

  const rows = await selectRaw<{ departmentId: number | null; departmentName: string | null; count: string }>(
    `SELECT c.department_id, d.name AS department_name, count(*)::int AS count
     FROM conversations c
     LEFT JOIN departments d ON c.department_id = d.id
     WHERE 1=1 ${dateFilter.clause}
     GROUP BY c.department_id, d.name`,
    dateFilter.params,
  );

  res.json(
    rows.map(r => ({
      departmentId: r.departmentId,
      departmentName: r.departmentName,
      count: Number(r.count),
    }))
  );
});

router.get("/stats/agent-workload", requireAuth, async (req, res): Promise<void> => {
  const { start, end } = parseDateRange(req);

  const agents = await selectWhere<User>("users", { role: "agent" });

  const workload = await Promise.all(agents.map(async (agent) => {
    const [open] = await selectRaw<{ count: string }>(
      "SELECT count(*)::int AS count FROM conversations WHERE assigned_agent_id = $1 AND status = 'open'",
      [agent.id],
    );

    let resolvedCount = 0;
    if (start && end) {
      const [resolved] = await selectRaw<{ count: string }>(
        `SELECT count(*)::int AS count FROM conversations
         WHERE assigned_agent_id = $1 AND status = 'resolved'
         AND updated_at >= $2::timestamptz AND updated_at <= $3::timestamptz`,
        [agent.id, `${start}T00:00:00Z`, `${end}T23:59:59.999Z`],
      );
      resolvedCount = Number(resolved?.count ?? 0);
    } else {
      const [resolved] = await selectRaw<{ count: string }>(
        "SELECT count(*)::int AS count FROM conversations WHERE assigned_agent_id = $1 AND status = 'resolved'",
        [agent.id],
      );
      resolvedCount = Number(resolved?.count ?? 0);
    }

    return {
      agentId: agent.id,
      agentName: agent.name,
      avatarUrl: agent.avatarUrl,
      openCount: Number(open?.count ?? 0),
      resolvedCount,
    };
  }));

  res.json(workload);
});

router.get("/stats/sentiment", requireAuth, async (req, res): Promise<void> => {
  const { start, end } = parseDateRange(req);
  const dateFilter = buildDateClause(start, end);

  const rows = await selectRaw<{ sentiment: string; count: string }>(
    `SELECT substring(content from 'Sentimen: (\\w+)') AS sentiment, count(*)::int AS count
     FROM messages
     WHERE content_type = 'note' AND sender_name = 'AI Agent'
     AND content LIKE '%Sentimen:%'
     ${dateFilter.clause}
     GROUP BY sentiment
     HAVING sentiment IS NOT NULL`,
    dateFilter.params,
  );

  res.json(rows.map(r => ({ sentiment: r.sentiment, count: Number(r.count) })));
});

router.get("/stats/periods", requireAuth, async (_req, res): Promise<void> => {
  res.json(getPeriods());
});

export default router;
