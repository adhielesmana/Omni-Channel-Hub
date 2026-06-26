---
name: Dev DB schema drift
description: Diagnosing/fixing the Replit dev Postgres drifting behind the lib/db Drizzle schema.
---

The Replit **dev** Postgres (`DATABASE_URL`) can fall behind the `lib/db/src/schema/*` Drizzle definitions when columns are added to the schema but never pushed to dev.

**Symptom:** an endpoint 500s with `Error: Failed query: select "...col..." from "<table>" ...` — and crucially it fails on **only the one drifted table** while other endpoints (users, departments, contacts) still return 200/304. Drizzle selects every schema column by name, so one missing column breaks just the queries touching that table (e.g. `buildConversationDto` in conversations.ts selects `channels` then `messages`, so it surfaces drift one table at a time).

**Fix:** add the missing column(s) directly — `ALTER TABLE <t> ADD COLUMN IF NOT EXISTS <col> <type> [NOT NULL DEFAULT ...];` matching the schema — or run `pnpm --filter @workspace/db run push` (use `push-force` script to skip prompts). Then restart the api workflow so pooled connections re-prepare statements. Verify by re-querying information_schema.columns against the schema file.

**Why it matters:** this is dev-environment state, not a code bug — production has its own migrated DB and is unaffected. Don't "fix" route code for it; sync the dev schema.
