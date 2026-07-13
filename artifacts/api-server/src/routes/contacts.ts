import { Router } from "../lib/http-kit";
import { selectAll, selectWhere, selectRaw, insert, update } from "@workspace/db";
import type { Contact } from "@workspace/db";
import { toTitleCase } from "../lib/string";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function toDto(c: Contact) {
  return { ...c, createdAt: c.createdAt.toISOString() };
}

router.get("/contacts", requireAuth, async (req, res): Promise<void> => {
  const search = req.query.search as string | undefined;
  const channelType = req.query.channelType as string | undefined;

  let contacts: Contact[];
  if (search && channelType) {
    contacts = await selectRaw<Contact>(
      `SELECT * FROM contacts WHERE channel_type = $1 AND (name ILIKE $2 OR phone ILIKE $2) ORDER BY created_at`,
      [channelType, `%${search}%`],
    );
  } else if (search) {
    contacts = await selectRaw<Contact>(
      `SELECT * FROM contacts WHERE name ILIKE $1 OR phone ILIKE $1 ORDER BY created_at`,
      [`%${search}%`],
    );
  } else if (channelType) {
    contacts = await selectRaw<Contact>(
      `SELECT * FROM contacts WHERE channel_type = $1 ORDER BY created_at`,
      [channelType],
    );
  } else {
    contacts = await selectAll<Contact>("contacts", { column: "created_at", dir: "ASC" });
  }

  res.json(contacts.map(toDto));
});

router.post("/contacts", requireAuth, async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone : null;
  const email = typeof body.email === "string" ? body.email : null;
  const channelType = typeof body.channelType === "string" ? body.channelType : null;

  if (!name || !channelType || !phone) {
    res.status(400).json({ error: "name, channelType, and phone are required" });
    return;
  }

  const contact = await insert<Contact>("contacts", {
    name: toTitleCase(name),
    phone,
    email,
    channelType,
    externalId: phone,
  });

  res.status(201).json(toDto(contact));
});

router.post("/contacts/import", requireAuth, async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const channelType = typeof body.channelType === "string" ? body.channelType : null;
  const importContacts = Array.isArray(body.contacts) ? body.contacts as Array<Record<string, unknown>> : [];

  if (!channelType || importContacts.length === 0) {
    res.status(400).json({ error: "channelType and contacts array are required" });
    return;
  }

  let created = 0;
  let updated = 0;
  const errors: { row: number; message: string }[] = [];

  const phoneNumbers = importContacts
    .map((c) => typeof c.phone === "string" ? c.phone : "")
    .filter(Boolean);

  const existingContacts = phoneNumbers.length > 0
    ? await selectRaw<Contact>(
        `SELECT * FROM contacts WHERE channel_type = $1 AND phone = ANY($2)`,
        [channelType, phoneNumbers],
      )
    : [];

  const existingByPhone = new Map(existingContacts.map((c) => [c.phone, c]));

  for (let i = 0; i < importContacts.length; i++) {
    const row = importContacts[i]!;
    const rowNum = i + 2;

    try {
      const phone = typeof row.phone === "string" ? row.phone : "";
      if (!phone) {
        errors.push({ row: rowNum, message: "Phone is required" });
        continue;
      }

      const existingContact = existingByPhone.get(phone);

      if (existingContact) {
        const newName = typeof row.name === "string" ? toTitleCase(row.name) : "";
        if (newName && existingContact.name !== newName) {
          await update("contacts", existingContact.id, { name: newName });
          updated++;
        }
      } else {
        await insert("contacts", {
          name: typeof row.name === "string" ? toTitleCase(row.name) : "Unknown",
          phone,
          email: typeof row.email === "string" ? row.email : null,
          channelType,
          externalId: phone,
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
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [contact] = await selectRaw<Contact>(
    `SELECT * FROM contacts WHERE id = $1`,
    [id],
  );
  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  res.json(toDto(contact));
});

router.patch("/contacts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = toTitleCase(body.name);
  if (typeof body.phone === "string") data.phone = body.phone;
  if (typeof body.email === "string") data.email = body.email;

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const contact = await update<Contact>("contacts", id, data);
  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  res.json(toDto(contact));
});

export default router;
