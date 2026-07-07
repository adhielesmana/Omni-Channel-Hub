import { Router, type IRouter } from "express";
import { eq, ilike, and, inArray } from "drizzle-orm";
import { db, contactsTable } from "@workspace/db";
import { toTitleCase } from "../lib/string";
import { requireAuth } from "../middlewares/auth";
import {
  ListContactsResponse,
  ListContactsQueryParams,
  CreateContactBody,
  GetContactParams,
  GetContactResponse,
  UpdateContactParams,
  UpdateContactBody,
  UpdateContactResponse,
  ImportContactsBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const toDto = (c: typeof contactsTable.$inferSelect) => ({
  ...c,
  createdAt: c.createdAt.toISOString(),
});

router.get("/contacts", requireAuth, async (req, res): Promise<void> => {
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

router.post("/contacts", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [contact] = await db.insert(contactsTable).values({ ...parsed.data, name: toTitleCase(parsed.data.name) }).returning();
  res.status(201).json(GetContactResponse.parse(toDto(contact)));
});

router.post("/contacts/import", requireAuth, async (req, res): Promise<void> => {
  const parsed = ImportContactsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { channelType, contacts: importContacts } = parsed.data;
  let created = 0;
  let updated = 0;
  const errors: { row: number; message: string }[] = [];

  // Extract all phone numbers from the import
  const phoneNumbers = importContacts.map((c: { phone: string }) => c.phone).filter(Boolean);

  // Find existing contacts with these phone numbers
  const existingContacts = phoneNumbers.length > 0
    ? await db.select().from(contactsTable).where(
        and(
          eq(contactsTable.channelType, channelType),
          inArray(contactsTable.phone, phoneNumbers)
        )
      )
    : [];

  // Create a map of existing contacts by phone number
  const existingByPhone = new Map(existingContacts.map((c: typeof contactsTable.$inferSelect) => [c.phone, c]));

  // Process each contact
  for (let i = 0; i < importContacts.length; i++) {
    const row = importContacts[i];
    const rowNum = i + 2; // Excel rows start at 2 (1 is header)

    try {
      const existingContact = existingByPhone.get(row.phone);

      if (existingContact) {
        // Update name if different
        if (existingContact.name !== toTitleCase(row.name)) {
          await db.update(contactsTable)
            .set({ name: toTitleCase(row.name) })
            .where(eq(contactsTable.id, existingContact.id));
          updated++;
        }
      } else {
        // Create new contact
        await db.insert(contactsTable).values({
          name: toTitleCase(row.name),
          phone: row.phone,
          email: row.email || null,
          channelType: channelType,
          externalId: row.phone, // Use phone as externalId for manual imports
        });
        created++;
      }
    } catch (err) {
      errors.push({
        row: rowNum,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  res.json({ created, updated, errors });
});

router.get("/contacts/:id", requireAuth, async (req, res): Promise<void> => {
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

router.patch("/contacts/:id", requireAuth, async (req, res): Promise<void> => {
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
  const data = parsed.data.name ? { ...parsed.data, name: toTitleCase(parsed.data.name) } : parsed.data;
  const [contact] = await db.update(contactsTable).set(data).where(eq(contactsTable.id, params.data.id)).returning();
  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  res.json(UpdateContactResponse.parse(toDto(contact)));
});

export default router;
