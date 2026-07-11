import { Router, type IRouter } from "express";
import { eq, and, desc, gte } from "drizzle-orm";
import { db, conversationsTable, contactsTable, channelsTable, usersTable, departmentsTable, messagesTable } from "@workspace/db";
import {
  ListConversationsResponse,
  ListConversationsQueryParams,
  CreateConversationBody,
  GetConversationParams,
  GetConversationResponse,
  UpdateConversationParams,
  UpdateConversationBody,
  UpdateConversationResponse,
  AssignConversationParams,
  AssignConversationBody,
  AssignConversationResponse,
  ResolveConversationParams,
  ResolveConversationResponse,
  ReopenConversationParams,
  ReopenConversationResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { canViewConversation, getAssignedAgentDepartment, getAssignedAgentDepartmentMap, loadConversationViewer } from "../lib/conversation-access";

const router: IRouter = Router();

async function buildConversationDto(conv: typeof conversationsTable.$inferSelect) {
  const [contact] = conv.contactId
    ? await db.select().from(contactsTable).where(eq(contactsTable.id, conv.contactId))
    : [];
  const [channel] = conv.channelId
    ? await db.select().from(channelsTable).where(eq(channelsTable.id, conv.channelId))
    : [];
  const [agent] = conv.assignedAgentId
    ? await db.select().from(usersTable).where(eq(usersTable.id, conv.assignedAgentId))
    : [];
  const [department] = conv.departmentId
    ? await db.select().from(departmentsTable).where(eq(departmentsTable.id, conv.departmentId))
    : [];
  const [lastMsg] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conv.id))
    .orderBy(desc(messagesTable.createdAt))
    .limit(1);

  return {
    ...conv,
    lastMessageAt: conv.lastMessageAt?.toISOString() ?? null,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
    unreadCount: conv.unreadCount ?? 0,
    contact: contact ? { ...contact, createdAt: contact.createdAt.toISOString() } : undefined,
    channel: channel ? { ...channel, createdAt: channel.createdAt.toISOString() } : undefined,
    assignedAgent: agent ? { id: agent.id, name: agent.name, avatarUrl: agent.avatarUrl } : null,
    department: department ? { id: department.id, name: department.name } : null,
    lastMessage: lastMsg?.content ?? null,
  };
}

router.get("/conversations", requireAuth, async (req, res): Promise<void> => {
  const qp = ListConversationsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  const { status, channelId, departmentId, assignedAgentId, channelType, daysOld } = qp.data;
  const conditions = [];

  if (daysOld) {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - daysOld);
    conditions.push(gte(conversationsTable.updatedAt, threshold));
  }
  const viewer = await loadConversationViewer(req.userId!);
  if (!viewer) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  if (status) conditions.push(eq(conversationsTable.status, status as "open" | "pending" | "resolved" | "snoozed"));
  if (channelId) conditions.push(eq(conversationsTable.channelId, Number(channelId)));
  if (departmentId) conditions.push(eq(conversationsTable.departmentId, Number(departmentId)));
  if (assignedAgentId) conditions.push(eq(conversationsTable.assignedAgentId, Number(assignedAgentId)));
  if (channelType) conditions.push(eq(conversationsTable.channelType, channelType as "whatsapp" | "instagram" | "facebook"));

  const convs = conditions.length
    ? await db.select().from(conversationsTable).where(and(...conditions)).orderBy(desc(conversationsTable.updatedAt))
    : await db.select().from(conversationsTable).orderBy(desc(conversationsTable.updatedAt));

  const visibleConvs = viewer.role === "admin"
    ? convs
    : await (async () => {
        const assignedAgentIds = Array.from(
          new Set(convs.map((conv) => conv.assignedAgentId).filter((assignedAgentId): assignedAgentId is number => assignedAgentId != null))
        );
        const assignedAgentDepartments = await getAssignedAgentDepartmentMap(assignedAgentIds);
        return convs.filter((conv) =>
          canViewConversation(conv, viewer, assignedAgentDepartments.get(conv.assignedAgentId ?? -1) ?? null)
        );
      })();

  const dtos = await Promise.all(visibleConvs.map(buildConversationDto));
  res.json(ListConversationsResponse.parse(dtos));
});

router.post("/conversations", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [conv] = await db.insert(conversationsTable).values(parsed.data).returning();
  const dto = await buildConversationDto(conv);
  res.status(201).json(GetConversationResponse.parse(dto));
});

router.get("/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetConversationParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const viewer = await loadConversationViewer(req.userId!);
  if (!viewer) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, params.data.id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  if (viewer.role !== "admin") {
    const assignedAgentDepartmentId = await getAssignedAgentDepartment(conv.assignedAgentId);
    if (!canViewConversation(conv, viewer, assignedAgentDepartmentId)) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
  }
  const dto = await buildConversationDto(conv);
  res.json(GetConversationResponse.parse(dto));
});

router.patch("/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateConversationParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const viewer = await loadConversationViewer(req.userId!);
  if (!viewer) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  const [existing] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  if (viewer.role !== "admin") {
    const assignedAgentDepartmentId = await getAssignedAgentDepartment(existing.assignedAgentId);
    if (!canViewConversation(existing, viewer, assignedAgentDepartmentId)) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
  }
  const [conv] = await db.update(conversationsTable).set(parsed.data).where(eq(conversationsTable.id, params.data.id)).returning();
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const dto = await buildConversationDto(conv);
  res.json(UpdateConversationResponse.parse(dto));
});

router.post("/conversations/:id/assign", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AssignConversationParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AssignConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const viewer = await loadConversationViewer(req.userId!);
  if (!viewer) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  const [existing] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  if (viewer.role !== "admin") {
    const assignedAgentDepartmentId = await getAssignedAgentDepartment(existing.assignedAgentId);
    if (!canViewConversation(existing, viewer, assignedAgentDepartmentId)) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
  }

  let departmentId = parsed.data.departmentId;
  if (parsed.data.assignedAgentId != null && departmentId === undefined) {
    departmentId = await getAssignedAgentDepartment(parsed.data.assignedAgentId);
  }

  const [conv] = await db
    .update(conversationsTable)
    .set({
      departmentId: departmentId ?? undefined,
      assignedAgentId: parsed.data.assignedAgentId ?? undefined,
    })
    .where(eq(conversationsTable.id, params.data.id))
    .returning();
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const dto = await buildConversationDto(conv);
  res.json(AssignConversationResponse.parse(dto));
});

router.post("/conversations/:id/resolve", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ResolveConversationParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const viewer = await loadConversationViewer(req.userId!);
  if (!viewer) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  const [existing] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  if (viewer.role !== "admin") {
    const assignedAgentDepartmentId = await getAssignedAgentDepartment(existing.assignedAgentId);
    if (!canViewConversation(existing, viewer, assignedAgentDepartmentId)) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
  }
  const [conv] = await db
    .update(conversationsTable)
    .set({ status: "resolved" })
    .where(eq(conversationsTable.id, params.data.id))
    .returning();
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const dto = await buildConversationDto(conv);
  res.json(ResolveConversationResponse.parse(dto));
});

router.post("/conversations/:id/reopen", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ReopenConversationParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const viewer = await loadConversationViewer(req.userId!);
  if (!viewer) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  const [existing] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  if (viewer.role !== "admin") {
    const assignedAgentDepartmentId = await getAssignedAgentDepartment(existing.assignedAgentId);
    if (!canViewConversation(existing, viewer, assignedAgentDepartmentId)) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
  }
  const [conv] = await db
    .update(conversationsTable)
    .set({ status: "open" })
    .where(eq(conversationsTable.id, params.data.id))
    .returning();
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const dto = await buildConversationDto(conv);
  res.json(ReopenConversationResponse.parse(dto));
});

export default router;
