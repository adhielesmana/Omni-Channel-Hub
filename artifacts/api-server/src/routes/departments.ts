import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, departmentsTable, usersTable } from "@workspace/db";
import {
  ListDepartmentsResponse,
  CreateDepartmentBody,
  GetDepartmentParams,
  GetDepartmentResponse,
  UpdateDepartmentParams,
  UpdateDepartmentBody,
  UpdateDepartmentResponse,
  DeleteDepartmentParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/departments", requireAuth, async (req, res): Promise<void> => {
  const departments = await db.select().from(departmentsTable).orderBy(departmentsTable.createdAt);

  const memberCounts = await db
    .select({ departmentId: usersTable.departmentId, count: count() })
    .from(usersTable)
    .groupBy(usersTable.departmentId);

  const countMap = new Map(memberCounts.map(r => [r.departmentId, Number(r.count)]));

  const result = departments.map(d => ({
    ...d,
    memberCount: countMap.get(d.id) ?? 0,
    createdAt: d.createdAt.toISOString(),
  }));

  res.json(ListDepartmentsResponse.parse(result));
});

router.post("/departments", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDepartmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [dept] = await db.insert(departmentsTable).values(parsed.data).returning();
  res.status(201).json(GetDepartmentResponse.parse({ ...dept, memberCount: 0, createdAt: dept.createdAt.toISOString() }));
});

router.get("/departments/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetDepartmentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, params.data.id));
  if (!dept) {
    res.status(404).json({ error: "Department not found" });
    return;
  }
  const [memberResult] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(eq(usersTable.departmentId, dept.id));
  res.json(GetDepartmentResponse.parse({ ...dept, memberCount: Number(memberResult?.count ?? 0), createdAt: dept.createdAt.toISOString() }));
});

router.patch("/departments/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateDepartmentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDepartmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [dept] = await db.update(departmentsTable).set(parsed.data).where(eq(departmentsTable.id, params.data.id)).returning();
  if (!dept) {
    res.status(404).json({ error: "Department not found" });
    return;
  }
  const [memberResult] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.departmentId, dept.id));
  res.json(UpdateDepartmentResponse.parse({ ...dept, memberCount: Number(memberResult?.count ?? 0), createdAt: dept.createdAt.toISOString() }));
});

router.delete("/departments/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteDepartmentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [dept] = await db.delete(departmentsTable).where(eq(departmentsTable.id, params.data.id)).returning();
  if (!dept) {
    res.status(404).json({ error: "Department not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
