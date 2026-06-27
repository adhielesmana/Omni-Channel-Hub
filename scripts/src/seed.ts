import { spawnSync } from "node:child_process";

const DEMO_PASSWORD_HASH = "$2a$10$hpwjKHjbWkQnk/1UA6KNAuoeYGsI3bVPi5Ko2DK/45op.LHcKZhs6";

function sqlString(value: string | null): string {
  if (value === null) {
    return "NULL";
  }
  return `'${value.replace(/'/g, "''")}'`;
}

function avatarDataUri(initials: string, background: string, foreground: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="48" fill="${background}"/><text x="48" y="58" font-size="42" text-anchor="middle" fill="${foreground}" font-family="Arial, sans-serif">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const departments = [
  {
    name: "Seed Helpdesk",
    description: "Seeded helpdesk team for local testing",
    routingMode: "manual",
  },
  {
    name: "Seed Sales",
    description: "Seeded sales team for local testing",
    routingMode: "manual",
  },
] as const;

const channels = [
  {
    name: "Seed WhatsApp Main",
    channelType: "whatsapp",
    phoneNumber: "+1 555 100 0001",
    externalId: "seed_waba_001",
    webhookVerifyToken: "seed_wh_verify_001",
  },
] as const;

const users = [
  {
    email: "seed.admin@omnichat.test",
    name: "Seed Admin",
    role: "admin",
    departmentName: null,
    avatarUrl: avatarDataUri("SA", "#eef2ff", "#4338ca"),
  },
  {
    email: "seed.afnan.helpdesk@omnichat.test",
    name: "Seed Afnan Helpdesk",
    role: "agent",
    departmentName: "Seed Helpdesk",
    avatarUrl: avatarDataUri("AH", "#dbeafe", "#1d4ed8"),
  },
  {
    email: "seed.adhie.helpdesk@omnichat.test",
    name: "Seed Adhie Helpdesk",
    role: "agent",
    departmentName: "Seed Helpdesk",
    avatarUrl: avatarDataUri("AD", "#dcfce7", "#166534"),
  },
  {
    email: "seed.sally.sales@omnichat.test",
    name: "Seed Sally Sales",
    role: "agent",
    departmentName: "Seed Sales",
    avatarUrl: avatarDataUri("SS", "#fce7f3", "#be185d"),
  },
] as const;

const contacts = [
  {
    name: "Seed Afnan Customer",
    phone: "+62 812 3456 7801",
    email: "afnan.customer@example.com",
    avatarUrl: avatarDataUri("A", "#e2e8f0", "#334155"),
    channelType: "whatsapp",
    externalId: "seed_afnan_customer",
  },
  {
    name: "Seed Unassigned Customer",
    phone: "+62 812 3456 7802",
    email: "unassigned.customer@example.com",
    avatarUrl: avatarDataUri("U", "#e0f2fe", "#075985"),
    channelType: "whatsapp",
    externalId: "seed_unassigned_customer",
  },
] as const;

const sql = `
BEGIN;

DELETE FROM messages
WHERE conversation_id IN (
  SELECT conversations.id
  FROM conversations
  JOIN contacts ON contacts.id = conversations.contact_id
  WHERE contacts.external_id IN (${contacts.map((contact) => sqlString(contact.externalId)).join(", ")})
    AND contacts.channel_type = 'whatsapp'
);

DELETE FROM conversations
WHERE contact_id IN (
  SELECT id
  FROM contacts
  WHERE external_id IN (${contacts.map((contact) => sqlString(contact.externalId)).join(", ")})
    AND channel_type = 'whatsapp'
);

DELETE FROM contacts
WHERE external_id IN (${contacts.map((contact) => sqlString(contact.externalId)).join(", ")})
  AND channel_type = 'whatsapp';

DELETE FROM users
WHERE email IN (${users.map((user) => sqlString(user.email)).join(", ")});

DELETE FROM channels
WHERE external_id IN (${channels.map((channel) => sqlString(channel.externalId)).join(", ")});

DELETE FROM departments
WHERE name IN (${departments.map((department) => sqlString(department.name)).join(", ")});

SELECT setval(
  pg_get_serial_sequence('departments', 'id'),
  COALESCE((SELECT MAX(id) FROM departments), 1),
  EXISTS(SELECT 1 FROM departments)
);

SELECT setval(
  pg_get_serial_sequence('users', 'id'),
  COALESCE((SELECT MAX(id) FROM users), 1),
  EXISTS(SELECT 1 FROM users)
);

SELECT setval(
  pg_get_serial_sequence('channels', 'id'),
  COALESCE((SELECT MAX(id) FROM channels), 1),
  EXISTS(SELECT 1 FROM channels)
);

SELECT setval(
  pg_get_serial_sequence('contacts', 'id'),
  COALESCE((SELECT MAX(id) FROM contacts), 1),
  EXISTS(SELECT 1 FROM contacts)
);

SELECT setval(
  pg_get_serial_sequence('conversations', 'id'),
  COALESCE((SELECT MAX(id) FROM conversations), 1),
  EXISTS(SELECT 1 FROM conversations)
);

SELECT setval(
  pg_get_serial_sequence('messages', 'id'),
  COALESCE((SELECT MAX(id) FROM messages), 1),
  EXISTS(SELECT 1 FROM messages)
);

INSERT INTO departments (name, description, routing_mode, is_active) VALUES
${departments
  .map((department) => `  (${sqlString(department.name)}, ${sqlString(department.description)}, ${sqlString(department.routingMode)}, TRUE)`)
  .join(",\n")};

INSERT INTO channels (name, channel_type, phone_number, external_id, webhook_verify_token, is_active) VALUES
${channels
  .map((channel) => `  (${sqlString(channel.name)}, ${sqlString(channel.channelType)}, ${sqlString(channel.phoneNumber)}, ${sqlString(channel.externalId)}, ${sqlString(channel.webhookVerifyToken)}, TRUE)`)
  .join(",\n")};

INSERT INTO users (email, name, role, department_id, avatar_url, password_hash, is_active) VALUES
${users
  .map((user) => {
    const departmentSql = user.departmentName
      ? `(SELECT id FROM departments WHERE name = ${sqlString(user.departmentName)} LIMIT 1)`
      : "NULL";
    return `  (${sqlString(user.email)}, ${sqlString(user.name)}, ${sqlString(user.role)}, ${departmentSql}, ${sqlString(user.avatarUrl)}, ${sqlString(DEMO_PASSWORD_HASH)}, TRUE)`;
  })
  .join(",\n")};

INSERT INTO contacts (name, phone, email, avatar_url, channel_type, external_id) VALUES
${contacts
  .map((contact) => `  (${sqlString(contact.name)}, ${sqlString(contact.phone)}, ${sqlString(contact.email)}, ${sqlString(contact.avatarUrl)}, ${sqlString(contact.channelType)}, ${sqlString(contact.externalId)})`)
  .join(",\n")};

INSERT INTO conversations (contact_id, channel_id, channel_type, department_id, assigned_agent_id, status, last_message_at, unread_count) VALUES
  (
    (SELECT id FROM contacts WHERE external_id = ${sqlString("seed_afnan_customer")} AND channel_type = 'whatsapp' LIMIT 1),
    (SELECT id FROM channels WHERE external_id = ${sqlString("seed_waba_001")} LIMIT 1),
    'whatsapp',
    (SELECT id FROM departments WHERE name = ${sqlString("Seed Helpdesk")} LIMIT 1),
    (SELECT id FROM users WHERE email = ${sqlString("seed.afnan.helpdesk@omnichat.test")} LIMIT 1),
    'open',
    NOW() - INTERVAL '2 hours',
    2
  ),
  (
    (SELECT id FROM contacts WHERE external_id = ${sqlString("seed_unassigned_customer")} AND channel_type = 'whatsapp' LIMIT 1),
    (SELECT id FROM channels WHERE external_id = ${sqlString("seed_waba_001")} LIMIT 1),
    'whatsapp',
    NULL,
    NULL,
    'open',
    NOW() - INTERVAL '30 minutes',
    0
  );

INSERT INTO messages (conversation_id, sender_type, direction, content_type, content, sender_name, created_at) VALUES
  (
    (SELECT id FROM conversations WHERE contact_id = (SELECT id FROM contacts WHERE external_id = ${sqlString("seed_afnan_customer")} LIMIT 1) LIMIT 1),
    'contact',
    'inbound',
    'text',
    ${sqlString("Hi, I need help with my recent order.")},
    ${sqlString("Seed Afnan Customer")},
    NOW() - INTERVAL '2 hours 5 minutes'
  ),
  (
    (SELECT id FROM conversations WHERE contact_id = (SELECT id FROM contacts WHERE external_id = ${sqlString("seed_unassigned_customer")} LIMIT 1) LIMIT 1),
    'contact',
    'inbound',
    'text',
    ${sqlString("Can someone assist me with a billing question?")},
    ${sqlString("Seed Unassigned Customer")},
    NOW() - INTERVAL '25 minutes'
  );

COMMIT;
`;

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before running the seed script.");
}

const result = spawnSync(
  "psql",
  ["-X", "-v", "ON_ERROR_STOP=1", databaseUrl],
  {
    input: sql,
    encoding: "utf8",
  },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  const stderr = result.stderr.trim();
  const stdout = result.stdout.trim();
  throw new Error(`Seed failed.\n${stdout ? `${stdout}\n` : ""}${stderr}`);
}

console.log("Seeded the OmniChat demo fixture.");
console.log("Log in with:");
console.log("  seed.admin@omnichat.test / demo");
console.log("  seed.afnan.helpdesk@omnichat.test / demo");
console.log("  seed.adhie.helpdesk@omnichat.test / demo");
console.log("  seed.sally.sales@omnichat.test / demo");
