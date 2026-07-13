import { selectById, selectRaw } from "@workspace/db";
import type { User } from "@workspace/db";
import { isSuperadmin } from "./auth";

export type ConversationViewer = Pick<User, "id" | "role" | "departmentId">;

export async function loadConversationViewer(userId: number): Promise<ConversationViewer | null> {
  if (isSuperadmin(userId)) {
    return { id: userId, role: "admin", departmentId: null };
  }

  const user = await selectById<User>("users", userId);
  if (!user) return null;
  return { id: user.id, role: user.role, departmentId: user.departmentId };
}

export async function getAssignedAgentDepartment(assignedAgentId: number | null | undefined): Promise<number | null> {
  if (!assignedAgentId) return null;
  const user = await selectById<User>("users", assignedAgentId);
  return user?.departmentId ?? null;
}

export async function getAssignedAgentDepartmentMap(assignedAgentIds: number[]): Promise<Map<number, number | null>> {
  if (!assignedAgentIds.length) {
    return new Map();
  }

  const agents = await selectRaw<Pick<User, "id" | "departmentId">>(
    `SELECT id, department_id AS "departmentId" FROM users WHERE id = ANY($1)`,
    [assignedAgentIds],
  );

  return new Map(agents.map((agent) => [agent.id, agent.departmentId ?? null]));
}

export function canViewConversation(
  conversation: { assignedAgentId: number | null; departmentId: number | null },
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
