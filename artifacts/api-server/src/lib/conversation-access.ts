import { eq, inArray } from "drizzle-orm";
import { db, conversationsTable, usersTable, type Conversation, type User } from "@workspace/db";
import { isSuperadmin } from "./auth";

export type ConversationViewer = Pick<User, "id" | "role" | "departmentId">;

export async function loadConversationViewer(userId: number): Promise<ConversationViewer | null> {
  if (isSuperadmin(userId)) {
    return { id: userId, role: "admin", departmentId: null };
  }

  const [user] = await db
    .select({
      id: usersTable.id,
      role: usersTable.role,
      departmentId: usersTable.departmentId,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  return user ?? null;
}

export async function getAssignedAgentDepartment(assignedAgentId: number | null | undefined): Promise<number | null> {
  if (!assignedAgentId) return null;

  const [agent] = await db
    .select({ departmentId: usersTable.departmentId })
    .from(usersTable)
    .where(eq(usersTable.id, assignedAgentId));

  return agent?.departmentId ?? null;
}

export async function getAssignedAgentDepartmentMap(assignedAgentIds: number[]): Promise<Map<number, number | null>> {
  if (!assignedAgentIds.length) {
    return new Map();
  }

  const agents = await db
    .select({
      id: usersTable.id,
      departmentId: usersTable.departmentId,
    })
    .from(usersTable)
    .where(inArray(usersTable.id, assignedAgentIds));

  return new Map(agents.map((agent) => [agent.id, agent.departmentId ?? null]));
}

export function canViewConversation(
  conversation: Pick<Conversation, "assignedAgentId" | "departmentId">,
  viewer: ConversationViewer,
  assignedAgentDepartmentId: number | null = null,
): boolean {
  if (viewer.role === "admin") {
    return true;
  }

  if (conversation.assignedAgentId == null) {
    return true;
  }

  if (conversation.assignedAgentId === viewer.id) {
    return true;
  }

  if (viewer.departmentId != null && conversation.departmentId === viewer.departmentId) {
    return true;
  }

  if (viewer.departmentId != null && assignedAgentDepartmentId === viewer.departmentId) {
    return true;
  }

  return false;
}
