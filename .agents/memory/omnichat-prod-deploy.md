---
name: OmniChat production deployment
description: How OmniChat production is hosted and the deploy runbook + footguns (self-hosted Docker Compose VM, not Replit Deployments).
---

OmniChat production is a **self-hosted Docker Compose VM** at `root@202.10.40.78` (ssh key auth), app dir `/opt/omnichat`. It is NOT a Replit Deployment. Compose file `docker-compose.prod.yml`, services: `postgres`, `db-migrate`, `api`, `frontend`, `nginx`. Images built from source via `Dockerfile.api` / `Dockerfile.frontend` (both COPY `lib/` + `artifacts/<x>/`; api runtime WORKDIR `/app`, run `node artifacts/api-server/dist/index.mjs`).

## Deploy runbook
1. `scp` changed source files to `/opt/omnichat/...` (mirror the repo path).
2. Edit `docker-compose.prod.yml` if env/volumes changed.
3. Build image(s): `docker build -f Dockerfile.<x> -t omnichat-<x>:latest --no-cache .`
4. `docker compose -f docker-compose.prod.yml --env-file .env up -d --force-recreate <svc>`
5. **Restart nginx** (see footgun): `docker compose ... restart nginx`
6. Verify: `curl -sk https://202.10.40.78/api/healthz` (200), frontend bundle hash, feature-specific checks.

## Footguns (the "why")
- **Always restart nginx after recreating `api` or `frontend`.** nginx caches upstream container IPs at startup; recreated containers get new IPs, so requests hit dead IPs → 502 until nginx restarts. This caused a production 502 once.
- **SSH connections reset intermittently** ("Connection closed by ... port 22", exit 255). Retry is usually fine. For long `--no-cache` builds, run **detached** so a mid-build drop doesn't waste the work: `nohup bash -c '<build> && touch /tmp/OK || touch /tmp/FAIL' > /tmp/build.log 2>&1 < /dev/null &` then poll the marker + log.
- `--force-recreate <svc>` may also recreate `postgres`/`db-migrate` if the compose config hash changed, but `postgres_data` is a named volume so data persists; `db-migrate` SQL is idempotent.
- Media files persist via host bind mount `./media:/app/media` on the `api` service with `MEDIA_DIR=/app/media`.
- **CRITICAL — .env file and DB password:** The `.env` file lives at `/opt/omnichat/.env` and contains the live `DATABASE_URL` and `POSTGRES_PASSWORD`. **Never overwrite .env without first reading it and saving a backup.** A corrupted or rewritten .env with a different password will break the API's DB connection. If the DB was initialized with one password and .env changes, either update the DB user's password to match (`ALTER USER ... WITH PASSWORD '...'`) or restore the original .env. The DB volume `omnichat_postgres_data` persists across container recreations, so the data is safe — the issue is always the password mismatch between the DB (initialized password) and the API (from .env).
