-- =============================================================================
-- OmniChat — Migration 001: Initial Schema
-- Created: 2026-06-24
-- Description: Full initial database schema — all tables created from scratch.
--              Safe to run on an empty database.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- departments
-- Must exist before users (FK: users.department_id → departments.id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
    id            SERIAL PRIMARY KEY,
    name          TEXT        NOT NULL,
    description   TEXT,
    routing_mode  TEXT        NOT NULL DEFAULT 'manual'
                  CHECK (routing_mode IN ('manual', 'round_robin')),
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments (is_active);

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         TEXT        NOT NULL UNIQUE,
    name          TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'agent'
                  CHECK (role IN ('admin', 'supervisor', 'agent')),
    department_id INTEGER     REFERENCES departments (id) ON DELETE SET NULL,
    avatar_url    TEXT,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email       ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_department  ON users (department_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active   ON users (is_active);

-- ---------------------------------------------------------------------------
-- channels
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channels (
    id                   SERIAL PRIMARY KEY,
    name                 TEXT        NOT NULL,
    channel_type         TEXT        NOT NULL
                         CHECK (channel_type IN ('whatsapp', 'instagram', 'facebook')),
    external_id          TEXT,
    phone_number         TEXT,
    page_id              TEXT,
    access_token         TEXT,
    webhook_verify_token TEXT,
    is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channels_type      ON channels (channel_type);
CREATE INDEX IF NOT EXISTS idx_channels_is_active ON channels (is_active);

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
    id            SERIAL PRIMARY KEY,
    name          TEXT        NOT NULL,
    phone         TEXT,
    email         TEXT,
    avatar_url    TEXT,
    channel_type  TEXT        NOT NULL
                  CHECK (channel_type IN ('whatsapp', 'instagram', 'facebook')),
    external_id   TEXT        NOT NULL,
    custom_fields TEXT,                          -- JSON blob
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_external_id  ON contacts (external_id);
CREATE INDEX IF NOT EXISTS idx_contacts_channel_type ON contacts (channel_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_ext_channel
    ON contacts (external_id, channel_type);

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
    id                SERIAL PRIMARY KEY,
    contact_id        INTEGER     NOT NULL REFERENCES contacts      (id) ON DELETE CASCADE,
    channel_id        INTEGER     NOT NULL REFERENCES channels      (id) ON DELETE RESTRICT,
    channel_type      TEXT        NOT NULL
                      CHECK (channel_type IN ('whatsapp', 'instagram', 'facebook')),
    department_id     INTEGER     REFERENCES departments (id) ON DELETE SET NULL,
    assigned_agent_id INTEGER     REFERENCES users       (id) ON DELETE SET NULL,
    status            TEXT        NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'pending', 'resolved', 'snoozed')),
    subject           TEXT,
    last_message_at   TIMESTAMPTZ,
    unread_count      INTEGER     NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_contact     ON conversations (contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel     ON conversations (channel_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status      ON conversations (status);
CREATE INDEX IF NOT EXISTS idx_conversations_department  ON conversations (department_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent       ON conversations (assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg    ON conversations (last_message_at DESC);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id                  SERIAL PRIMARY KEY,
    conversation_id     INTEGER     NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    sender_type         TEXT        NOT NULL
                        CHECK (sender_type IN ('contact', 'agent', 'system')),
    sender_id           INTEGER     REFERENCES users (id) ON DELETE SET NULL,
    direction           TEXT        NOT NULL
                        CHECK (direction IN ('inbound', 'outbound')),
    content_type        TEXT        NOT NULL DEFAULT 'text'
                        CHECK (content_type IN (
                            'text', 'image', 'video', 'audio', 'document',
                            'location', 'sticker', 'template', 'note'
                        )),
    content             TEXT,
    media_url           TEXT,
    media_type          TEXT,
    is_read             BOOLEAN     NOT NULL DEFAULT FALSE,
    external_message_id TEXT,
    metadata            TEXT,                       -- JSON blob
    sender_name         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created      ON messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_ext_id       ON messages (external_message_id)
    WHERE external_message_id IS NOT NULL;

COMMIT;
