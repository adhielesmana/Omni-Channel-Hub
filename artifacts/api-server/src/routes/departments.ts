import { Router } from "../lib/http-kit";
import { selectAll, selectById, insert, update, del, count, selectRaw } from "@workspace/db";
import type { Department } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const VALID_ROUTING_MODES = ["manual", "round_robin"] as const;

router.get("/departments", requireAuth, async (_req, res): Promise<void> => {
  const departments = await selectAll<Department>("departments", { column: "created_at", dir: "ASC" });

  const memberCounts = await selectRaw<{ departmentId: number; count: number }>(
    "SELECT department_id, count(*)::int AS count FROM users WHERE department_id IS NOT NULL GROUP BY department_id",
  );
  const countMap = new Map(memberCounts.map((r) => [r.departmentId, r.count]));

  const result = departments.map((d) => ({
    ...d,
    memberCount: countMap.get(d.id) ?? 0,
    createdAt: d.createdAt.toISOString(),
  }));

  res.json(result);
});

router.post("/departments", requireAuth, async (req, res): Promise<void> => {
  const body = (req.body as Record<string, unknown>) ?? {};

  const errors: string[] = [];
  const name = body.name;
  if (typeof name !== "string" || name.trim().length === 0) {
    errors.push("Name is required");
  }
  const routingMode = body.routingMode ?? "manual";
  if (typeof routingMode !== "string" || !VALID_ROUTING_MODES.includes(routingMode as any)) {
    errors.push("Routing mode must be one of: manual, round_robin");
  }
  const description = typeof body.description === "string" ? (body.description as string).trim() || null : null;
  const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join("; ") });
    return;
  }

  const dept = await insert<Department>("departments", {
    name: (name as string).trim(),
    description,
    routingMode,
    isActive,
  });

  res.status(201).json({
    ...dept,
    memberCount: 0,
    createdAt: dept.createdAt.toISOString(),
  });
});

router.get("/departments/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const dept = await selectById<Department>("departments", id);
  if (!dept) {
    res.status(404).json({ error: "Department not found" });
    return;
  }

  const memberCount = await count("users", { department_id: id });

  res.json({
    ...dept,
    memberCount,
    createdAt: dept.createdAt.toISOString(),
  });
});

router.patch("/departments/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const body = (req.body as Record<string, unknown>) ?? {};
  const updates: Record<string, unknown> = {};

  if ("name" in body) {
    if (typeof body.name !== "string" || (body.name as string).trim().length === 0) {
      res.status(400).json({ error: "Name must be a non-empty string" });
      return;
    }
    updates.name = (body.name as string).trim();
  }
  if ("description" in body) {
    updates.description = typeof body.description === "string" ? (body.description as string).trim() || null : null;
  }
  if ("routingMode" in body) {
    if (typeof body.routingMode !== "string" || !VALID_ROUTING_MODES.includes(body.routingMode as any)) {
      res.status(400).json({ error: "Routing mode must be one of: manual, round_robin" });
      return;
    }
    updates.routingMode = body.routingMode;
  }
  if ("isActive" in body) {
    if (typeof body.isActive !== "boolean") {
      res.status(400).json({ error: "isActive must be a boolean" });
      return;
    }
    updates.isActive = body.isActive;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const dept = await update<Department>("departments", id, updates);
  if (!dept) {
    res.status(404).json({ error: "Department not found" });
    return;
  }

  const memberCount = await count("users", { department_id: dept.id });

  res.json({
    ...dept,
    memberCount,
    createdAt: dept.createdAt.toISOString(),
  });
});

router.delete("/departments/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const dept = await del<Department>("departments", id);
  if (!dept) {
    res.status(404).json({ error: "Department not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
