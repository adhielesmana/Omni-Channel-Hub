-- =============================================================================
-- OmniChat — Migration 007: Add users.password_hash
-- Created: 2026-06-27
-- Description: Adds the password_hash column required by auth and user
--              management routes. Safe to run on databases created from the
--              initial schema that omitted this field.
-- =============================================================================

BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash TEXT;

COMMIT;
