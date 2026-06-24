# OmniChat

> **Premium B2B omnichannel messaging platform** — aggregate WhatsApp Business, Instagram DM, and Facebook Messenger into a single unified inbox with multi-agent teams, department routing, and real-time conversation management.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Tech Stack](#tech-stack)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [Webhook Integration (Meta)](#webhook-integration-meta)
8. [Frontend Pages](#frontend-pages)
9. [Environment Variables](#environment-variables)
10. [Development Setup](#development-setup)
11. [Running the App](#running-the-app)
12. [Deployment](#deployment)
13. [Codegen Workflow](#codegen-workflow)
14. [Known Limitations & Roadmap](#known-limitations--roadmap)

---

## Overview

OmniChat is a multi-tenant, multi-channel messaging platform designed for B2B customer support teams. It provides:

- **Unified inbox** — WhatsApp Business API, Instagram DM, and Facebook Messenger in one place
- **Team management** — Admin / Supervisor / Agent role hierarchy
- **Department routing** — manual assignment or automatic round-robin per department
- **Real-time conversations** — message thread with internal notes, resolve/reopen lifecycle
- **Meta webhook ingestion** — auto-creates contacts and conversations on first inbound message
- **Analytics dashboard** — conversations by channel, department workload, agent performance

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Shared Reverse Proxy (port 80)            │
│              routes /api  →  API Server (port 8080)          │
│              routes /     →  Frontend  (port 20438)          │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
  ┌─────▼──────┐               ┌──────▼──────┐
  │ API Server  │               │  Frontend    │
  │ Express 5   │               │  React+Vite  │
  │ Port 8080   │               │  Port 20438  │
  └─────┬──────┘               └─────────────┘
        │
  ┌─────▼──────┐
  │ PostgreSQL  │
  │ Drizzle ORM │
  └────────────┘
```

**Key design decisions:**

- **OpenAPI-first**: the entire API contract lives in `lib/api-spec/openapi.yaml`. All TypeScript types, React Query hooks, and Zod validation schemas are **generated** from it via Orval — never hand-written.
- **Thin route handlers**: each route validates input with Zod, queries the DB with Drizzle, and responds. No business logic buried in routes.
- **Department-scoped visibility**: conversations carry `departmentId` and `assignedAgentId` enabling filtered views per team.
- **Webhook fast-ack**: `POST /api/webhooks/meta` responds `200 OK` immediately, then processes the payload asynchronously to stay within Meta's 5-second timeout.

---

## Project Structure

```
omnichat/
├── artifacts/
│   ├── api-server/               # Express 5 backend
│   │   ├── src/
│   │   │   ├── routes/           # Route handlers (one file per domain)
│   │   │   │   ├── users.ts
│   │   │   │   ├── departments.ts
│   │   │   │   ├── channels.ts
│   │   │   │   ├── contacts.ts
│   │   │   │   ├── conversations.ts
│   │   │   │   ├── messages.ts
│   │   │   │   ├── stats.ts
│   │   │   │   ├── webhooks.ts
│   │   │   │   ├── health.ts
│   │   │   │   └── index.ts      # Registers all routers
│   │   │   ├── lib/
│   │   │   │   └── logger.ts     # Pino logger singleton
│   │   │   └── index.ts          # Express app entry point
│   │   └── .replit-artifact/artifact.toml
│   │
│   ├── omnichat/                 # React + Vite frontend
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── inbox/        # 3-pane conversation workspace
│   │   │   │   ├── contacts/     # Contact directory
│   │   │   │   ├── departments/  # Department management
│   │   │   │   ├── channels/     # Channel cards
│   │   │   │   ├── users/        # Team member management
│   │   │   │   ├── analytics/    # Dashboard with Recharts
│   │   │   │   └── settings/     # 7-section settings panel
│   │   │   ├── components/
│   │   │   │   ├── layout/AppLayout.tsx   # Sidebar nav shell
│   │   │   │   └── ui/           # shadcn/ui components
│   │   │   ├── App.tsx           # Wouter router
│   │   │   └── main.tsx
│   │   └── .replit-artifact/artifact.toml
│   │
│   └── mockup-sandbox/           # Design canvas preview server (dev only)
│
├── lib/
│   ├── api-spec/
│   │   └── openapi.yaml          # ← Source of truth for all API contracts
│   ├── api-client-react/
│   │   └── src/generated/        # Auto-generated hooks + schemas (do not edit)
│   └── db/
│       └── src/schema/           # Drizzle table definitions
│           ├── users.ts
│           ├── departments.ts
│           ├── channels.ts
│           ├── contacts.ts
│           ├── conversations.ts
│           ├── messages.ts
│           └── index.ts
│
├── scripts/                      # Utility scripts (seed data, migrations, etc.)
├── pnpm-workspace.yaml           # Workspace package catalog
├── tsconfig.base.json            # Shared strict TS config
└── tsconfig.json                 # Solution file for composite libs
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24 |
| Language | TypeScript 5.9 (strict) |
| Package manager | pnpm workspaces |
| API framework | Express 5 |
| ORM | Drizzle ORM |
| Database | PostgreSQL (Replit-managed) |
| Validation | Zod v4 + drizzle-zod |
| API contract | OpenAPI 3.1 (Orval codegen) |
| Frontend framework | React 19 + Vite 7 |
| Styling | Tailwind CSS v4 |
| Component library | shadcn/ui |
| Data fetching | TanStack Query v5 |
| Routing | Wouter v3 |
| Charts | Recharts |
| Logging | Pino (structured JSON) |
| Build (server) | esbuild (CJS bundle) |
| Build (frontend) | Vite (static SPA) |

---

## Database Schema

All tables live in `lib/db/src/schema/`. Drizzle manages migrations via `pnpm --filter @workspace/db run push`.

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `email` | text UNIQUE | |
| `name` | text | |
| `role` | enum | `admin` \| `supervisor` \| `agent` |
| `department_id` | integer FK | optional department assignment |
| `avatar_url` | text | optional |
| `is_active` | boolean | default `true` |
| `created_at` / `updated_at` | timestamptz | auto-managed |

### `departments`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text UNIQUE | |
| `description` | text | optional |
| `routing_mode` | enum | `manual` \| `round_robin` |
| `is_active` | boolean | default `true` |

### `channels`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text | display label |
| `channel_type` | enum | `whatsapp` \| `instagram` \| `facebook` |
| `external_id` | text | Meta WABA ID / page ID |
| `phone_number` | text | WhatsApp only |
| `page_id` | text | Instagram / Facebook only |
| `access_token` | text | Meta page access token |
| `webhook_verify_token` | text | Per-channel verify token |
| `is_active` | boolean | |

### `contacts`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text | |
| `phone` | text | optional |
| `email` | text | optional |
| `channel_type` | enum | originating channel |
| `external_id` | text | sender ID from Meta |
| `custom_fields` | text | JSON blob |

### `conversations`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `contact_id` | integer FK → contacts | |
| `channel_id` | integer FK → channels | |
| `channel_type` | enum | denormalized for fast filtering |
| `department_id` | integer FK → departments | optional |
| `assigned_agent_id` | integer FK → users | optional |
| `status` | enum | `open` \| `pending` \| `resolved` \| `snoozed` |
| `subject` | text | optional |
| `last_message_at` | timestamptz | updated on each message |
| `unread_count` | integer | incremented on inbound |

### `messages`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `conversation_id` | integer FK → conversations | |
| `sender_type` | enum | `contact` \| `agent` \| `system` |
| `direction` | enum | `inbound` \| `outbound` |
| `content_type` | enum | `text` \| `image` \| `audio` \| `document` \| `video` \| `location` \| `sticker` \| `note` |
| `content` | text | message body |
| `external_message_id` | text | Meta message ID |
| `sender_name` | text | display name |

---

## API Reference

Base path: `/api`

All routes follow REST conventions. Request bodies are `application/json`. Responses are `application/json`.

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/healthz` | Liveness check → `{ status: "ok" }` |

### Users

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users` | Create user |
| `GET` | `/api/users/:id` | Get user by ID |
| `PUT` | `/api/users/:id` | Update user |
| `DELETE` | `/api/users/:id` | Delete user |

**Create / Update body fields:** `name`, `email`, `role` (`admin|supervisor|agent`), `departmentId?`, `isActive?`

### Departments

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/departments` | List all departments |
| `POST` | `/api/departments` | Create department |
| `GET` | `/api/departments/:id` | Get department |
| `PUT` | `/api/departments/:id` | Update department |
| `DELETE` | `/api/departments/:id` | Delete department |

**Create / Update body fields:** `name`, `description?`, `routingMode` (`manual|round_robin`), `isActive?`

### Channels

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/channels` | List all channels |
| `POST` | `/api/channels` | Create channel |
| `GET` | `/api/channels/:id` | Get channel |
| `PUT` | `/api/channels/:id` | Update channel |
| `DELETE` | `/api/channels/:id` | Delete channel |

**Create body fields:** `name`, `channelType` (`whatsapp|instagram|facebook`), `externalId?`, `phoneNumber?`, `pageId?`, `accessToken?`, `webhookVerifyToken?`, `isActive?`

### Contacts

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/contacts` | List contacts (query: `search`, `channelType`) |
| `POST` | `/api/contacts` | Create contact |
| `GET` | `/api/contacts/:id` | Get contact |
| `PUT` | `/api/contacts/:id` | Update contact |

### Conversations

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/conversations` | List conversations (query: `status`, `channelType`, `departmentId`, `agentId`) |
| `POST` | `/api/conversations` | Create conversation |
| `GET` | `/api/conversations/:id` | Get conversation |
| `PUT` | `/api/conversations/:id` | Update conversation |
| `POST` | `/api/conversations/:id/assign` | Assign agent/department |
| `POST` | `/api/conversations/:id/resolve` | Mark as resolved |
| `POST` | `/api/conversations/:id/reopen` | Reopen resolved conversation |

**Assign body:** `{ agentId?: number, departmentId?: number }`

### Messages

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/conversations/:id/messages` | List messages in a conversation |
| `POST` | `/api/conversations/:id/messages` | Send a message |

**Send body:** `{ contentType: "text|note|image|...", content: string }`

### Webhooks

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/webhooks/meta` | Meta webhook verification challenge |
| `POST` | `/api/webhooks/meta` | Receive Meta webhook events |

### Stats

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/stats/overview` | Summary counts + avg response time |
| `GET` | `/api/stats/by-channel` | Conversation counts per channel type |
| `GET` | `/api/stats/by-department` | Conversation counts per department |
| `GET` | `/api/stats/agent-workload` | Per-agent open/resolved counts |

---

## Webhook Integration (Meta)

OmniChat implements Meta's webhook receiver for WhatsApp Business API, Instagram, and Facebook Messenger.

### Verification (GET)

Meta sends a `GET` request with `hub.mode=subscribe`, `hub.verify_token`, and `hub.challenge`. The server echoes back the challenge with `200 OK` to confirm ownership.

```
GET /api/webhooks/meta?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
→ 200 CHALLENGE
```

Register this callback URL in the **Meta App Dashboard → Webhooks** for each product (WhatsApp, Instagram, Messenger).

### Inbound Events (POST)

```
POST /api/webhooks/meta
Content-Type: application/json
{ ...meta payload... }
→ 200 { "status": "ok" }   ← immediate, before processing
```

Processing is fully async. The handler:

1. Detects `payload.object` (`whatsapp_business_account` | `instagram` | `page`)
2. Finds the matching channel record by `phone_number_id` or channel type
3. **Upserts** the contact by `external_id` (sender phone/PSID)
4. **Upserts** the conversation by `contact_id` (reopens if previously resolved)
5. Stores the inbound message
6. Increments `unread_count` on the conversation

### Subscribed Events

Configure these event fields in the Meta App Dashboard:

- `messages` — inbound messages
- `message_deliveries` — delivery receipts
- `message_reads` — read receipts
- `messaging_postbacks` — button postbacks
- `feed` — page feed mentions
- `mention` — Instagram mentions

---

## Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/inbox` | Inbox | 3-pane workspace: conversation list, chat window, contact detail panel |
| `/contacts` | Contacts | Searchable contact directory table |
| `/departments` | Departments | Department cards with Create dialog |
| `/channels` | Channels | Channel cards showing connection status |
| `/users` | Team Members | User table with Invite User dialog |
| `/analytics` | Analytics | Stats cards, agent workload bars, channel pie chart, department bar chart |
| `/settings` | Settings | 7-section settings panel (Workspace, Notifications, Routing, Webhooks, Integrations, Security, Advanced) |

### Inbox features

- Live search filters conversation list by contact name or last message
- Status tabs: All / Open / Pending / Done
- Chat composer: **Reply** mode (outbound message) + **Note** mode (internal note, amber UI)
- `Enter` to send, `Shift+Enter` for new line
- **Resolve / Reopen** button calls the API and invalidates the query cache
- **Department & Agent assignment** dropdowns call the assign API
- Right panel: contact info, assignment details, channel indicator

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (`postgres://...`) |
| `SESSION_SECRET` | Yes | Secret for session signing (set in Replit Secrets) |
| `PORT` | Injected | Set by Replit workflow per artifact — do not hardcode |
| `BASE_PATH` | Injected | Set by Replit workflow — used by frontend for routing |
| `NODE_ENV` | Injected | `development` in dev, `production` in deployed builds |

Secrets are managed in **Replit Secrets** (never commit to source). Add via the Replit sidebar → Secrets.

---

## Development Setup

### Prerequisites

- Node.js 24+
- pnpm 9+
- PostgreSQL database (Replit provides one automatically via `DATABASE_URL`)

### First-time setup

```bash
# Install all workspace dependencies
pnpm install

# Push DB schema to PostgreSQL (creates tables)
pnpm --filter @workspace/db run push

# (Optional) Seed demo data
pnpm --filter @workspace/scripts run seed
```

### Regenerate API types after changing the OpenAPI spec

```bash
# 1. Edit lib/api-spec/openapi.yaml
# 2. Run codegen
pnpm --filter @workspace/api-spec run codegen
# 3. Generated files are in lib/api-client-react/src/generated/ — do not edit manually
```

---

## Running the App

In Replit, workflows handle starting both services automatically. To run manually:

```bash
# Terminal 1 — API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (port 20438)
pnpm --filter @workspace/omnichat run dev
```

The shared reverse proxy at port 80 routes:
- `/api/*` → API server (port 8080)
- `/*` → Frontend (port 20438)

**Do not use root-level `pnpm run dev`** — there is no root dev script by design. Each service needs its own `PORT` env var.

### Typechecking

```bash
# Full typecheck (libs first, then leaf artifacts)
pnpm run typecheck

# Libs only (needed after changing lib/* packages)
pnpm run typecheck:libs

# Single artifact
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/omnichat run typecheck
```

---

## Deployment

OmniChat is deployed via **Replit Deployments** (Autoscale). The platform builds and serves both artifacts automatically.

### Build process

**API Server** (production):
```bash
pnpm --filter @workspace/api-server run build
# outputs: artifacts/api-server/dist/index.mjs
# run as: node --enable-source-maps artifacts/api-server/dist/index.mjs
```

**Frontend** (production):
```bash
pnpm --filter @workspace/omnichat run build
# outputs: artifacts/omnichat/dist/public/
# served as static files with SPA fallback (/* → /index.html)
```

### Health check

Production startup is validated via:
```
GET /api/healthz → 200 { "status": "ok" }
```

### DB schema changes in production

After deploying a new schema, apply the migration:
```bash
# Run from the production console or a deploy hook
pnpm --filter @workspace/db run push
```

---

## Codegen Workflow

The API contract flows in one direction:

```
openapi.yaml  →  Orval codegen  →  lib/api-client-react/src/generated/
                                    ├── api.ts          (React Query hooks)
                                    └── api.schemas.ts  (TypeScript types + Zod schemas)
```

**Rules:**
1. Modify `lib/api-spec/openapi.yaml` to add or change an endpoint.
2. Run `pnpm --filter @workspace/api-spec run codegen`.
3. Implement the route handler in `artifacts/api-server/src/routes/`.
4. Use the generated hook in the frontend — never import from the API directly.
5. Do **not** edit files in `lib/api-client-react/src/generated/` — they are overwritten on every codegen run.

---

## Known Limitations & Roadmap

### Current limitations

| Area | Limitation |
|---|---|
| Real-time | No WebSocket/SSE — inbox requires manual refresh for new inbound messages |
| Auth | No authentication layer — all API endpoints are open |
| Outbound sending | Messages stored in DB but not forwarded to Meta Cloud API (no `send_message` call) |
| Webhook verify token | Accepts any token (not validated against stored channel tokens) |
| N+1 queries | `buildConversationDto` does per-conversation sub-queries — acceptable at current scale |
| File attachments | Content types beyond `text`/`note` stored but not rendered in the UI |

### Suggested next steps

- [ ] Add WebSocket / Server-Sent Events for real-time inbox updates
- [ ] Implement authentication (Replit Auth or Clerk SSO)
- [ ] Wire outbound messages to Meta Cloud API (`POST /messages`)
- [ ] Validate webhook `verify_token` against stored per-channel tokens
- [ ] Add SLA timers and breach alerting
- [ ] Optimize N+1 queries with JOIN-based conversation DTOs
- [ ] Add pagination to conversation list and contacts table
- [ ] Support image/file attachments in the composer
- [ ] Add conversation labels/tags
- [ ] Email digest via SMTP
