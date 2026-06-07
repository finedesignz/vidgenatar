<!-- refreshed: 2026-06-07 -->
# Architecture

**Analysis Date:** 2026-06-07

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    Next.js App Router (port 3000)                    │
├──────────────────────┬──────────────────┬───────────────────────────┤
│   Server Pages (RSC) │  Client Components│    API Routes             │
│  `app/**/page.tsx`   │ `components/*.tsx`│  `app/api/**`             │
│  Direct DB reads     │ `'use client'`    │  Auth + CRUD + sync       │
└──────────┬───────────┴────────┬──────────┴──────────┬───────────────┘
           │                    │                      │
           ▼ (Prisma)           ▼ (fetch /api/v1/)     ▼ (BullMQ enqueue)
┌──────────────────────────────────────────────────────────────────────┐
│                       PostgreSQL (Prisma ORM)                        │
│                       `prisma/schema.prisma`                         │
└──────────────────────────────────────────────────────────────────────┘
                                                       │
                                                       ▼ (Redis queue)
┌──────────────────────────────────────────────────────────────────────┐
│                     BullMQ Worker (separate process)                 │
│                     `worker/index.ts` → `worker/pipeline.ts`         │
│                     concurrency: 2, attempts: 2 with backoff         │
└───┬──────────┬───────────────┬─────────────────────┬────────────────┘
    │          │               │                     │
    ▼          ▼               ▼                     ▼
ElevenLabs   HeyGen       Remotion renderer    Local filesystem
`services/   `services/   `remotion/`          `output/`
elevenlabs`  heygen.ts`   (bundled render)     audio/bg/video
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Middleware | JWT session guard on all non-public routes | `middleware.ts` |
| App Router pages | Server-rendered UI, direct DB reads (no API layer) | `app/**/page.tsx` |
| API routes `/api/auth/*` | Magic-link send/verify, logout | `app/api/auth/*/route.ts` |
| API routes `/api/v1/*` | REST CRUD for videos, avatars, voices, clients, templates, webhooks | `app/api/v1/**/route.ts` |
| `lib/auth.ts` | Dual auth: Bearer token (API clients) + JWT cookie (browser session) | `lib/auth.ts` |
| `lib/db.ts` | Prisma client singleton | `lib/db.ts` |
| `lib/queue.ts` | BullMQ Queue + Redis connection factory | `lib/queue.ts` |
| Worker entry | BullMQ Worker process, concurrency 2 | `worker/index.ts` |
| Pipeline | Orchestrates all video generation stages for one job | `worker/pipeline.ts` |
| Stage: split | Breaks script into chunks | `worker/stages/split.ts` |
| Stage: audio | ElevenLabs TTS per chunk | `worker/stages/audio.ts` |
| Stage: upload | Upload audio asset to HeyGen | `worker/stages/upload.ts` |
| Stage: video | Create + poll HeyGen video per chunk | `worker/stages/video.ts` |
| Stage: remotion-render | Render Remotion template to background MP4 | `worker/stages/remotion-render.ts` |
| Services | Thin HTTP wrappers for external APIs | `services/heygen.ts`, `services/elevenlabs.ts` |
| Components (RSC-compatible) | Server-renderable UI pieces (no hooks) | `components/jobs-table.tsx`, `components/status-badge.tsx`, etc. |
| Components (client) | Interactive forms and nav | `components/new-video-form.tsx`, `components/shell.tsx`, `components/nav.tsx` |

## Pattern Overview

**Overall:** Server-first App Router with background job queue

**Key Characteristics:**
- Server Components do direct Prisma queries — no client-side data fetching on read paths
- Client Components (`'use client'`) are leaf nodes: forms and nav only
- API routes serve external REST clients and client-side form POSTs (`/api/v1/videos POST`)
- Video generation is fully async: HTTP responds with `job_id` immediately, BullMQ worker does the heavy lifting in a separate Node process
- Pipeline is resumable: chunk state stored as JSON in `VideoJob.chunks` column; completed chunks are skipped on retry

## Layers

**Presentation (Server Components):**
- Purpose: Render pages with fresh DB data on every request
- Location: `app/**/page.tsx`
- Contains: Async server components that call `db.*` directly
- Depends on: `lib/db.ts`, client components for interactive parts
- Used by: Next.js router

**Presentation (Client Components):**
- Purpose: Interactive UI requiring browser APIs or state
- Location: `components/*.tsx` (files with `'use client'` directive)
- Contains: Forms, nav, shell layout
- Depends on: `fetch` to `/api/v1/` for mutations
- Key files: `components/new-video-form.tsx`, `components/shell.tsx`, `components/avatar-tabs.tsx`

**API Layer:**
- Purpose: Authenticated REST endpoints for external integrations and browser form POSTs
- Location: `app/api/`
- Contains: Route handlers with Zod validation + `authenticate()`
- Depends on: `lib/auth.ts`, `lib/db.ts`, `lib/queue.ts`
- Auth: `Authorization: Bearer <token>` (API clients) or `vg_session` cookie (browser)

**Service Layer:**
- Purpose: Thin typed wrappers around external HTTP APIs
- Location: `services/`
- Contains: `heygen.ts` (avatar list, audio upload, video create/poll), `elevenlabs.ts` (TTS)
- Depends on: `process.env.HEYGEN_API_KEY`, `process.env.ELEVENLABS_API_KEY`
- Used by: Worker pipeline stages only

**Worker:**
- Purpose: Long-running BullMQ consumer that generates videos off the request path
- Location: `worker/`
- Entry: `worker/index.ts` — spawned as a separate process via `Procfile`/pm2
- Depends on: `lib/db.ts`, `lib/queue.ts`, `services/`, `remotion/`
- Does NOT depend on Next.js runtime

**Data Layer:**
- Purpose: Type-safe Postgres access
- Location: `lib/db.ts` (singleton), `prisma/schema.prisma`
- Contains: Prisma client, schema with Client, Avatar, Voice, Template, VideoJob, Asset, Webhook models

## Data Flow

### Video Generation (primary path)

1. Browser POSTs form → `components/new-video-form.tsx` calls `fetch('/api/v1/videos', { method: 'POST' })`
2. `app/api/v1/videos/route.ts:POST` — validates via Zod, `authenticate()`, creates `VideoJob` row (status: `queued`)
3. `lib/queue.ts:createQueue().add('generate', { jobId })` — enqueues to Redis BullMQ queue `video-generation`
4. Returns `{ job_id, status: 'queued' }` with HTTP 201 — browser redirects to jobs list
5. `worker/index.ts` Worker picks up job → calls `worker/pipeline.ts:runPipeline(jobId)`
6. Pipeline Stage 0 (optional): `worker/stages/remotion-render.ts` renders Remotion composition to `output/background/<jobId>-bg.mp4`
7. Pipeline Stage 1: `worker/stages/split.ts` splits script into chunks
8. Pipeline Stages 2+3 (parallel batches of 3): `worker/stages/audio.ts` (ElevenLabs TTS) → `worker/stages/upload.ts` (upload to HeyGen)
9. Pipeline Stages 4-6 (parallel batches of 3): `worker/stages/video.ts` creates + polls HeyGen video per chunk
10. Job status updated to `completed`/`failed` in `VideoJob` row; `worker/pipeline.ts:deliverWebhooks()` fires outgoing webhooks

### Authentication (browser)

1. User submits email → `app/api/auth/send-magic-link/route.ts` issues JWT with `purpose: 'magic-link'` (15 min TTL)
2. Email link hits `app/api/auth/verify/route.ts` → `lib/auth.ts:createSession()` sets `vg_session` httpOnly cookie (JWT, 7 day TTL)
3. `middleware.ts` verifies `vg_session` JWT on every non-public request; redirects to `/login` on failure

### Avatar/Voice Sync

1. Admin calls `POST /api/v1/avatars/sync` → `app/api/v1/avatars/sync/route.ts`
2. Calls `services/heygen.ts:listAvatars()` (both stock + custom in parallel)
3. Upserts to `Avatar` table via Prisma
4. Same pattern for `POST /api/v1/voices/sync` → `services/elevenlabs.ts`

**State Management:**
- Server pages: stateless per-request DB reads
- Client components: local `useState` only; no global state store
- Job progress: stored as `VideoJob.chunks` JSON in Postgres; worker reads/writes directly

## Key Abstractions

**ChunkState:**
- Purpose: Tracks per-chunk progress through the pipeline stages
- Definition: `lib/types.ts`
- Stored as: JSON array in `VideoJob.chunks` column
- Fields: `part`, `audioGenerated`, `audioDurationSec`, `audioFile`, `heygenAssetId`, `heygenVideoId`, `videoStatus`, `videoFile`

**AuthContext:**
- Purpose: Discriminated union identifying request origin
- Definition: `lib/types.ts`
- Values: `{ type: 'admin' }` | `{ type: 'client'; clientId: string }`
- Used by: all `/api/v1/` route handlers via `authenticate(req)`

**VideoJob:**
- Purpose: Central entity tracking a video from request to delivery
- Location: `prisma/schema.prisma` (model `VideoJob`)
- Status enum: `queued → processing → completed | failed`

## Entry Points

**Web Server:**
- Location: `app/layout.tsx` (root layout), `app/page.tsx` (home = jobs list)
- Triggers: Next.js request handling
- Responsibilities: Render server-side pages with direct DB access

**Worker Process:**
- Location: `worker/index.ts`
- Triggers: `npm run worker` (separate process from web server; see `Procfile`, `pm2.config.js`)
- Responsibilities: Consume BullMQ queue, run video generation pipeline

**Middleware:**
- Location: `middleware.ts`
- Triggers: Every Next.js request matching the `matcher` pattern
- Responsibilities: JWT session validation, redirect to `/login` on failure

## Architectural Constraints

- **Process separation:** Web server and worker are separate Node processes. Worker must be started independently (`npm run worker` / pm2 / Procfile). The Next.js process enqueues only — it never runs pipeline code.
- **Redis dependency:** BullMQ requires Redis. `REDIS_URL` env var; defaults to `redis://localhost:6379`.
- **Remotion external packages:** `next.config.ts` marks `@remotion/renderer` and `@remotion/bundler` as `serverExternalPackages` — they cannot run in edge runtime; worker uses Node runtime.
- **Global state:** Prisma client is a module-level singleton in `lib/db.ts`. Redis connections created per-use via factory `createRedisConnection()`.
- **Circular imports:** None detected.
- **Output directory:** Pipeline writes audio/video files to `output/` (configurable via `OUTPUT_DIR` env). Must be writable and accessible to both worker and the download endpoint.

## Anti-Patterns

### Direct DB calls from Server Components (intentional, not a bug)
**What happens:** `app/page.tsx`, `app/videos/new/page.tsx`, etc. call `db.videoJob.findMany()` directly — no API route.
**Why it's intentional:** This is the App Router pattern. Server Components run on the server; calling the DB directly avoids an unnecessary HTTP round-trip.
**Do NOT add API route wrappers** for server-to-server reads. API routes at `/api/v1/` are for external REST clients and client-side mutations only.

### Client components only at the leaf
**What happens:** `'use client'` is only declared on leaf interactive components (`new-video-form.tsx`, `shell.tsx`, `avatar-tabs.tsx`).
**Why:** Prevents unnecessary client bundles. Parent page components stay as RSC.
**Do this instead:** Keep pages as `async` server components; pass fetched data as props to client form components.

## Error Handling

**Strategy:** Fail-fast with status codes; pipeline errors stored in DB.

**Patterns:**
- API routes: Zod validation returns 422 with `error.flatten()`; auth failures return 401 via `unauthorized()`
- Pipeline: `try/catch` in `runPipeline`; on error, updates `VideoJob.status = 'failed'` and `VideoJob.errorMessage`, fires webhooks, re-throws (BullMQ marks job as failed, triggers retry with backoff)
- Webhook delivery: fire-and-forget with `console.warn` on failure — delivery failures do not fail the job

## Cross-Cutting Concerns

**Logging:** `console.log/warn/error` with `[Worker]`/`[Pipeline]` prefixes. No structured logging library.
**Validation:** Zod schemas inline in route handlers. No shared schema library.
**Authentication:** `lib/auth.ts` — dual-mode Bearer token (API) + JWT cookie (browser). Middleware enforces cookie auth on all pages.

---

*Architecture analysis: 2026-06-07*
