# OmniChat — Docker Installation Guide

Self-host OmniChat on any Linux VM with Docker and Docker Compose in under 15 minutes.

---

## Table of Contents

1. [Requirements](#requirements)
2. [Directory Layout on the VM](#directory-layout-on-the-vm)
3. [docker-compose.yml](#docker-composeyml)
4. [Nginx Reverse Proxy Config](#nginx-reverse-proxy-config)
5. [Environment File](#environment-file)
6. [Dockerfile — API Server](#dockerfile--api-server)
7. [Dockerfile — Frontend](#dockerfile--frontend)
8. [Step-by-Step Installation](#step-by-step-installation)
9. [Running Migrations](#running-migrations)
10. [Verify the Installation](#verify-the-installation)
11. [SSL / HTTPS with Certbot](#ssl--https-with-certbot)
12. [Firewall Rules](#firewall-rules)
13. [Useful Commands](#useful-commands)
14. [Troubleshooting](#troubleshooting)

---

## Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 2 GB |
| Disk | 10 GB | 20 GB |
| Docker | 24+ | latest |
| Docker Compose | v2.20+ | latest |
| Open ports | 80, 443 | 80, 443 |
| Domain name | Recommended for SSL | Required for Meta webhook |

Install Docker (if not already present):
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

---

## Directory Layout on the VM

```
/opt/omnichat/
├── docker-compose.yml
├── .env                        ← secrets & config (never commit)
├── nginx/
│   └── omnichat.conf           ← Nginx site config
├── migrations/                 ← SQL files (copied from repo)
│   ├── 001_initial_schema.sql
│   ├── 002_updated_at_trigger.sql
│   └── 003_seed_real_data.sql  ← template if you want to add your own data
└── data/
    └── postgres/               ← Postgres volume (auto-created)
```

Create the directory:
```bash
sudo mkdir -p /opt/omnichat/nginx /opt/omnichat/migrations /opt/omnichat/data/postgres
sudo chown -R $USER:$USER /opt/omnichat
cd /opt/omnichat
```

---

## docker-compose.yml

Create `/opt/omnichat/docker-compose.yml`:

```yaml
version: "3.9"

services:

  # ─── PostgreSQL ───────────────────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    container_name: omnichat-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB:       ${POSTGRES_DB}
      POSTGRES_USER:     ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - omnichat

  # ─── DB Migrations (runs once, then exits) ────────────────────────────────
  db-migrate:
    image: postgres:16-alpine
    container_name: omnichat-migrate
    restart: "no"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      PGPASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - ./migrations:/migrations:ro
    entrypoint: >
      sh -c "
        psql -h postgres -U ${POSTGRES_USER} -d ${POSTGRES_DB} -f /migrations/001_initial_schema.sql &&
        psql -h postgres -U ${POSTGRES_USER} -d ${POSTGRES_DB} -f /migrations/002_updated_at_trigger.sql &&
        echo 'Migrations complete.'
      "
    networks:
      - omnichat

  # ─── API Server ───────────────────────────────────────────────────────────
  api:
    image: ghcr.io/your-org/omnichat-api:${IMAGE_TAG:-latest}
    # -- OR build locally:
    # build:
    #   context: .
    #   dockerfile: Dockerfile.api
    container_name: omnichat-api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      db-migrate:
        condition: service_completed_successfully
    environment:
      NODE_ENV:       production
      PORT:           8080
      DATABASE_URL:   postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      SESSION_SECRET: ${SESSION_SECRET}
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8080/api/healthz || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 20s
    networks:
      - omnichat

  # ─── Frontend (static via Nginx) ─────────────────────────────────────────
  frontend:
    image: ghcr.io/your-org/omnichat-frontend:${IMAGE_TAG:-latest}
    # -- OR build locally:
    # build:
    #   context: .
    #   dockerfile: Dockerfile.frontend
    container_name: omnichat-frontend
    restart: unless-stopped
    networks:
      - omnichat

  # ─── Nginx Reverse Proxy ─────────────────────────────────────────────────
  nginx:
    image: nginx:1.27-alpine
    container_name: omnichat-nginx
    restart: unless-stopped
    depends_on:
      - api
      - frontend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/omnichat.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro          # SSL certs (Certbot)
      - /var/www/certbot:/var/www/certbot:ro           # ACME challenge
    networks:
      - omnichat

networks:
  omnichat:
    driver: bridge
```

---

## Nginx Reverse Proxy Config

Create `/opt/omnichat/nginx/omnichat.conf`:

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name your-domain.com;

    # Allow Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options        SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy        strict-origin-when-cross-origin;

    # API — proxy to Express
    location /api/ {
        proxy_pass         http://api:8080;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host       $host;
        proxy_set_header   X-Real-IP  $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
        client_max_body_size 10M;
    }

    # Frontend — proxy to the frontend container
    location / {
        proxy_pass         http://frontend:80;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # SPA fallback — handled by frontend container
        proxy_intercept_errors on;
        error_page 404 = @fallback;
    }

    location @fallback {
        proxy_pass http://frontend:80;
    }
}
```

> **Before SSL is ready** (first boot): simplify to HTTP only — replace both server blocks with a single `listen 80` block that proxies directly to `api` and `frontend`. Add HTTPS after Certbot runs.

---

## Environment File

Create `/opt/omnichat/.env` — **keep this file out of git**:

```bash
# PostgreSQL
POSTGRES_DB=omnichat
POSTGRES_USER=omnichat
POSTGRES_PASSWORD=CHANGE_ME_strong_random_password_here

# Application
SESSION_SECRET=CHANGE_ME_64_char_random_string_here

# Image tag (for pre-built images)
IMAGE_TAG=latest
```

Generate secure values:
```bash
# Generate SESSION_SECRET
openssl rand -hex 32

# Generate POSTGRES_PASSWORD
openssl rand -base64 24
```

Set correct permissions:
```bash
chmod 600 /opt/omnichat/.env
```

---

## Dockerfile — API Server

If building from source, create `Dockerfile.api` in the repo root:

```dockerfile
# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /build

# Copy workspace manifests first (layer-cache friendly)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# Copy all source
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

# Install all deps (including devDeps needed for build)
RUN pnpm install --frozen-lockfile

# Build composite libs first, then the API server
RUN pnpm run typecheck:libs
RUN pnpm --filter @workspace/api-server run build

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime

WORKDIR /app

# Only copy production deps + built output
COPY --from=builder /build/artifacts/api-server/dist/   ./artifacts/api-server/dist/
COPY --from=builder /build/node_modules/                ./node_modules/
COPY --from=builder /build/artifacts/api-server/node_modules/ ./artifacts/api-server/node_modules/
COPY migrations/ ./migrations/

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --retries=6 \
    CMD wget -qO- http://localhost:8080/api/healthz || exit 1

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
```

---

## Dockerfile — Frontend

Create `Dockerfile.frontend` in the repo root:

```dockerfile
# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /build

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./
COPY lib/ ./lib/
COPY artifacts/omnichat/ ./artifacts/omnichat/

RUN pnpm install --frozen-lockfile
RUN pnpm run typecheck:libs
RUN pnpm --filter @workspace/omnichat run build

# ── Runtime stage (Nginx static) ─────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# SPA config — serve index.html for all 404s
COPY --from=builder /build/artifacts/omnichat/dist/public/ /usr/share/nginx/html/

RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|svg|ico|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

EXPOSE 80
```

---

## Step-by-Step Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-org/omnichat.git /opt/omnichat/src
cd /opt/omnichat
```

Or upload the project files directly to the VM.

### 2. Copy migration files

```bash
cp /opt/omnichat/src/migrations/*.sql /opt/omnichat/migrations/
```

### 3. Create the `.env` file

```bash
cp /opt/omnichat/src/.env.example /opt/omnichat/.env
# Edit the file and set real values
nano /opt/omnichat/.env
```

### 4. (Optional) Build images locally

```bash
cd /opt/omnichat/src

docker build -f Dockerfile.api      -t omnichat-api:latest      .
docker build -f Dockerfile.frontend -t omnichat-frontend:latest  .
```

Then update `docker-compose.yml` to use `image: omnichat-api:latest` and `image: omnichat-frontend:latest`.

### 5. Pull or build and start all services

```bash
cd /opt/omnichat
docker compose up -d
```

Docker Compose will:
1. Start **postgres** and wait for it to be healthy
2. Run **db-migrate** (applies SQL migration files), then exit
3. Start **api** and wait for `/api/healthz` to pass
4. Start **frontend** and **nginx**

### 6. Watch the logs

```bash
docker compose logs -f
```

Look for:
```
omnichat-migrate | Migrations complete.
omnichat-api     | {"level":30,"msg":"Server listening on port 8080"}
```

### 7. Open the app

Navigate to `http://YOUR_SERVER_IP` (or your domain after SSL is set up).

---

## Running Migrations

### Automatically (recommended)

The `db-migrate` service in `docker-compose.yml` runs migrations automatically on every `docker compose up`. Because all SQL files use `IF NOT EXISTS`, re-running is safe.

### Manually

```bash
# Connect via the postgres container
docker compose exec postgres psql -U omnichat -d omnichat

# Or run a specific file
docker compose exec -e PGPASSWORD=$POSTGRES_PASSWORD postgres \
    psql -U omnichat -d omnichat -f /dev/stdin < migrations/001_initial_schema.sql
```

---

## Verify the Installation

```bash
# Health check
curl -s http://localhost/api/healthz
# → {"status":"ok"}

# List users
curl -s http://localhost/api/users | python3 -m json.tool

# Check container status
docker compose ps
```

Expected output of `docker compose ps`:

```
NAME                  IMAGE                STATUS          PORTS
omnichat-postgres     postgres:16-alpine   Up (healthy)    5432/tcp
omnichat-migrate      postgres:16-alpine   Exited (0)
omnichat-api          omnichat-api         Up (healthy)    8080/tcp
omnichat-frontend     omnichat-frontend    Up              80/tcp
omnichat-nginx        nginx:1.27-alpine    Up              0.0.0.0:80->80/tcp
```

---

## SSL / HTTPS with Certbot

### 1. Install Certbot on the VM host

```bash
sudo apt install certbot -y
```

### 2. Temporarily stop Nginx (so port 80 is free)

```bash
docker compose stop nginx
```

### 3. Obtain the certificate

```bash
sudo certbot certonly --standalone \
    --agree-tos --non-interactive \
    --email admin@your-domain.com \
    -d your-domain.com
```

### 4. Update the Nginx config

Replace `your-domain.com` in `nginx/omnichat.conf` with your actual domain and enable the HTTPS server block.

### 5. Restart Nginx

```bash
docker compose start nginx
```

### 6. Auto-renewal (cron)

```bash
# Renew certs and reload Nginx — runs at 3 AM every Monday
echo "0 3 * * 1 root certbot renew --quiet && docker compose -f /opt/omnichat/docker-compose.yml exec nginx nginx -s reload" \
    | sudo tee /etc/cron.d/certbot-renew
```

---

## Firewall Rules

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Verify
sudo ufw status
```

Do **not** expose port 5432 (Postgres) or 8080 (API) to the internet — they are internal only.

---

## Useful Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs (all services)
docker compose logs -f

# View logs (single service)
docker compose logs -f api

# Open a Postgres shell
docker compose exec postgres psql -U omnichat -d omnichat

# Restart a single service
docker compose restart api

# Check resource usage
docker stats
```

---

## Troubleshooting

### Containers exit immediately

```bash
docker compose logs db-migrate
docker compose logs api
```

Most common causes:
- `DATABASE_URL` is wrong → check `.env` values
- Postgres is not healthy yet → increase `start_period` in the API healthcheck

### Port 80 already in use

```bash
sudo lsof -i :80
# Kill the conflicting process or change the Nginx host port in docker-compose.yml
```

### Migration errors

```bash
docker compose logs db-migrate
```

If a table already exists and you're seeing errors, the `IF NOT EXISTS` guard should prevent them. If a migration partially ran, connect to Postgres and inspect the state:
```bash
docker compose exec postgres psql -U omnichat -d omnichat -c "\dt"
```

### API returns 502 Bad Gateway

Nginx can't reach the API container. Check:
```bash
docker compose ps api          # should be "Up (healthy)"
docker compose logs api        # look for startup errors
curl -s http://localhost:8080/api/healthz   # direct container check (from VM host)
```

### Meta webhook not receiving events

1. Confirm your domain is publicly accessible over HTTPS
2. Register `https://your-domain.com/api/webhooks/meta` in the Meta App Dashboard
3. Meta requires HTTPS — HTTP-only setups will not receive events
4. Test the verification endpoint manually:
```bash
curl "https://your-domain.com/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=any&hub.challenge=test123"
# → test123
```
