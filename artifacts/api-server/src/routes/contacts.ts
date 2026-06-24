import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { db, contactsTable } from "@workspace/db";
import {
  ListContactsResponse,
  ListContactsQueryParams,
  CreateContactBody,
  GetContactParams,
  GetContactResponse,
  UpdateContactParams,
  UpdateContactBody,
  UpdateContactResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const toDto = (c: typeof contactsTable.$inferSelect) => ({
  ...c,
  createdAt: c.createdAt.toISOString(),
});

router.get("/contacts", async (req, res): Promise<void> => {
  const qp = ListContactsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }
  const { search, channelType } = qp.data;

  const conditions = [];
  if (search) conditions.push(ilike(contactsTable.name, `%${search}%`));
  if (channelType) conditions.push(eq(contactsTable.channelType, channelType as "whatsapp" | "instagram" | "facebook"));

  const contacts = conditions.length
    ? await db.select().from(contactsTable).where(and(...conditions)).orderBy(contactsTable.createdAt)
    : await db.select().from(contactsTable).orderBy(contactsTable.createdAt);

  res.json(ListContactsResponse.parse(contacts.map(toDto)));
});

router.post("/contacts", async (req, res): Promise<void> => {
  const parsed = CreateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [contact] = await db.insert(contactsTable).values(parsed.data).returning();
  res.status(201).json(GetContactResponse.parse(toDto(contact)));
});

router.get("/contacts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetContactParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, params.data.id));
  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  res.json(GetContactResponse.parse(toDto(contact)));
});

router.patch("/contacts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateContactParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [contact] = await db.update(contactsTable).set(parsed.data).where(eq(contactsTable.id, params.data.id)).returning();
  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  res.json(UpdateContactResponse.parse(toDto(contact)));
});

export default router;
