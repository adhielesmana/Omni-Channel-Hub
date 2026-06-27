# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Install dependencies:**
```bash
pnpm install
pnpm --filter @workspace/db run push   # Create database tables
```

**Development (separate terminals):**
```bash
# Terminal 1: API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Terminal 2: Frontend (port 20438)
pnpm --filter @workspace/omnichat run dev
```

**Typecheck all packages:**
```bash
pnpm run typecheck
```

## Architecture Overview

OmniChat is a B2B omnichannel messaging platform built as a **monorepo** with strict separation of concerns:

```
lib/
├── api-spec/             ← OpenAPI contract (source of truth for API)
├── api-client-react/     ← Generated React Query hooks + Zod schemas (auto-generated)
├── db/                   ← Drizzle ORM table definitions
└── api-zod/              ← Zod schema utilities

artifacts/
├── api-server/           ← Express 5 backend (REST routes only, no business logic)
└── omnichat/             ← React 19 + Vite frontend (uses generated hooks)
```

### Design Principles

1. **OpenAPI-first**: `lib/api-spec/openapi.yaml` defines the entire API contract. All TypeScript types, React Query hooks, and Zod validators are generated from it—never hand-written.

2. **Generated code is never edited**: Files in `lib/api-client-react/src/generated/` are overwritten on every codegen run. Modifications must be made in the OpenAPI spec instead.

3. **Thin route handlers**: Backend routes are simple: validate input with Zod, query DB with Drizzle, respond. No business logic in route files.

4. **Workspace isolation**: Each package (`@workspace/*`) has its own `package.json` and build outputs. Imports across packages use workspace aliases (`@workspace/db`).

## Code Generation Workflow

When you modify the API contract, regenerate the frontend client:

```bash
# 1. Edit lib/api-spec/openapi.yaml
# 2. Run codegen
pnpm --filter @workspace/api-spec run codegen
# 3. Generated files appear in lib/api-client-react/src/generated/ — do not edit
# 4. Implement the corresponding route in artifacts/api-server/src/routes/
```

This ensures frontend hooks always match backend endpoints. The codegen also updates TypeScript types and Zod validation schemas.

## Database Migrations

Drizzle ORM manages the schema. Table definitions live in `lib/db/src/schema/`.

```bash
# Push schema changes to PostgreSQL
pnpm --filter @workspace/db run push
```

## Key Files

| File | Purpose |
|------|---------|
| `lib/api-spec/openapi.yaml` | API contract (modify here for new endpoints) |
| `artifacts/api-server/src/routes/` | REST route handlers, one file per domain |
| `lib/db/src/schema/` | Drizzle table definitions |
| `artifacts/omnichat/src/pages/` | Frontend pages (inbox, contacts, departments, etc.) |
| `lib/api-client-react/src/generated/` | Auto-generated React Query hooks—**never edit** |

## Common Tasks

### Add a new API endpoint

1. Define the endpoint in `lib/api-spec/openapi.yaml` (request body, response schema, status codes)
2. Run `pnpm --filter @workspace/api-spec run codegen`
3. Implement the route in `artifacts/api-server/src/routes/` (validate input, query DB, respond)
4. Use the generated hook in the frontend component

### Add a new database table

1. Create a Drizzle table definition in `lib/db/src/schema/`
2. Run `pnpm --filter @workspace/db run push` to apply the migration
3. Add corresponding API endpoints in `openapi.yaml` and regenerate

### Fix a typecheck error

```bash
# Full validation
pnpm run typecheck

# Single package (faster)
pnpm --filter @workspace/omnichat run typecheck
```

## Important Patterns

- **Department-scoped visibility**: Conversations carry `departmentId` and `assignedAgentId` enabling filtered views per team
- **Webhook fast-ack**: `POST /api/webhooks/meta` responds `200 OK` immediately, then processes asynchronously to meet Meta's 5-second timeout
- **Drizzle with Zod**: `lib/api-zod/` provides schemas extracted from Drizzle tables via `createInsertSchema()`
- **React Query**: All data fetching uses auto-generated hooks from `lib/api-client-react/src/generated/api.ts`

## Known Limitations

- No WebSocket/SSE — inbox requires manual refresh for new messages
- No authentication layer — all API endpoints are open
- No outbound message sending (messages stored in DB but not sent to Meta)
- N+1 queries in conversation DTOs — acceptable at current scale
