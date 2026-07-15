import { Router } from "../lib/http-kit";
import { selectAll, selectById, insert, update, del, selectWhere, selectRaw } from "@workspace/db";
import type { User, Contact, Message, Conversation, Channel, Department } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { canViewConversation, getAssignedAgentDepartment, getAssignedAgentDepartmentMap, loadConversationViewer } from "../lib/conversation-access";

const router = Router();

async function buildConversationDto(conv: Conversation) {
  const contact = conv.contactId ? await selectById<Contact>("contacts", conv.contactId) : null;
  const channel = conv.channelId ? await selectById<Channel>("channels", conv.channelId) : null;
  const agent = conv.assignedAgentId ? await selectById<User>("users", conv.assignedAgentId) : null;
  const department = conv.departmentId ? await selectById<Department>("departments", conv.departmentId) : null;
  const [lastMsg] = await selectRaw<Message>(
    `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [conv.id],
  );

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
    lastMessageContentType: lastMsg?.contentType ?? null,
  };
}

router.get("/conversations", requireAuth, async (req, res): Promise<void> => {
  const status = req.query.status as string | undefined;
  const channelId = req.query.channelId as string | undefined;
  const departmentId = req.query.departmentId as string | undefined;
  const assignedAgentId = req.query.assignedAgentId as string | undefined;
  const channelType = req.query.channelType as string | undefined;
  const daysOld = req.query.daysOld as string | undefined;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (daysOld) {
    const days = parseInt(daysOld, 10);
    if (!isNaN(days)) {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - days);
      conditions.push(`updated_at >= $${idx++}`);
      params.push(threshold);
    }
  }
  if (status) {
    const valid = ["open", "pending", "resolved", "snoozed"];
    if (valid.includes(status)) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
  }
  if (channelId) {
    const id = parseInt(channelId, 10);
    if (!isNaN(id)) {
      conditions.push(`channel_id = $${idx++}`);
      params.push(id);
    }
  }
  if (departmentId) {
    const id = parseInt(departmentId, 10);
    if (!isNaN(id)) {
      conditions.push(`department_id = $${idx++}`);
      params.push(id);
    }
  }
  if (assignedAgentId) {
    const id = parseInt(assignedAgentId, 10);
    if (!isNaN(id)) {
      conditions.push(`assigned_agent_id = $${idx++}`);
      params.push(id);
    }
  }
  if (channelType) {
    const valid = ["whatsapp", "instagram", "facebook"];
    if (valid.includes(channelType)) {
      conditions.push(`channel_type = $${idx++}`);
      params.push(channelType);
    }
  }

  let convs: Conversation[];
  if (conditions.length > 0) {
    const sql = `SELECT * FROM conversations WHERE ${conditions.join(" AND ")} ORDER BY updated_at DESC`;
    convs = await selectRaw<Conversation>(sql, params);
  } else {
    convs = await selectAll<Conversation>("conversations", { column: "updated_at", dir: "DESC" });
  }

  const viewer = await loadConversationViewer(req.userId!);
  if (!viewer) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const visibleConvs = viewer.role === "admin"
    ? convs
    : await (async () => {
        const assignedAgentIds = Array.from(
          new Set(convs.map((conv) => conv.assignedAgentId).filter((id): id is number => id != null))
        );
        const assignedAgentDepartments = await getAssignedAgentDepartmentMap(assignedAgentIds);
        return convs.filter((conv) =>
          canViewConversation(conv, viewer, assignedAgentDepartments.get(conv.assignedAgentId ?? -1) ?? null)
        );
      })();

  const dtos = await Promise.all(visibleConvs.map(buildConversationDto));
  res.json(dtos);
});

router.post("/conversations", requireAuth, async (req, res): Promise<void> => {
  const body = (req.body as Record<string, unknown>) ?? {};
  const errors: string[] = [];

  const contactId = typeof body.contactId === "number" ? body.contactId : parseInt(String(body.contactId ?? ""), 10);
  if (isNaN(contactId) || contactId <= 0) {
    errors.push("contactId must be a positive number");
  }
  const channelId = typeof body.channelId === "number" ? body.channelId : parseInt(String(body.channelId ?? ""), 10);
  if (isNaN(channelId) || channelId <= 0) {
    errors.push("channelId must be a positive number");
  }
  const channelType = body.channelType as string;
  const validTypes = ["whatsapp", "instagram", "facebook"];
  if (typeof channelType !== "string" || !validTypes.includes(channelType)) {
    errors.push("channelType must be one of: whatsapp, instagram, facebook");
  }

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join("; ") });
    return;
  }

  const conv = await insert<Conversation>("conversations", {
    contact_id: contactId,
    channel_id: channelId,
    channel_type: channelType,
    department_id: body.departmentId != null ? Number(body.departmentId) : null,
    assigned_agent_id: body.assignedAgentId != null ? Number(body.assignedAgentId) : null,
    subject: typeof body.subject === "string" ? body.subject : null,
    status: "open",
    last_message_at: new Date(),
    unread_count: 0,
  });

  const dto = await buildConversationDto(conv);
  res.status(201).json(dto);
});

router.get("/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const viewer = await loadConversationViewer(req.userId!);
  if (!viewer) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const conv = await selectById<Conversation>("conversations", id);
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
  res.json(dto);
});

router.patch("/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const body = (req.body as Record<string, unknown>) ?? {};
  const errors: string[] = [];

  if (body.status !== undefined) {
    const valid = ["open", "pending", "resolved", "snoozed"];
    if (!valid.includes(body.status as string)) {
      errors.push("status must be one of: open, pending, resolved, snoozed");
    }
  }

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join("; ") });
    return;
  }

  const viewer = await loadConversationViewer(req.userId!);
  if (!viewer) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const existing = await selectById<Conversation>("conversations", id);
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

  const updateData: Record<string, unknown> = {};
  if (body.status !== undefined) updateData.status = body.status;
  if (body.departmentId !== undefined) updateData.department_id = body.departmentId != null ? Number(body.departmentId) : null;
  if (body.assignedAgentId !== undefined) updateData.assigned_agent_id = body.assignedAgentId != null ? Number(body.assignedAgentId) : null;
  if (body.subject !== undefined) updateData.subject = body.subject;

  const conv = await update<Conversation>("conversations", id, updateData);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const dto = await buildConversationDto(conv);
  res.json(dto);
});

router.post("/conversations/:id/assign", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const body = (req.body as Record<string, unknown>) ?? {};
  const viewer = await loadConversationViewer(req.userId!);
  if (!viewer) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const existing = await selectById<Conversation>("conversations", id);
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

  let departmentId = body.departmentId != null ? Number(body.departmentId) : undefined;
  if (body.assignedAgentId != null && departmentId === undefined) {
    departmentId = await getAssignedAgentDepartment(Number(body.assignedAgentId)) ?? undefined;
  }

  const updateData: Record<string, unknown> = {};
  if (departmentId !== undefined) updateData.department_id = departmentId;
  if (body.assignedAgentId !== undefined) updateData.assigned_agent_id = body.assignedAgentId != null ? Number(body.assignedAgentId) : null;
  updateData.status = "open";

  const conv = await update<Conversation>("conversations", id, updateData);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const dto = await buildConversationDto(conv);
  res.json(dto);
});

router.post("/conversations/:id/resolve", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const viewer = await loadConversationViewer(req.userId!);
  if (!viewer) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const existing = await selectById<Conversation>("conversations", id);
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

    if (existing.departmentId && viewer.departmentId !== existing.departmentId) {
      res.status(403).json({ error: "Only members of the assigned department can resolve this conversation" });
      return;
    }
  }

  const conv = await update<Conversation>("conversations", id, { status: "resolved" });
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const dto = await buildConversationDto(conv);
  res.json(dto);
});

router.post("/conversations/:id/reopen", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const viewer = await loadConversationViewer(req.userId!);
  if (!viewer) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const existing = await selectById<Conversation>("conversations", id);
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

  const conv = await update<Conversation>("conversations", id, { status: "open" });
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const dto = await buildConversationDto(conv);
  res.json(dto);
});

export default router;
