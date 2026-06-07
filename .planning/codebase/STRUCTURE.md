# Codebase Structure

**Analysis Date:** 2026-06-07

## Directory Layout

```
vidgenatar/
├── app/                        # Next.js App Router root
│   ├── layout.tsx              # Root layout (Outfit font, Shell wrapper)
│   ├── page.tsx                # Home page = jobs list (RSC, direct DB)
│   ├── login/                  # Magic-link login page
│   ├── avatars/                # Avatar management page
│   ├── voices/                 # Voice management page
│   ├── clients/                # Client management page
│   ├── templates/              # Template management page
│   ├── videos/
│   │   └── new/                # New video form page
│   ├── docs/                   # Scalar API docs page
│   ├── openapi.json/           # OpenAPI spec route
│   └── api/
│       ├── auth/
│       │   ├── send-magic-link/route.ts   # POST — issue magic link JWT
│       │   ├── verify/route.ts            # GET  — verify token, set session cookie
│       │   └── logout/route.ts            # POST — destroy session
│       ├── download/route.ts              # GET  — stream local video file
│       ├── health/route.ts                # GET  — health check
│       └── v1/
│           ├── avatars/
│           │   ├── route.ts              # GET/POST avatars
│           │   ├── [id]/route.ts         # GET/PATCH/DELETE avatar
│           │   └── sync/route.ts         # POST — pull from HeyGen
│           ├── voices/
│           │   ├── route.ts              # GET/POST voices
│           │   ├── [id]/route.ts         # GET/PATCH/DELETE voice
│           │   └── sync/route.ts         # POST — pull from ElevenLabs
│           ├── videos/
│           │   ├── route.ts              # GET list / POST create + enqueue
│           │   └── [id]/route.ts         # GET single video job
│           ├── clients/
│           │   ├── route.ts              # GET/POST clients
│           │   └── [id]/route.ts         # GET/PATCH/DELETE client
│           ├── templates/
│           │   ├── route.ts              # GET/POST templates
│           │   ├── [id]/route.ts         # GET/PATCH/DELETE template
│           │   └── [id]/preview/route.ts # POST — trigger Remotion preview render
│           └── webhooks/route.ts         # POST — register outgoing webhook
├── components/                 # Shared React components
│   ├── shell.tsx               # 'use client' — layout shell (nav + main)
│   ├── nav.tsx                 # 'use client' — sidebar navigation
│   ├── new-video-form.tsx      # 'use client' — video creation form
│   ├── avatar-tabs.tsx         # 'use client' — stock/custom avatar tabs
│   ├── jobs-table.tsx          # RSC-compatible jobs list table
│   ├── sync-button.tsx         # 'use client' — trigger sync API calls
│   ├── magic-link-form.tsx     # 'use client' — login form
│   ├── status-badge.tsx        # RSC-compatible status indicator
│   └── ui/                     # shadcn/ui primitives
├── lib/                        # Server-side utilities (no React)
│   ├── auth.ts                 # JWT magic-link + session creation/verification
│   ├── db.ts                   # Prisma client singleton
│   ├── queue.ts                # BullMQ Queue/Worker/Events factory
│   ├── email.ts                # Email sending utility
│   ├── nonce.ts                # Nonce generation for magic links
│   ├── openapi.ts              # OpenAPI spec builder
│   ├── types.ts                # Shared TypeScript types (ChunkState, AuthContext, VideoJobData)
│   └── utils.ts                # General helpers
├── services/                   # External API clients (pure HTTP, no DB)
│   ├── heygen.ts               # HeyGen REST API: listAvatars, uploadAudio, createVideo, pollVideo
│   └── elevenlabs.ts           # ElevenLabs REST API: listVoices, generateAudio
├── worker/                     # BullMQ worker process (separate from Next.js)
│   ├── index.ts                # Worker entry point — consumes queue-name 'video-generation'
│   ├── pipeline.ts             # runPipeline() — orchestrates all stages for one job
│   └── stages/
│       ├── split.ts            # splitScript() — splits script text into chunks
│       ├── audio.ts            # generateAudioForChunk() — ElevenLabs TTS
│       ├── upload.ts           # uploadChunkAudio() — upload audio asset to HeyGen
│       ├── video.ts            # createAndPollChunkVideo() — HeyGen video create + poll
│       └── remotion-render.ts  # renderTemplate() — Remotion SSR render to file
├── remotion/                   # Remotion video compositions
│   ├── components/             # Remotion visual components
│   ├── compositions/           # Named compositions (compositionId matches DB)
│   └── lib/                    # Remotion helpers
├── prisma/
│   ├── schema.prisma           # DB schema: Client, Avatar, Voice, Template, VideoJob, Asset, Webhook
│   └── seed.ts                 # Seed data
├── docs/
│   └── superpowers/            # Feature specs and plans
├── tests/                      # Test files
├── scripts/                    # One-off utility scripts
├── output/                     # Generated files (gitignored)
│   ├── audio/                  # ElevenLabs-generated .mp3 files
│   ├── background/             # Remotion-rendered background .mp4 files
│   └── video/                  # Downloaded HeyGen output videos
├── heygen-studio-template/     # HeyGen template development artifacts
├── public/                     # Static assets
├── middleware.ts               # JWT session guard (Next.js middleware)
├── next.config.ts              # Next.js config (standalone output, Remotion externals)
├── tsconfig.json               # Main TypeScript config
├── tsconfig.worker.json        # Worker-specific TypeScript config
├── pm2.config.js               # PM2 process config (web + worker)
├── Procfile                    # Heroku/Railway process declarations
└── Dockerfile                  # Container image (standalone Next.js)
```

## Directory Purposes

**`app/`:**
- Purpose: All Next.js App Router pages and API routes
- Contains: RSC page components, `layout.tsx`, `globals.css`, API route handlers
- Key files: `app/layout.tsx`, `app/page.tsx`, `app/api/v1/videos/route.ts`

**`components/`:**
- Purpose: Reusable React components — both server-compatible and client
- Contains: Feature components, `ui/` shadcn primitives
- Key files: `components/new-video-form.tsx`, `components/jobs-table.tsx`, `components/shell.tsx`

**`lib/`:**
- Purpose: Server-side utilities shared across app and worker
- Contains: Auth helpers, Prisma singleton, BullMQ factory, shared types
- Key files: `lib/auth.ts`, `lib/db.ts`, `lib/queue.ts`, `lib/types.ts`

**`services/`:**
- Purpose: Thin, stateless HTTP clients for external APIs
- Contains: HeyGen and ElevenLabs API wrappers
- Key files: `services/heygen.ts`, `services/elevenlabs.ts`

**`worker/`:**
- Purpose: Background job processor — runs as a separate Node process
- Contains: BullMQ worker entry, pipeline orchestrator, stage functions
- Key files: `worker/index.ts`, `worker/pipeline.ts`

**`remotion/`:**
- Purpose: Video composition definitions for background rendering
- Contains: Remotion components, compositions, helpers
- Note: Compositions are referenced by `compositionId` stored in `Template.compositionId`

**`prisma/`:**
- Purpose: Database schema and migrations
- Contains: `schema.prisma`, seed script

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Next.js root layout
- `worker/index.ts`: Worker process entry
- `middleware.ts`: Request auth guard

**Configuration:**
- `next.config.ts`: Next.js (standalone, Remotion externals)
- `tsconfig.json`: Main TS config (path alias `@/` → root)
- `tsconfig.worker.json`: Worker TS config
- `pm2.config.js`: Process management (web + worker)
- `prisma/schema.prisma`: Full data model

**Core Logic:**
- `lib/auth.ts`: All auth logic (magic-link + session + Bearer token)
- `lib/queue.ts`: BullMQ queue factory
- `worker/pipeline.ts`: Video generation pipeline
- `services/heygen.ts`: HeyGen API client

**Testing:**
- `tests/`: Test files
- `jest.config.ts`: Jest configuration

## Naming Conventions

**Files:**
- Route handlers: `route.ts` (required by Next.js)
- Page components: `page.tsx` (required by Next.js)
- Component files: `kebab-case.tsx` (e.g., `new-video-form.tsx`, `jobs-table.tsx`)
- Library files: `kebab-case.ts` (e.g., `auth.ts`, `db.ts`)
- Stage files: `kebab-case.ts` verb-noun (e.g., `remotion-render.ts`, `split.ts`)

**Directories:**
- App Router segments: `kebab-case` (e.g., `send-magic-link`, `videos`)
- Dynamic segments: `[id]` bracket notation
- API versioning: `v1/` prefix under `api/`

**Exports:**
- Named exports for components (e.g., `export function JobsTable`)
- Named exports for utilities
- Default export for Next.js pages and layouts only

## Where to Add New Code

**New API resource (e.g., a `projects` entity):**
- Schema: `prisma/schema.prisma` — add model
- Routes: `app/api/v1/projects/route.ts` (list/create), `app/api/v1/projects/[id]/route.ts` (get/update/delete)
- Page: `app/projects/page.tsx` (server component, direct `db.project.findMany()`)
- Table component: `components/projects-table.tsx`
- OpenAPI: update `lib/openapi.ts`

**New pipeline stage:**
- Add `worker/stages/<verb>.ts` exporting a single async function
- Import and call in `worker/pipeline.ts` in the correct sequence
- Update `ChunkState` in `lib/types.ts` if new fields are needed

**New external service integration:**
- Add `services/<service-name>.ts` with typed HTTP wrapper functions
- Use in worker stages only (not in API routes or pages)
- Read API key from `process.env.<SERVICE>_API_KEY`

**New Remotion composition:**
- Add composition in `remotion/compositions/`
- Register `compositionId` in the `Template` table via seed or admin UI

**New shadcn/ui component:**
- Scaffold to `components/ui/` (standard shadcn convention)

## Special Directories

**`output/`:**
- Purpose: Runtime-generated audio/video files
- Generated: Yes (by worker pipeline)
- Committed: No (gitignored)
- Configurable: `OUTPUT_DIR` env var (default `./output`)

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No

**`heygen-studio-template/`:**
- Purpose: HeyGen template development scripts and outputs
- Generated: Partially
- Committed: Yes (scripts), outputs gitignored

**`.planning/`:**
- Purpose: GSD planning documents, codebase maps, phase plans
- Generated: By GSD commands
- Committed: Yes

---

*Structure analysis: 2026-06-07*
