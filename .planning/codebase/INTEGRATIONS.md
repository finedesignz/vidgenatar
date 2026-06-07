# External Integrations

**Analysis Date:** 2026-06-07

## APIs & External Services

**AI Video Generation:**
- HeyGen — avatar video generation (talking-head videos from audio + avatar selection)
  - SDK/Client: direct `fetch` calls in `services/heygen.ts`
  - Base URLs: `https://api.heygen.com` (v2), `https://upload.heygen.com` (asset upload)
  - Auth: `X-Api-Key` header — env var `HEYGEN_API_KEY`
  - Operations: list stock + custom avatars, upload audio asset, create video, poll video status, retrieve video URL

**Text-to-Speech:**
- ElevenLabs — TTS audio generation for video scripts
  - SDK/Client: direct `fetch` calls in `services/elevenlabs.ts`
  - Base URL: `https://api.elevenlabs.io/v1`
  - Auth: `xi-api-key` header — env var `ELEVENLABS_API_KEY`
  - Model: `eleven_multilingual_v2`, output: `mp3_44100_128`
  - Operations: generate speech per chunk, list available voices

**Email:**
- emails4agents — transactional email (magic-link login emails only)
  - SDK/Client: direct `fetch` to `https://api.emails4agents.com/v1/messages/send` in `lib/email.ts`
  - Auth: `X-API-Key` header — env var `E4A_API_KEY`
  - Inbox: env var `E4A_INBOX_ID`

## Data Storage

**Databases:**
- PostgreSQL — primary data store
  - Connection: env var `DATABASE_URL`
  - Client: Prisma 7 with native `pg` adapter (`@prisma/adapter-pg`), singleton via `lib/db.ts`
  - Schema: `prisma/schema.prisma`
  - Models: `Client`, `Template`, `Avatar`, `Voice`, `VideoJob`, `Asset`, `Webhook`

**File Storage:**
- Local filesystem — rendered video files and intermediate assets stored in `OUTPUT_DIR` (default `./output/`)
- No cloud object storage currently integrated

**Caching / Queue Backend:**
- Redis — BullMQ job queue + magic-link nonce store
  - Connection: env var `REDIS_URL` (default `redis://localhost:6379`)
  - Client: IORedis 5 (`lib/queue.ts`, `lib/nonce.ts`)
  - Queue name: `video-generation`
  - Nonce TTL: 900s (15 min); stored as `ml:nonce:<sha256-of-token>`

## Authentication & Identity

**Auth Provider:**
- Custom magic-link + JWT sessions (no third-party auth provider)
  - Implementation: `lib/auth.ts`, `middleware.ts`, `app/api/auth/`
  - Magic-link flow: `POST /api/auth/send-magic-link` → email → `GET /api/auth/verify?token=<jwt>`
  - Sessions: `vg_session` HTTP-only cookie, HS256 JWT signed with `SESSION_SECRET`, 7-day TTL
  - Magic-link tokens: HS256 JWT, 15-min TTL, single-use enforced via Redis nonce (`lib/nonce.ts`)
  - API auth (programmatic): Bearer token — either `ADMIN_API_KEY` (admin) or client `apiKey` (per `Client` record)
  - Middleware: `middleware.ts` protects all routes except `/login` and `/api/auth/`

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, Datadog, etc.)

**Logs:**
- `console.log` / `console.error` throughout worker (`worker/index.ts`, `worker/pipeline.ts`)
- PM2 log aggregation in production (`pm2.config.js`)

## CI/CD & Deployment

**Hosting:**
- Docker container — multi-stage `Dockerfile` produces a standalone Next.js image
- Configured for Coolify deployment (standard Docker + env injection pattern per global conventions)

**CI Pipeline:**
- Not detected in repo (no GitHub Actions / CI config files present)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` — PostgreSQL DSN
- `REDIS_URL` — Redis DSN
- `SESSION_SECRET` — ≥32-char random string for HMAC
- `ADMIN_API_KEY` — admin API bearer token
- `HEYGEN_API_KEY` — HeyGen REST API key
- `ELEVENLABS_API_KEY` — ElevenLabs REST API key
- `E4A_API_KEY` — emails4agents API key
- `E4A_INBOX_ID` — emails4agents inbox UUID
- `OUTPUT_DIR` — (optional) path for rendered output files

**Secrets location:**
- Injected via Coolify environment at runtime; not committed to repo

## Webhooks & Callbacks

**Incoming:**
- None detected (HeyGen video status is polled, not webhook-pushed)

**Outgoing:**
- Client webhooks: delivery on job completion/failure via `deliverWebhooks()` in `worker/pipeline.ts`
  - Webhook URLs stored in `Webhook` model (linked to `Client`)
  - Payload: job status + video URL
  - Managed via `app/api/v1/webhooks/`

---

*Integration audit: 2026-06-07*
