-- =============================================================================
-- OmniChat — Migration 002: Auto-update updated_at via trigger
-- Created: 2026-06-24
-- Description: Installs a single trigger function that keeps the updated_at
--              column current on every UPDATE, matching Drizzle's
--              .$onUpdate(() => new Date()) behaviour for server-managed DBs.
-- =============================================================================

BEGIN;

-- Reusable trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to every table that has an updated_at column
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'departments',
        'users',
        'channels',
        'contacts',
        'conversations'
    ]
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_set_updated_at ON %I;
             CREATE TRIGGER trg_set_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
            tbl, tbl
        );
    END LOOP;
END;
$$;

COMMIT;
