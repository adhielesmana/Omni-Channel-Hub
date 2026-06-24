# OmniChat — Update Guide (Docker)

How to safely update a running OmniChat instance on a VM with zero data loss.

---

## Table of Contents

1. [Before You Update](#before-you-update)
2. [Update Types](#update-types)
3. [Standard Update (no schema changes)](#standard-update-no-schema-changes)
4. [Update with Database Migration](#update-with-database-migration)
5. [Rollback](#rollback)
6. [Environment Variable Changes](#environment-variable-changes)
7. [Nginx Config Changes](#nginx-config-changes)
8. [Update Checklist](#update-checklist)
9. [Automating Updates](#automating-updates)

---

## Before You Update

Always take a backup before any update:

```bash
# Backup the database
docker compose exec -e PGPASSWORD=$POSTGRES_PASSWORD postgres \
    pg_dump -U omnichat -d omnichat --clean --if-exists \
    > /opt/omnichat/backups/omnichat_$(date +%Y%m%d_%H%M%S).sql

# Create the backups directory if needed
mkdir -p /opt/omnichat/backups
```

Keep at least the last 3 backups:
```bash
ls -t /opt/omnichat/backups/*.sql | tail -n +4 | xargs -r rm
```

---

## Update Types

| Type | When | Steps |
|---|---|---|
| **App-only** | New features, bug fixes, no DB changes | Pull → restart API + frontend |
| **Schema migration** | New tables, columns, indexes | Pull → run migration SQL → restart |
| **Config change** | `.env` edits, Nginx config | Edit file → restart affected service |
| **Full update** | Major release | Backup → migrate → pull → restart all |

---

## Standard Update (no schema changes)

Use this for most releases — new features and bug fixes that don't change the database.

### With pre-built images (CI/CD)

```bash
cd /opt/omnichat

# 1. Pull new images
docker compose pull api frontend

# 2. Recreate only the changed containers (zero-downtime for the other services)
docker compose up -d --no-deps api frontend

# 3. Verify
docker compose ps
curl -s http://localhost/api/healthz
```

### Building from source on the VM

```bash
cd /opt/omnichat/src

# 1. Pull latest source
git pull origin main

# 2. Copy updated migration files
cp migrations/*.sql /opt/omnichat/migrations/

# 3. Rebuild images
docker build -f Dockerfile.api      -t omnichat-api:latest      .
docker build -f Dockerfile.frontend -t omnichat-frontend:latest  .

# 4. Restart containers with new images
cd /opt/omnichat
docker compose up -d --no-deps api frontend

# 5. Verify
docker compose ps
curl -s http://localhost/api/healthz
```

---

## Update with Database Migration

Use this when a new release includes changes to `migrations/` (new SQL files).

```bash
cd /opt/omnichat/src

# 1. Check git log for what changed
git fetch origin
git log origin/main --oneline -10

# 2. Back up the database FIRST
docker compose -f /opt/omnichat/docker-compose.yml exec \
    -e PGPASSWORD=$POSTGRES_PASSWORD postgres \
    pg_dump -U omnichat -d omnichat --clean --if-exists \
    > /opt/omnichat/backups/pre_update_$(date +%Y%m%d_%H%M%S).sql

# 3. Pull source
git pull origin main
cp migrations/*.sql /opt/omnichat/migrations/

# 4. Apply only the NEW migration files
#    (replace 004 with the actual new file number)
docker compose -f /opt/omnichat/docker-compose.yml exec \
    -e PGPASSWORD=$POSTGRES_PASSWORD postgres \
    psql -U omnichat -d omnichat -f /dev/stdin \
    < /opt/omnichat/migrations/004_your_new_migration.sql

# 5. Rebuild and restart
docker build -f Dockerfile.api      -t omnichat-api:latest      .
docker build -f Dockerfile.frontend -t omnichat-frontend:latest  .

cd /opt/omnichat
docker compose up -d --no-deps api frontend

# 6. Verify
docker compose logs -f api
curl -s http://localhost/api/healthz
```

### How to identify which migrations are new

Compare the migration files in the repo against what the DB currently has. A simple tracking approach — keep a `migrations/applied.txt` file and add each filename after applying:

```bash
echo "004_your_new_migration.sql" >> /opt/omnichat/migrations/applied.txt
```

Or query the DB directly to confirm new tables/columns exist:
```bash
docker compose exec postgres psql -U omnichat -d omnichat -c "\dt"
docker compose exec postgres psql -U omnichat -d omnichat -c "\d conversations"
```

---

## Rollback

### App rollback (no schema change)

If the new image is broken, switch back to the previous tag:

```bash
cd /opt/omnichat

# Update IMAGE_TAG in .env to the previous version
nano .env
# → IMAGE_TAG=v1.2.3   (the last known-good tag)

docker compose pull api frontend
docker compose up -d --no-deps api frontend
```

If you built locally, rebuild from the previous commit:
```bash
cd /opt/omnichat/src
git checkout <previous-commit-sha>
docker build -f Dockerfile.api      -t omnichat-api:latest      .
docker build -f Dockerfile.frontend -t omnichat-frontend:latest  .
cd /opt/omnichat
docker compose up -d --no-deps api frontend
```

### Full rollback (with schema change)

If a migration caused data corruption or the app won't start:

```bash
cd /opt/omnichat

# 1. Stop the API (leave Postgres running)
docker compose stop api frontend

# 2. Restore the pre-update backup
BACKUP_FILE=/opt/omnichat/backups/pre_update_YYYYMMDD_HHMMSS.sql

docker compose exec -e PGPASSWORD=$POSTGRES_PASSWORD postgres \
    psql -U omnichat -d omnichat < $BACKUP_FILE

# 3. Roll back the source
cd /opt/omnichat/src
git checkout <previous-commit-sha>

# 4. Rebuild with old source
docker build -f Dockerfile.api      -t omnichat-api:latest      .
docker build -f Dockerfile.frontend -t omnichat-frontend:latest  .

# 5. Restart
cd /opt/omnichat
docker compose up -d --no-deps api frontend
```

---

## Environment Variable Changes

After editing `/opt/omnichat/.env`:

```bash
cd /opt/omnichat

# Restart only the services that use the changed variable
# (api uses DATABASE_URL and SESSION_SECRET)
docker compose up -d --no-deps --force-recreate api

# If POSTGRES_PASSWORD changed, you must also recreate postgres
# WARNING: this requires the volume data to match the new password
docker compose up -d --no-deps --force-recreate postgres api
```

> **Note:** Changing `POSTGRES_PASSWORD` after the database is initialized requires also updating the password inside Postgres:
> ```sql
> ALTER USER omnichat WITH PASSWORD 'new_password';
> ```
> Then update `.env` and recreate the `postgres` and `api` containers.

---

## Nginx Config Changes

After editing `/opt/omnichat/nginx/omnichat.conf`:

```bash
cd /opt/omnichat

# Test the config first (catches syntax errors before reloading)
docker compose exec nginx nginx -t

# Reload without downtime
docker compose exec nginx nginx -s reload
```

If the config fails to load and Nginx crashes, restart the container:
```bash
docker compose restart nginx
```

---

## Update Checklist

Use this checklist for any production update:

```
□ 1. Read the release notes / git log for the new version
□ 2. Identify whether schema migrations are included
□ 3. Back up the database
      docker compose exec postgres pg_dump ... > backups/pre_update_$(date +%Y%m%d).sql
□ 4. Pull new source (git pull) or new images (docker compose pull)
□ 5. Copy new migration files to /opt/omnichat/migrations/
□ 6. Apply only NEW migration SQL files (in order)
□ 7. Build new images (if building from source)
□ 8. Restart affected services: docker compose up -d --no-deps api frontend
□ 9. Check health: curl http://localhost/api/healthz
□ 10. Tail logs for 2 minutes: docker compose logs -f api
□ 11. Do a quick smoke test in the browser (open inbox, send a message)
□ 12. Record the applied migration filenames in migrations/applied.txt
```

---

## Automating Updates

### Simple update script

Save as `/opt/omnichat/update.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

COMPOSE_DIR="/opt/omnichat"
SRC_DIR="/opt/omnichat/src"
BACKUP_DIR="/opt/omnichat/backups"

echo "=== OmniChat Update Script ==="
echo "$(date)"

# Load env
source "$COMPOSE_DIR/.env"

# 1. Backup
mkdir -p "$BACKUP_DIR"
echo "[1/5] Backing up database..."
docker compose -f "$COMPOSE_DIR/docker-compose.yml" exec \
    -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
    > "$BACKUP_DIR/omnichat_$(date +%Y%m%d_%H%M%S).sql"
echo "      Backup saved."

# 2. Pull source
echo "[2/5] Pulling latest source..."
git -C "$SRC_DIR" pull origin main
cp "$SRC_DIR/migrations/"*.sql "$COMPOSE_DIR/migrations/"

# 3. Build images
echo "[3/5] Building images..."
docker build -f "$SRC_DIR/Dockerfile.api"      -t omnichat-api:latest      "$SRC_DIR"
docker build -f "$SRC_DIR/Dockerfile.frontend" -t omnichat-frontend:latest  "$SRC_DIR"

# 4. Restart app containers (Postgres stays running)
echo "[4/5] Restarting services..."
docker compose -f "$COMPOSE_DIR/docker-compose.yml" up -d --no-deps api frontend

# 5. Health check
echo "[5/5] Checking health..."
sleep 10
STATUS=$(curl -sf http://localhost/api/healthz | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "error")
if [ "$STATUS" = "ok" ]; then
    echo "✅  Update complete. API is healthy."
else
    echo "❌  Health check failed. Status: $STATUS"
    echo "    Run: docker compose logs api"
    exit 1
fi

# Keep only the 5 most recent backups
ls -t "$BACKUP_DIR"/*.sql | tail -n +6 | xargs -r rm
echo "    Old backups pruned."
```

Make it executable:
```bash
chmod +x /opt/omnichat/update.sh
```

Run an update:
```bash
/opt/omnichat/update.sh
```

### Scheduled auto-updates (optional)

```bash
# Run update every Sunday at 2 AM, log to file
echo "0 2 * * 0 root /opt/omnichat/update.sh >> /var/log/omnichat-update.log 2>&1" \
    | sudo tee /etc/cron.d/omnichat-update
```

> Only enable auto-updates if you have staging validation and migration review in place. For production with real customer data, prefer manual updates.

---

## Quick Reference

```bash
# Standard app update (no schema change)
cd /opt/omnichat && docker compose pull api frontend && docker compose up -d --no-deps api frontend

# Apply a specific migration
docker compose exec -e PGPASSWORD=$POSTGRES_PASSWORD postgres \
    psql -U omnichat -d omnichat -f /dev/stdin < migrations/004_example.sql

# Check health
curl -s http://localhost/api/healthz

# Live API logs
docker compose logs -f api

# Full restart (all services)
docker compose down && docker compose up -d

# Database shell
docker compose exec postgres psql -U omnichat -d omnichat
```
