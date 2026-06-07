# Coding Conventions

**Analysis Date:** 2026-06-07

## Naming Patterns

**Files:**
- React components: `kebab-case.tsx` (e.g., `components/new-video-form.tsx`, `components/jobs-table.tsx`)
- Exception: Storybook subject component uses PascalCase: `components/Button.tsx`
- API routes: Next.js App Router convention — `app/api/v1/<resource>/route.ts`
- Worker stages: `worker/stages/<name>.ts`
- Lib utilities: `lib/<name>.ts`

**Functions:**
- Named exports, camelCase: `authenticate`, `createQueue`, `splitScript`, `buildOpenApiDocument`
- React components: PascalCase named exports: `JobsTable`, `NewVideoForm`, `Button`
- Async handler pattern: `async function GET(req: NextRequest)` / `async function POST(req: NextRequest)`

**Variables:**
- camelCase throughout
- Constants: camelCase (e.g., `SESSION_COOKIE`, `SESSION_TTL` — env-derived consts use UPPER_SNAKE_CASE)

**Types/Interfaces:**
- `type` preferred over `interface` for local prop shapes: `type Props = { ... }`, `type Job = { ... }`
- `interface` used for exported payloads: `interface SessionPayload`, `interface ButtonProps`
- Union types for discriminated contexts: `type AuthContext = { type: 'admin' } | { type: 'client'; clientId: string }`
- Zod schemas for API validation, PascalCase + `Schema` suffix: `CreateVideoSchema`

## Code Style

**Formatting:**
- No Prettier config detected — formatting appears manual/editor-driven
- Single quotes for strings in most files; double quotes in some (inconsistent)
- Trailing commas present in multiline objects/arrays

**Linting:**
- ESLint with `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- Config: `eslint.config.mjs` (flat config format)
- No custom rules beyond Next.js defaults

**TypeScript:**
- `strict: true` in `tsconfig.json`
- `noEmit: true` — compile for type-check only, not output
- `moduleResolution: "bundler"` — Next.js bundler resolution
- Target: `ES2017`, module: `esnext`

## Import Organization

**Order (observed):**
1. Next.js built-ins (`NextRequest`, `NextResponse`, `cookies`, `useRouter`)
2. Third-party packages (`zod`, `jose`, `@prisma/client`)
3. Internal `@/` alias imports (`@/lib/db`, `@/lib/auth`, `@/components/ui/button`)

**Path Aliases:**
- `@/*` maps to repo root (`./`) — defined in `tsconfig.json` and `jest.config.ts`

## Error Handling

**API routes:**
- Auth guard at top of every handler: `const ctx = await authenticate(req); if (!ctx) return unauthorized()`
- Zod validation with `.safeParse()`, return 422 on failure: `Response.json({ error: parsed.error.flatten() }, { status: 422 })`
- Body parse guard: `req.json().catch(() => null)` — returns null on malformed JSON
- Admin-only guard: `if (!ctx || ctx.type !== 'admin') return unauthorized()`

**Lib functions:**
- Return `null` for failure, typed return for success (e.g., `authenticate` returns `AuthContext | null`)
- try/catch with `return null` in auth utils: `verifyMagicLinkToken`, `getSession`
- Empty `catch` blocks only where error is irrelevant (JWT parse failures)

**Client components:**
- `useState<string | null>(null)` for error state
- try/catch/finally pattern with `setLoading` + `setError`
- Error displayed inline: `<p className="text-destructive text-sm">{error}</p>`

## Logging

- No logging framework detected — no `console.log` usage in lib/worker files observed
- Worker pipeline errors likely surface via queue/BullMQ job failure mechanism

## Comments

**When to Comment:**
- Section dividers with `// ── Section name ──` pattern in `lib/auth.ts`
- Inline explanations for non-obvious behavior: `// Side-effect imports: every route...`
- No JSDoc/TSDoc on functions

## Function Design

**Size:** Small, focused functions — most handlers are 10–30 lines
**Parameters:** Typed via TypeScript; Zod-validated for API inputs
**Return Values:** Consistent — API handlers return `Response.json(...)`, lib functions return typed values or `null`

## Module Design

**Exports:**
- Named exports only — no default exports except config files (Next.js/Storybook convention)
- Exception: Next.js page/layout files use `export default async function`

**Barrel Files:** Not used — direct imports from specific module paths

## Component Patterns

**Server Components (default):**
- Async page functions: `export default async function JobsPage()`
- Direct DB access in page files: `await db.videoJob.findMany(...)`
- `export const dynamic = 'force-dynamic'` at top of API routes that read from DB

**Client Components:**
- `'use client'` directive at top of file
- Local state with `useState`, navigation with `useRouter`
- Form handling via `FormData` (uncontrolled inputs), not controlled state

**shadcn/ui Components:**
- UI primitives live in `components/ui/` — `button`, `card`, `input`, `select`, `table`, `textarea`, `badge`, `dialog`, `dropdown-menu`, `form`, `label`
- Consumed directly: `import { Button } from '@/components/ui/button'`
- `cn()` utility from `lib/utils.ts` for conditional Tailwind classes

**Tailwind:**
- Utility classes for all layout/spacing/typography
- `cn()` helper: `twMerge(clsx(...))` pattern from `lib/utils.ts`

## OpenAPI Convention

- Registry pattern: `lib/openapi.ts` exports singleton `registry` + `buildOpenApiDocument()`
- Schemas registered via `registry.register()` with Zod + `@asteasolutions/zod-to-openapi`
- Paths registered via `registry.registerPath()` per route file
- Served at `/openapi.json` (`app/openapi.json/route.ts`) — `force-static`
- Interactive docs via Scalar at `/docs` (`app/docs/route.ts`) — `@scalar/nextjs-api-reference`

---

*Convention analysis: 2026-06-07*
