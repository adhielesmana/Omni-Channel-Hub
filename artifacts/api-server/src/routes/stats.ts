import { Router, type IRouter } from "express";
import { eq, count, sql, and } from "drizzle-orm";
import { db, conversationsTable, contactsTable, usersTable, departmentsTable } from "@workspace/db";
import {
  GetStatsOverviewResponse,
  GetConversationsByChannelResponse,
  GetConversationsByDepartmentResponse,
  GetAgentWorkloadResponse,
  GetStatsPeriodsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseDateRange(req: { query: Record<string, unknown> }): { start?: string; end?: string } {
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
      label: `${label} (26–25)`,
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    });
  }
  return periods;
}

// Build a date-filter condition using raw SQL for PostgreSQL timestamps
function buildDateFilter(start?: string, end?: string) {
  const conditions: ReturnType<typeof sql>[] = [];
  if (start) {
    conditions.push(sql`${conversationsTable.createdAt} >= ${start + "T00:00:00Z"}::timestamptz`);
  }
  if (end) {
    conditions.push(sql`${conversationsTable.createdAt} <= ${end + "T23:59:59.999Z"}::timestamptz`);
  }
  return conditions;
}

router.get("/stats/overview", async (req, res): Promise<void> => {
  const { start, end } = parseDateRange(req);
  const dateConditions = buildDateFilter(start, end);

  let baseFilter: ReturnType<typeof and> | undefined = undefined;
  if (dateConditions.length) {
    baseFilter = dateConditions.length === 1
      ? dateConditions[0]!
      : and(dateConditions[0]!, dateConditions[1]!);
  }

  const totalConvs = baseFilter
    ? await db.select({ count: count() }).from(conversationsTable).where(baseFilter)
    : await db.select({ count: count() }).from(conversationsTable);
  const openConvs = baseFilter
    ? await db.select({ count: count() }).from(conversationsTable).where(and(baseFilter, eq(conversationsTable.status, "open")))
    : await db.select({ count: count() }).from(conversationsTable).where(eq(conversationsTable.status, "open"));
  const pendingConvs = baseFilter
    ? await db.select({ count: count() }).from(conversationsTable).where(and(baseFilter, eq(conversationsTable.status, "pending")))
    : await db.select({ count: count() }).from(conversationsTable).where(eq(conversationsTable.status, "pending"));
  const resolvedConvs = baseFilter
    ? await db.select({ count: count() }).from(conversationsTable).where(and(baseFilter, eq(conversationsTable.status, "resolved")))
    : await db.select({ count: count() }).from(conversationsTable).where(eq(conversationsTable.status, "resolved"));
  const [totalAgents] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "agent"));
  const unassigned = baseFilter
    ? await db.select({ count: count() }).from(conversationsTable)
        .where(and(baseFilter, sql`${conversationsTable.assignedAgentId} IS NULL AND ${conversationsTable.status} = 'open'`))
    : await db.select({ count: count() }).from(conversationsTable)
        .where(sql`${conversationsTable.assignedAgentId} IS NULL AND ${conversationsTable.status} = 'open'`);

  const overview = {
    totalConversations: Number(totalConvs[0]?.count ?? 0),
    openConversations: Number(openConvs[0]?.count ?? 0),
    pendingConversations: Number(pendingConvs[0]?.count ?? 0),
    resolvedConversations: Number(resolvedConvs[0]?.count ?? 0),
    totalContacts: 0, // placeholder; contacts don't have period filtering for now
    totalAgents: Number(totalAgents?.count ?? 0),
    avgResponseTime: 4.2,
    unassignedConversations: Number(unassigned[0]?.count ?? 0),
  };

  res.json(GetStatsOverviewResponse.parse(overview));
});

router.get("/stats/conversations-by-channel", async (req, res): Promise<void> => {
  const { start, end } = parseDateRange(req);
  const dateConditions = buildDateFilter(start, end);

  let filter = dateConditions.length ? (dateConditions.length === 1 ? dateConditions[0]! : and(dateConditions[0]!, dateConditions[1]!)) : undefined;

  const rows = filter
    ? await db.select({ channelType: conversationsTable.channelType, count: count() })
        .from(conversationsTable).where(filter).groupBy(conversationsTable.channelType)
    : await db.select({ channelType: conversationsTable.channelType, count: count() })
        .from(conversationsTable).groupBy(conversationsTable.channelType);

  res.json(GetConversationsByChannelResponse.parse(rows.map(r => ({ channelType: r.channelType, count: Number(r.count) }))));
});

router.get("/stats/conversations-by-department", async (req, res): Promise<void> => {
  const { start, end } = parseDateRange(req);
  const dateConditions = buildDateFilter(start, end);

  const query = db.select({
    departmentId: conversationsTable.departmentId,
    departmentName: departmentsTable.name,
    count: count(),
  }).from(conversationsTable).innerJoin(departmentsTable, eq(conversationsTable.departmentId, departmentsTable.id))
    .groupBy(conversationsTable.departmentId, departmentsTable.name);

  const rows = dateConditions.length
    ? await query.where(dateConditions.length === 1 ? dateConditions[0]! : and(dateConditions[0]!, dateConditions[1]!))
    : await query;

  res.json(GetConversationsByDepartmentResponse.parse(
    rows.map(r => ({
      departmentId: r.departmentId!,
      departmentName: r.departmentName,
      count: Number(r.count),
    }))
  ));
});

router.get("/stats/agent-workload", async (req, res): Promise<void> => {
  const { start, end } = parseDateRange(req);

  const agents = await db.select().from(usersTable).where(eq(usersTable.role, "agent"));

  const workload = await Promise.all(agents.map(async (agent) => {
    // Open count: always current open count assigned to agent (not date-filtered)
    const [open] = await db.select({ count: count() }).from(conversationsTable)
      .where(sql`${conversationsTable.assignedAgentId} = ${agent.id} AND ${conversationsTable.status} = 'open'`);

    // Resolved count: conversations resolved during the period
    let resolvedCount = 0;
    if (start && end) {
      const startTs = start + "T00:00:00Z";
      const endTs = end + "T23:59:59.999Z";
      const [resolved] = await db.select({ count: count() }).from(conversationsTable)
        .where(sql`${conversationsTable.assignedAgentId} = ${agent.id} AND ${conversationsTable.status} = 'resolved' AND ${conversationsTable.updatedAt} >= ${startTs}::timestamptz AND ${conversationsTable.updatedAt} <= ${endTs}::timestamptz`);
      resolvedCount = Number(resolved?.count ?? 0);
    } else {
      const [resolved] = await db.select({ count: count() }).from(conversationsTable)
        .where(sql`${conversationsTable.assignedAgentId} = ${agent.id} AND ${conversationsTable.status} = 'resolved'`);
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

  res.json(GetAgentWorkloadResponse.parse(workload));
});

router.get("/stats/periods", async (_req, res): Promise<void> => {
  res.json(GetStatsPeriodsResponse.parse(getPeriods()));
});

export default router;
