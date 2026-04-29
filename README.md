# Vidgenatar

Automated video generation platform. Submit a script, pick an avatar and voice, and Vidgenatar renders a talking-head video via HeyGen — with ElevenLabs TTS baked in.

## Stack

- **Next.js 15** (App Router, standalone output)
- **Prisma 7** + PostgreSQL
- **BullMQ** + Redis (job queue)
- **HeyGen API** — avatar video rendering
- **ElevenLabs API** — voice sync
- **emails4agents** — magic-link email delivery
- **Deployed on Coolify** at [app.vidgenatar.com](https://app.vidgenatar.com)

## Auth

Magic-link only. Enter your email on `/login`, click the link, get a 7-day session cookie. No passwords.

## API

All endpoints under `/api/v1/` require `Authorization: Bearer <ADMIN_API_KEY>`.

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/v1/videos` | List / create videos |
| GET/PATCH | `/api/v1/videos/:id` | Get / update a video |
| GET/POST | `/api/v1/avatars` | List / create avatars |
| POST | `/api/v1/avatars/sync` | Sync avatars from HeyGen |
| GET/POST | `/api/v1/voices` | List / create voices |
| POST | `/api/v1/voices/sync` | Sync voices from ElevenLabs |
| GET/POST | `/api/v1/clients` | List / create clients |
| GET/POST | `/api/v1/templates` | List / create templates |
| POST | `/api/v1/webhooks` | HeyGen webhook callback |

## Local Development

```bash
cp .env.example .env   # fill in required vars
npm install
npx prisma migrate dev
npm run dev            # web on :9102
```

Run the worker separately:

```bash
npx tsx --tsconfig tsconfig.worker.json worker/index.ts
```

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `HEYGEN_API_KEY` | HeyGen API key |
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `ADMIN_API_KEY` | Secret for API auth |
| `NEXT_PUBLIC_ADMIN_KEY` | Same value, exposed to browser for sync buttons |
| `SESSION_SECRET` | HS256 secret for JWT session tokens (min 32 chars) |
| `MAGIC_LINK_SECRET` | HS256 secret for magic-link JWTs (min 32 chars) |
| `E4A_API_KEY` | emails4agents API key |
| `NEXT_PUBLIC_APP_URL` | Public URL (e.g. `https://app.vidgenatar.com`) |

## Docker / Coolify

The Dockerfile uses a three-stage build (`deps` → `builder` → `runner`). The runner stage uses `pm2-runtime` to manage two processes:

- `vidgenatar-web` — Next.js standalone server
- `vidgenatar-worker` — BullMQ worker via tsx

Coolify writes env vars to `/app/.env`. The pm2 config loads this file at startup via dotenv.
