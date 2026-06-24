-- =============================================================================
-- OmniChat — Migration 003: Demo / Seed Data (OPTIONAL)
-- Created: 2026-06-24
-- Description: Loads realistic demo data for development, staging, or first
--              login demos. DO NOT run in production unless intentional.
--              All inserts use ON CONFLICT DO NOTHING so re-running is safe.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Departments
-- ---------------------------------------------------------------------------
INSERT INTO departments (name, description, routing_mode, is_active) VALUES
    ('Customer Support',  'Handle general customer inquiries and complaints',   'round_robin', TRUE),
    ('Sales',             'Handle pre-sales questions and lead qualification',  'manual',      TRUE),
    ('Technical Support', 'Handle product bugs and technical escalations',      'round_robin', TRUE),
    ('Finance & Billing', 'Handle billing disputes and payment questions',      'manual',      TRUE)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
INSERT INTO users (email, name, role, department_id, is_active) VALUES
    ('admin@omnichat.io',      'Alex Rivera',   'admin',      NULL,
        (SELECT id FROM departments WHERE name = 'Customer Support')),
    ('supervisor@omnichat.io', 'Morgan Chen',   'supervisor',
        (SELECT id FROM departments WHERE name = 'Customer Support'), TRUE),
    ('sarah.k@omnichat.io',    'Sarah Kim',     'agent',
        (SELECT id FROM departments WHERE name = 'Customer Support'), TRUE),
    ('james.w@omnichat.io',    'James Wong',    'agent',
        (SELECT id FROM departments WHERE name = 'Customer Support'), TRUE),
    ('priya.m@omnichat.io',    'Priya Mehta',   'agent',
        (SELECT id FROM departments WHERE name = 'Sales'),            TRUE),
    ('tom.h@omnichat.io',      'Tom Hassan',    'agent',
        (SELECT id FROM departments WHERE name = 'Technical Support'),TRUE),
    ('diana.r@omnichat.io',    'Diana Reyes',   'agent',
        (SELECT id FROM departments WHERE name = 'Finance & Billing'),TRUE)
ON CONFLICT (email) DO NOTHING;

-- Re-align admin's department (INSERT above has a correlated subquery issue for admin, fix here)
UPDATE users SET department_id = NULL WHERE email = 'admin@omnichat.io';

-- ---------------------------------------------------------------------------
-- Channels
-- ---------------------------------------------------------------------------
INSERT INTO channels (name, channel_type, phone_number, external_id, webhook_verify_token, is_active) VALUES
    ('WhatsApp Main',     'whatsapp', '+1 555 100 0001', 'waba_001', 'wh_verify_001',  TRUE),
    ('WhatsApp Support',  'whatsapp', '+1 555 100 0002', 'waba_002', 'wh_verify_002',  TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO channels (name, channel_type, page_id, external_id, webhook_verify_token, is_active) VALUES
    ('Instagram Official', 'instagram', 'ig_page_001', 'ig_001', 'ig_verify_001', TRUE),
    ('Facebook Page',      'facebook',  'fb_page_001', 'fb_001', 'fb_verify_001', TRUE)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Contacts
-- ---------------------------------------------------------------------------
INSERT INTO contacts (name, phone, email, channel_type, external_id) VALUES
    ('Emma Thompson',   '+44 20 7946 0001', 'emma.t@example.com',    'whatsapp',  'ext_emma'),
    ('Carlos Mendez',   '+52 55 1234 5678', NULL,                     'whatsapp',  'ext_carlos'),
    ('Aisha Patel',     '+91 98765 43210',  'aisha.p@example.com',   'instagram', 'ext_aisha'),
    ('Zara Ahmed',      '+971 50 123 4567', NULL,                     'facebook',  'ext_zara'),
    ('Lucas Fernandez', '+34 91 000 1234',  'lucas.f@example.com',   'whatsapp',  'ext_lucas'),
    ('Ethan Brooks',    '+1 212 555 0199',  'ethan.b@example.com',   'instagram', 'ext_ethan'),
    ('Sophie Laurent',  '+33 1 40 00 0001', 'sophie.l@example.com',  'facebook',  'ext_sophie'),
    ('David Kim',       '+82 10 1234 5678', NULL,                     'whatsapp',  'ext_david')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Conversations  (one per contact, using channel + agent references)
-- ---------------------------------------------------------------------------
WITH refs AS (
    SELECT
        c.id              AS contact_id,
        c.name            AS contact_name,
        c.channel_type,
        ch.id             AS channel_id,
        d.id              AS dept_id,
        u.id              AS agent_id
    FROM contacts c
    JOIN channels ch ON ch.channel_type = c.channel_type AND ch.is_active
    LEFT JOIN departments d ON d.name = CASE
        WHEN c.name IN ('Emma Thompson','Carlos Mendez','Lucas Fernandez','David Kim') THEN 'Customer Support'
        WHEN c.name IN ('Aisha Patel','Ethan Brooks') THEN 'Technical Support'
        WHEN c.name = 'Sophie Laurent' THEN 'Finance & Billing'
        ELSE 'Sales'
    END
    LEFT JOIN users u ON u.department_id = d.id AND u.role = 'agent'
                      AND u.is_active = TRUE
    WHERE c.external_id IN (
        'ext_emma','ext_carlos','ext_aisha','ext_zara',
        'ext_lucas','ext_ethan','ext_sophie','ext_david'
    )
    -- one channel per contact (pick the first match)
    AND ch.id = (
        SELECT id FROM channels WHERE channel_type = c.channel_type AND is_active LIMIT 1
    )
)
INSERT INTO conversations (contact_id, channel_id, channel_type, department_id, assigned_agent_id, status, last_message_at, unread_count)
SELECT
    r.contact_id,
    r.channel_id,
    r.channel_type,
    r.dept_id,
    r.agent_id,
    CASE r.contact_name
        WHEN 'Ethan Brooks'  THEN 'resolved'
        WHEN 'Zara Ahmed'    THEN 'pending'
        ELSE 'open'
    END,
    NOW() - (ROW_NUMBER() OVER (ORDER BY r.contact_name) * INTERVAL '2 hours'),
    CASE WHEN r.contact_name IN ('Emma Thompson','Aisha Patel','Lucas Fernandez') THEN 2 ELSE 0 END
FROM refs r
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Messages  (3 messages per conversation — a minimal realistic thread)
-- ---------------------------------------------------------------------------
INSERT INTO messages (conversation_id, sender_type, direction, content_type, content, sender_name, created_at)
SELECT
    conv.id,
    'contact',
    'inbound',
    'text',
    msg.content,
    cont.name,
    conv.last_message_at - (msg.offset_mins * INTERVAL '1 minute')
FROM conversations conv
JOIN contacts cont ON cont.id = conv.contact_id
CROSS JOIN (VALUES
    (1, 'Hi, I need some help with my recent order.'),
    (2, 'I haven''t received a response yet. Can someone assist?'),
    (3, 'Pls reply asap I really want it 😊')
) AS msg(offset_mins, content)
ON CONFLICT DO NOTHING;

COMMIT;
