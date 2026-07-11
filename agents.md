# OmniChat — Agent & Deployment Reference

This file is a compact reference for AI agents, automated pipelines, and future developers who need to work on, extend, or deploy OmniChat. It covers the decisions, conventions, gotchas, and checklist steps needed to make changes safely and efficiently.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Repository Layout](#repository-layout)
3. [Non-Obvious Conventions](#non-obvious-conventions)
4. [The API-First Contract Rule](#the-api-first-contract-rule)
5. [Database Operations](#database-operations)
6. [Adding a New Feature — Step-by-Step](#adding-a-new-feature--step-by-step)
7. [Generated Files — Do Not Edit](#generated-files--do-not-edit)
8. [Deployment Checklist](#deployment-checklist)
9. [Environment & Secrets](#environment--secrets)
10. [Common Pitfalls](#common-pitfalls)
11. [Debugging Guide](#debugging-guide)
12. [Dependency Management](#dependency-management)
13. [Frontend Conventions](#frontend-conventions)
14. [Backend Conventions](#backend-conventions)
15. [Meta Webhook Constraints](#meta-webhook-constraints)

---

## Quick Reference

```bash
# Full typecheck
pnpm run typecheck

# Regenerate API client after editing openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes (dev only)
pnpm --filter @workspace/db run push

# Build API server for production
pnpm --filter @workspace/api-server run build

# Build frontend for production
pnpm --filter @workspace/omnichat run build
```

Services in production:
- **API Server**: `node --enable-source-maps artifacts/api-server/dist/index.mjs`
- **Frontend**: static files served from `artifacts/omnichat/dist/public/`
- **Health check**: `GET /api/healthz` → `{ "status": "ok" }`

---

## Repository Layout

```
workspace root
├── artifacts/api-server/     ← Express 5 backend  (leaf package, no emit)
├── artifacts/omnichat/       ← React+Vite frontend (leaf package, no emit)
├── artifacts/mockup-sandbox/ ← Design tool (dev only, ignore in production)
├── lib/api-spec/             ← openapi.yaml (source of truth for all API types)
├── lib/api-client-react/     ← auto-generated React Query hooks (DO NOT EDIT)
├── lib/db/                   ← Drizzle schema + migration helpers (composite lib)
└── scripts/                  ← One-off utility scripts (seed, etc.)
```

**Package names** use the `@workspace/` prefix:
- `@workspace/api-server`
- `@workspace/omnichat`
- `@workspace/api-client-react`
- `@workspace/db`

---

## Non-Obvious Conventions

### TypeScript build model

- `lib/*` packages are **composite** (`tsc --build`). They emit `.d.ts` declarations.
- `artifacts/*` packages are **leaf** — `tsc --noEmit` only. Never add them to root `tsconfig.json` references.
- After changing any `lib/` package, run `pnpm run typecheck:libs` before checking artifacts. Missing exports usually mean stale lib declarations, not bad imports.

### Logging

**Never use `console.log` in server code.** Use:

```typescript
// In route handlers:
req.log.info({ key: value }, "message");
req.log.error({ err }, "something failed");

// Outside of request context (workers, async jobs):
import { logger } from "../lib/logger";
logger.info({ ... }, "...");
```

Logs are structured JSON (Pino). In development they are pretty-printed.

### Port assignment

`PORT` and `BASE_PATH` are injected by Replit workflows — never hardcode a port. Read `process.env.PORT` in server code. Vite reads `PORT` automatically via the artifact config.

### URL construction in the frontend

Use relative URLs (e.g. `fetch('/api/users')`) — the shared proxy routes `/api` to the backend automatically. Do not add a Vite proxy config or point to `localhost:8080` directly.

---

## The API-First Contract Rule

**Every API change must start in `lib/api-spec/openapi.yaml`.**

```
openapi.yaml
    ↓  pnpm --filter @workspace/api-spec run codegen
lib/api-client-react/src/generated/
    api.ts           — React Query hooks (useListUsers, useSendMessage, ...)
    api.schemas.ts   — TypeScript interfaces + Zod schemas
```

After codegen, the route handler and the frontend hook are both derived from the same contract. If you skip codegen and try to hand-write types, they will diverge.

**Steps to add a new endpoint:**

1. Add the path + operation to `openapi.yaml`
2. Run `pnpm --filter @workspace/api-spec run codegen`
3. Write the Express route in `artifacts/api-server/src/routes/<domain>.ts`
4. Register it in `artifacts/api-server/src/routes/index.ts`
5. Use the generated hook in the frontend (e.g. `useCreateFoo()`)

---

## Database Operations

### Adding a new table

1. Create `lib/db/src/schema/<table>.ts` following the existing pattern:
   - Use `pgTable`, `serial`, `text`, `integer`, `boolean`, `timestamp(..., { withTimezone: true })`
   - Export `insertXxxSchema` (drizzle-zod), `InsertXxx` type, `Xxx` type
2. Export the table from `lib/db/src/schema/index.ts`
3. Run `pnpm --filter @workspace/db run push` to apply to dev DB
4. Run `pnpm run typecheck:libs` to rebuild declarations

### Adding columns to an existing table

1. Add the column to the schema file
2. Run `pnpm --filter @workspace/db run push`

### Pushing to production DB

`drizzle-kit push` applies DDL directly (no migration files). For production:
```bash
# Must have DATABASE_URL pointing to the production database
pnpm --filter @workspace/db run push
```

### Timestamp convention

All timestamp columns use:
```typescript
timestamp("column_name", { withTimezone: true }).notNull().defaultNow()
```

`updatedAt` columns add `.$onUpdate(() => new Date())`.

---

## Adding a New Feature — Step-by-Step

### Backend-only change (e.g. new query filter)

1. Update `openapi.yaml` with the new query parameter or response field
2. `pnpm --filter @workspace/api-spec run codegen`
3. Update the route handler to implement the new filter/field
4. `pnpm --filter @workspace/api-server run typecheck`

### Full-stack feature (new resource)

1. Add DB table → `lib/db/src/schema/`
2. Export from `lib/db/src/schema/index.ts`
3. `pnpm --filter @workspace/db run push`
4. Add CRUD endpoints to `openapi.yaml`
5. `pnpm --filter @workspace/api-spec run codegen`
6. Write route handler → `artifacts/api-server/src/routes/<name>.ts`
7. Register router in `artifacts/api-server/src/routes/index.ts`
8. Build the frontend page using the generated hooks
9. Add the route to `artifacts/omnichat/src/App.tsx`
10. Add nav item to `artifacts/omnichat/src/components/layout/AppLayout.tsx`
11. `pnpm run typecheck`

---

## Generated Files — Do Not Edit

These files are **overwritten** on every codegen run. Changes made directly will be lost:

```
lib/api-client-react/src/generated/api.ts
lib/api-client-react/src/generated/api.schemas.ts
```

If you need to extend generated behavior, create a wrapper in a separate file that imports from the generated module.

---

## Deployment Checklist

Run these checks before pushing to production:

```
□ pnpm run typecheck                         — no TypeScript errors
□ lib/api-spec/openapi.yaml is up-to-date   — all new endpoints documented
□ pnpm --filter @workspace/api-spec run codegen was run after any openapi.yaml change
□ DATABASE_URL points to production DB
□ pnpm --filter @workspace/db run push (if schema changed)
□ SESSION_SECRET is set in production secrets
□ EXTERNAL_API_KEY is set in production secrets
□ SUPERADMIN_PASSWORD is set in production secrets
□ CORS_ORIGIN is set in production (e.g. https://app.example.com)
□ RATE_LIMIT_MAX is configured (default 200)
□ GET /api/healthz returns 200 after deployment
□ Test at least one inbound webhook with a real Meta test payload
□ Verify security headers: X-Frame-Options, CSP, X-Content-Type-Options
□ Verify unauthenticated endpoints return 401
```

### Production build commands

```bash
# API server
pnpm --filter @workspace/api-server run build
# Output: artifacts/api-server/dist/index.mjs

# Frontend
pnpm --filter @workspace/omnichat run build
# Output: artifacts/omnichat/dist/public/ (static files)
```

The Replit deployment platform runs these automatically. The production run command is:
```
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

---

## Environment & Secrets

| Variable | Where set | Description |
|---|---|---|
| `DATABASE_URL` | Replit Secrets | PostgreSQL connection string |
| `SESSION_SECRET` | Replit Secrets | Session signing secret |
| `EXTERNAL_API_KEY` | Replit Secrets / `.env` | API key for external endpoints (`x-api-key` header) |
| `SUPERADMIN_PASSWORD` | Replit Secrets / `.env` | Superadmin login password |
| `CORS_ORIGIN` | Replit Secrets / `.env` | Comma-separated allowed CORS origins |
| `RATE_LIMIT_MAX` | Replit Secrets / `.env` | Global rate limit max requests per minute (default 200) |
| `PORT` | Replit workflow injection | Do not hardcode |
| `BASE_PATH` | Replit workflow injection | Frontend base path |
| `NODE_ENV` | Replit workflow injection | `production` in deployed builds |

**Never hardcode secrets.** Never commit `.env` files. Use `process.env.VARIABLE_NAME` everywhere.

To add a secret in Replit: sidebar → Secrets → add key/value. It becomes available as `process.env.KEY`.

---

## Common Pitfalls

| Pitfall | Correct Approach |
|---|---|
| Editing generated files | Only edit `openapi.yaml`, then run codegen |
| `console.log` in server routes | Use `req.log.info()` or the `logger` singleton |
| Hardcoding port 8080 in frontend | Use relative URLs — the proxy handles routing |
| Running `pnpm run dev` at workspace root | No root dev script exists; run per-artifact |
| Adding `artifacts/*` to root `tsconfig.json` references | Only `lib/*` packages go in root references |
| Calling `pnpm --filter @workspace/omnichat run build` from bash | Build needs workflow-injected env vars; use typecheck for validation |
| Installing a package without checking the catalog | Run `pnpm add` — it picks up catalog entries automatically |
| Forgetting `pnpm run typecheck:libs` after changing a lib | Stale `.d.ts` files cause misleading import errors in artifacts |
| Using `Array.isArray(req.params.id)` guard in Express 5 | Express 5 params are always strings; this guard is unnecessary but harmless |

---

## Debugging Guide

### API errors (production)

Use the Replit deployment log viewer (sidebar → Deployments → Logs). Logs are structured JSON:
```json
{ "level": 30, "req": { "method": "POST", "url": "/api/conversations" }, "res": { "statusCode": 400 } }
```

### API errors (development)

Logs stream to the workflow console in pretty-printed format. Check the `artifacts/api-server: API Server` workflow.

### Frontend errors

Open browser DevTools → Console. Vite HMR errors appear here. Network tab shows failed API calls.

### DB issues

Connect directly via `psql $DATABASE_URL` to inspect tables. Run `pnpm --filter @workspace/db run push` if tables are missing (this is idempotent).

### Type errors after codegen

```bash
# Rebuild lib declarations, then check artifacts
pnpm run typecheck:libs
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/omnichat run typecheck
```

### "Cannot find module @workspace/db"

Lib declarations are stale. Run:
```bash
pnpm run typecheck:libs
```

---

## Dependency Management

### Adding a new package

```bash
# To a specific workspace package
pnpm --filter @workspace/api-server add express-rate-limit
pnpm --filter @workspace/omnichat add some-ui-lib

# Dev dependency
pnpm --filter @workspace/api-server add -D @types/express-rate-limit
```

If the package already has a catalog entry in `pnpm-workspace.yaml`, pnpm uses it automatically.

### devDependencies vs dependencies

- **Frontend artifacts** (`artifacts/omnichat`): everything goes in `devDependencies` — Vite bundles it all
- **Server artifacts** (`artifacts/api-server`): runtime imports (`express`, `drizzle-orm`, `pg`) → `dependencies`; build tools + `@types/*` → `devDependencies`
- **Libs** (`lib/*`): shared runtimes (e.g. `react`) → `peerDependencies`; everything else → `devDependencies`

### Security note

`pnpm-workspace.yaml` enforces `minimumReleaseAge: 1440` (packages must be 1 day old before install). Do not disable this. If you need to install a fresh release from a trusted publisher, add it to `minimumReleaseAgeExclude`.

---

## Frontend Conventions

### Data fetching

Always use generated TanStack Query hooks:
```typescript
// List
const { data: users, isLoading } = useListUsers();

// Mutation with cache invalidation
const queryClient = useQueryClient();
const createUser = useCreateUser();
createUser.mutate({ data: { ... } }, {
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users"] })
});
```

### Enum imports

Enums are exported from the generated schemas file:
```typescript
import { UserInputRole, MessageInputContentType, DepartmentInputRoutingMode } from "@workspace/api-client-react";
```

### Component structure

- Pages live in `artifacts/omnichat/src/pages/<name>/index.tsx`
- Shared UI components are in `artifacts/omnichat/src/components/ui/` (shadcn/ui — do not modify generated components directly, extend via wrappers)
- Layout shell: `artifacts/omnichat/src/components/layout/AppLayout.tsx`

### Routing

Wouter is used for client-side routing. Add routes in `artifacts/omnichat/src/App.tsx`:
```tsx
<Route path="/new-page" component={NewPage} />
```

---

## Backend Conventions

### Route handler pattern

```typescript
router.get("/resource/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [record] = await db.select().from(table).where(eq(table.id, id));
  if (!record) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(record);
});
```

**Always:**
- Annotate async handlers with `Promise<void>`
- Use `res.status(...).json(...); return;` — not `return res.status(...).json(...)`
- Validate with Zod before DB writes
- Log errors with `req.log.error({ err }, "message")`

### Zod validation pattern

```typescript
import { z } from "zod/v4";
const BodySchema = z.object({ name: z.string().min(1), ... });
const parsed = BodySchema.safeParse(req.body);
if (!parsed.success) {
  res.status(400).json({ error: parsed.error.issues });
  return;
}
```

### Express 5 notes

- `app.use(express.json())` is required (body parsing is not automatic)
- Async errors propagate to the error handler automatically (no try/catch needed if using the global error middleware)
- Route params are always `string` — parse to number explicitly

---

## Meta Webhook Constraints

### The 5-second rule

Meta's webhook delivery requires a `2xx` response within **5 seconds**. The handler pattern is:

```typescript
router.post("/webhooks/meta", async (req, res): Promise<void> => {
  res.status(200).json({ status: "ok" });   // ← acknowledge immediately
  processWebhook(req.body).catch(err => {   // ← process async
    logger.error({ err }, "Webhook processing error");
  });
});
```

Never `await processWebhook(...)` before responding.

### Event object types

| `payload.object` | Channel |
|---|---|
| `whatsapp_business_account` | WhatsApp |
| `instagram` | Instagram DM |
| `page` | Facebook Messenger |

### Contact / conversation upsert logic

On every inbound message:
1. Look up contact by `external_id` (sender phone or PSID)
2. If missing → insert new contact
3. Look up conversation by `contact_id`
4. If missing → create `open` conversation
5. If exists and resolved → reopen, reset `unread_count`
6. Insert the message record

### Verify token (current limitation)

The current implementation accepts **any** verify token. For production hardening, each channel stores a `webhook_verify_token` in the DB. The verification handler should compare `hub.verify_token` against all stored tokens and only respond with the challenge if one matches.
