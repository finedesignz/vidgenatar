# Technology Stack

**Analysis Date:** 2026-06-07

## Languages

**Primary:**
- TypeScript 5.x — all application code (Next.js app, worker, services, Remotion compositions)

**Secondary:**
- CSS (Tailwind 4) — styling via PostCSS pipeline

## Runtime

**Environment:**
- Node.js 20 (Alpine) — per `Dockerfile` base image

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.2.4 — full-stack React framework (App Router), configured standalone output (`next.config.ts`)
- React 19.2.4 — UI rendering
- Remotion 4.0.448 — programmatic video rendering (`remotion/`, `@remotion/renderer`, `@remotion/bundler`, `@remotion/player`)

**UI:**
- Tailwind CSS 4 — utility-first styling
- Radix UI (dialog, dropdown-menu, label, select, slot) — headless primitives
- shadcn/ui conventions via `components.json`
- class-variance-authority + clsx + tailwind-merge — variant/class utilities
- lucide-react 1.8.0 — icons

**Forms:**
- react-hook-form 7.x + @hookform/resolvers — form state management
- Zod 4.x — schema validation

**Background Processing:**
- BullMQ 5.x — Redis-backed job queue (`lib/queue.ts`, `worker/index.ts`)
- IORedis 5.x — Redis client

**Testing:**
- Jest 30.x + ts-jest — unit test runner
- Config: `jest.config.ts`, test environment: node

**Build/Dev:**
- tsx 4.x — TypeScript execution for worker and scripts
- PostCSS + @tailwindcss/postcss 4 — CSS processing
- ESLint 9 + eslint-config-next 16.2.4 — linting (`eslint.config.mjs`)
- Storybook 8.6.x — component development (`@storybook/nextjs`, `@storybook/react`)

**Process Management:**
- PM2 6.x — production process management (`pm2.config.js`, `Procfile`)

## Key Dependencies

**Critical:**
- `@prisma/client` 7.7.0 + `@prisma/adapter-pg` 7.7.0 — ORM with native Postgres driver; schema at `prisma/schema.prisma`
- `pg` 8.x — underlying Postgres driver
- `bullmq` + `ioredis` — async video job queue backed by Redis
- `@remotion/renderer` + `@remotion/bundler` — server-side video rendering (excluded from Next.js bundling via `serverExternalPackages`)
- `jose` 6.x — JWT creation/verification (magic-link auth + session cookies)
- `zod` 4.x — request validation and OpenAPI schema generation
- `@asteasolutions/zod-to-openapi` 8.5.0 — OpenAPI spec generation from Zod schemas
- `@scalar/nextjs-api-reference` 0.10.19 — `/docs` API explorer

**Infrastructure:**
- `music-metadata` 11.x — audio file parsing (used in video pipeline)
- `uuid` 13.x — ID generation
- `dotenv` 17.x — env loading in worker/scripts

## Configuration

**Environment (required vars):**
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection (default: `redis://localhost:6379`)
- `SESSION_SECRET` — HMAC secret for JWT session/magic-link tokens
- `ADMIN_API_KEY` — admin bearer token for API auth
- `HEYGEN_API_KEY` — HeyGen API key
- `ELEVENLABS_API_KEY` — ElevenLabs TTS API key
- `E4A_API_KEY` — emails4agents API key
- `E4A_INBOX_ID` — emails4agents inbox ID
- `OUTPUT_DIR` — local path for rendered video output (default: `./output`)

**Build:**
- `next.config.ts` — `output: 'standalone'`, `serverExternalPackages: ['@remotion/renderer', '@remotion/bundler']`
- `tsconfig.json` — ES2017 target, bundler module resolution, `@/` path alias
- `tsconfig.worker.json` — separate TS config for worker process
- `postcss.config.mjs` — Tailwind PostCSS integration
- `remotion/remotion.config.ts` — Remotion bundler config

## Platform Requirements

**Development:**
- Node.js 20
- PostgreSQL (via `DATABASE_URL`)
- Redis (BullMQ queue + nonce store)

**Production:**
- Docker multi-stage build (deps → builder → runner)
- Alpine Linux runner with Chromium installed (for Remotion/Puppeteer headless rendering)
- `PUPPETEER_SKIP_DOWNLOAD=true`, `CHROME_PATH=/usr/bin/chromium-browser`
- PM2 or standalone Node process; worker runs separately (`npm run worker`)

---

*Stack analysis: 2026-06-07*
