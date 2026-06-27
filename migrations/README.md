# OmniChat — Database Migrations

## Files

| File | Description |
|---|---|
| `001_initial_schema.sql` | Full schema — all 6 tables, indexes, FK constraints |
| `002_updated_at_trigger.sql` | Trigger that auto-updates `updated_at` on every row change |
| `003_seed_demo_data.sql` | Optional demo data (departments, users, channels, contacts, conversations, messages) |
| `007_add_users_password_hash.sql` | Adds `users.password_hash` for auth and user management |

## How to run

For local testing, prefer the scripted fixture:
```bash
pnpm --filter @workspace/scripts run seed
```

### First install (empty database)
```bash
psql "$DATABASE_URL" -f migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f migrations/002_updated_at_trigger.sql
# Optional demo data:
psql "$DATABASE_URL" -f migrations/003_seed_demo_data.sql
```

### Docker Compose
```bash
docker compose exec api psql "$DATABASE_URL" -f /app/migrations/001_initial_schema.sql
docker compose exec api psql "$DATABASE_URL" -f /app/migrations/002_updated_at_trigger.sql
```
Or let the `db-migrate` init container handle it automatically (see INSTALL.md).

## Rules
- Migrations are numbered sequentially (`001_`, `002_`, …)
- Every migration is wrapped in `BEGIN; … COMMIT;`
- All `CREATE TABLE` / `CREATE INDEX` statements use `IF NOT EXISTS` — safe to re-run
- Never modify an already-applied migration; add a new file instead
- New schema changes go in the next numbered file (e.g. `004_add_labels.sql`)
