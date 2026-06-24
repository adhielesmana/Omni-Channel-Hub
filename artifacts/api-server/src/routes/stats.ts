import { Router, type IRouter } from "express";
import { eq, count, sql } from "drizzle-orm";
import { db, conversationsTable, contactsTable, usersTable, departmentsTable, messagesTable } from "@workspace/db";
import {
  GetStatsOverviewResponse,
  GetConversationsByChannelResponse,
  GetConversationsByDepartmentResponse,
  GetAgentWorkloadResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stats/overview", async (req, res): Promise<void> => {
  const [totalConvs] = await db.select({ count: count() }).from(conversationsTable);
  const [openConvs] = await db.select({ count: count() }).from(conversationsTable).where(eq(conversationsTable.status, "open"));
  const [pendingConvs] = await db.select({ count: count() }).from(conversationsTable).where(eq(conversationsTable.status, "pending"));
  const [resolvedConvs] = await db.select({ count: count() }).from(conversationsTable).where(eq(conversationsTable.status, "resolved"));
  const [totalContacts] = await db.select({ count: count() }).from(contactsTable);
  const [totalAgents] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "agent"));
  const [unassigned] = await db
    .select({ count: count() })
    .from(conversationsTable)
    .where(sql`${conversationsTable.assignedAgentId} IS NULL AND ${conversationsTable.status} = 'open'`);

  const overview = {
    totalConversations: Number(totalConvs?.count ?? 0),
    openConversations: Number(openConvs?.count ?? 0),
    pendingConversations: Number(pendingConvs?.count ?? 0),
    resolvedConversations: Number(resolvedConvs?.count ?? 0),
    totalContacts: Number(totalContacts?.count ?? 0),
    totalAgents: Number(totalAgents?.count ?? 0),
    avgResponseTime: 4.2,
    unassignedConversations: Number(unassigned?.count ?? 0),
  };

  res.json(GetStatsOverviewResponse.parse(overview));
});

router.get("/stats/conversations-by-channel", async (req, res): Promise<void> => {
  const rows = await db
    .select({ channelType: conversationsTable.channelType, count: count() })
    .from(conversationsTable)
    .groupBy(conversationsTable.channelType);

  res.json(GetConversationsByChannelResponse.parse(rows.map(r => ({ channelType: r.channelType, count: Number(r.count) }))));
});

router.get("/stats/conversations-by-department", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      departmentId: conversationsTable.departmentId,
      departmentName: departmentsTable.name,
      count: count(),
    })
    .from(conversationsTable)
    .innerJoin(departmentsTable, eq(conversationsTable.departmentId, departmentsTable.id))
    .groupBy(conversationsTable.departmentId, departmentsTable.name);

  res.json(GetConversationsByDepartmentResponse.parse(
    rows.map(r => ({
      departmentId: r.departmentId!,
      departmentName: r.departmentName,
      count: Number(r.count),
    }))
  ));
});

router.get("/stats/agent-workload", async (req, res): Promise<void> => {
  const agents = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.role, "agent"));

  const workload = await Promise.all(agents.map(async (agent) => {
    const [open] = await db.select({ count: count() }).from(conversationsTable)
      .where(sql`${conversationsTable.assignedAgentId} = ${agent.id} AND ${conversationsTable.status} = 'open'`);
    const [resolved] = await db.select({ count: count() }).from(conversationsTable)
      .where(sql`${conversationsTable.assignedAgentId} = ${agent.id} AND ${conversationsTable.status} = 'resolved'`);
    return {
      agentId: agent.id,
      agentName: agent.name,
      avatarUrl: agent.avatarUrl,
      openCount: Number(open?.count ?? 0),
      resolvedCount: Number(resolved?.count ?? 0),
    };
  }));

  res.json(GetAgentWorkloadResponse.parse(workload));
});

export default router;
