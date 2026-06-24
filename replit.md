# OmniChat

OmniChat is a premium B2B omnichannel messaging platform that aggregates WhatsApp Business (WABA), Instagram DM, and Facebook Messenger into a single unified inbox — with multi-user roles, department routing, and real-time conversation management.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/omnichat run dev` — run the frontend (port 20438)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, TanStack Query, Wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle table definitions (users, departments, channels, contacts, conversations, messages)
- `artifacts/api-server/src/routes/` — Express route handlers (one file per domain)
- `artifacts/omnichat/src/` — React frontend pages and components

## Architecture decisions

- OpenAPI-first: all API contracts defined in `openapi.yaml`, types generated via Orval
- Thin route handlers: validate with Zod, query DB, respond — complex logic in separate lib modules
- Department-scoped visibility: conversations can be filtered by department, agent, channel type, or status
- Meta webhook receiver at `POST /api/webhooks/meta` auto-creates contacts and conversations on first inbound message
- Webhook verify token stored per channel in DB (webhook_verify_token column)

## Product

- **Inbox**: 3-pane workspace — sidebar nav, conversation thread list with status filters, active chat with message bubbles, right panel with contact/assignment details
- **Contacts**: searchable directory of all contacts across channels
- **Departments**: create/manage departments with manual or round-robin routing
- **Channels**: connect and manage WhatsApp numbers, Instagram pages, Facebook pages
- **Users**: team management with Admin/Supervisor/Agent roles
- **Analytics**: dashboard with conversation counts by channel, department workload, agent performance
- **Webhooks**: `GET /api/webhooks/meta` for verification, `POST /api/webhooks/meta` for inbound events

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing the OpenAPI spec before touching route handlers
- The `buildConversationDto` helper in `conversations.ts` does N+1 queries — acceptable for now, optimize with JOINs when scaling
- Meta webhook `POST` always responds 200 immediately, then processes async to avoid Meta's 5s timeout

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
