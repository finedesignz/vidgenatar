# Vidgenatar — Design Spec
**Date:** 2026-04-16

## Overview

Vidgenatar is a fully automated video generation platform. It accepts a script and configuration, generates AI narration via ElevenLabs, and produces an avatar-narrated video via HeyGen. It exposes a REST API for external apps to trigger generation and a web dashboard to manage jobs, avatars, voices, and clients.

Deployed to Coolify. Built with Next.js (TypeScript), PostgreSQL, Redis, and BullMQ.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Job Queue | BullMQ + Redis |
| UI | Tailwind CSS + shadcn/ui |
| Deployment | Coolify (single service + Postgres + Redis) |
| TTS | ElevenLabs API |
| Video | HeyGen API |
| AI Backgrounds | KIE.ai via Nanobanana |

---

## Data Model

### Client
Who the video is produced for. Each client gets an API key for external access.

```
id, name, slug, api_key, created_at
```

### Avatar
A HeyGen avatar registered in the system.

```
id, heygen_avatar_id, name, style, thumbnail_url, created_at
```

### Voice
An ElevenLabs voice registered in the system.

```
id, elevenlabs_voice_id, name, settings (JSON), created_at
```

### VideoJob
Central entity. One job = one video request.

```
id, title, script (text), status, client_id (FK),
avatar_id (FK), voice_id (FK), background (enum: none|ai|url),
background_url, chunks (JSON array of chunk states),
heygen_video_id, video_url, video_file_path,
error_message, created_at, updated_at
```

**Status progression:** `queued → processing → completed | failed`

### Asset
Files attached to a job.

```
id, job_id (FK), type (enum: script|audio|video), file_path, created_at
```

---

## REST API

Base path: `/api/v1/`  
Auth: `Authorization: Bearer <token>` — global admin key or per-client key.

### Video Jobs

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/videos` | Create job, enqueue, return `{ job_id, status: "queued" }` |
| GET | `/api/v1/videos` | List jobs (query: `client_id`, `status`, `limit`, `offset`) |
| GET | `/api/v1/videos/:id` | Get job status, progress, result URL |
| DELETE | `/api/v1/videos/:id` | Cancel a queued job |

**POST /api/v1/videos request body:**
```json
{
  "title": "string",
  "script": "string",
  "avatar_id": "uuid",
  "voice_id": "uuid",
  "client_id": "uuid (optional)",
  "background": "none | ai | url (optional, default: none)",
  "background_url": "string (required if background=url)"
}
```

### Avatars

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/avatars` | List registered avatars |
| POST | `/api/v1/avatars/sync` | Pull avatars from HeyGen into DB |
| POST | `/api/v1/avatars` | Create instant avatar (upload footage to HeyGen) |
| DELETE | `/api/v1/avatars/:id` | Remove from system |

### Voices

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/voices` | List registered voices |
| POST | `/api/v1/voices/sync` | Pull voices from ElevenLabs into DB |
| POST | `/api/v1/voices` | Register a specific voice by ElevenLabs ID |
| DELETE | `/api/v1/voices/:id` | Remove from system |

### Clients

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/clients` | List clients |
| POST | `/api/v1/clients` | Create client |
| PATCH | `/api/v1/clients/:id` | Update client |
| DELETE | `/api/v1/clients/:id` | Delete client |

### Webhooks

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/webhooks` | Register callback URL for job completion |

---

## Job Queue & Pipeline

Jobs are created via API or dashboard, immediately written to the DB with `status: queued`, then pushed to a BullMQ queue. A worker (runs as a separate Next.js process or standalone Node process) picks up jobs and runs the pipeline:

### Pipeline Stages (per job)

1. **Split** — chunk script at sentence boundaries, respect `max_chunk_words` (default 200). Write chunk records into `VideoJob.chunks`.
2. **Audio** — for each chunk, call ElevenLabs TTS API → save MP3 to disk. Run chunks in parallel.
3. **Upload** — POST each MP3 to HeyGen asset upload API → store `asset_id` per chunk.
4. **Video Create** — POST to HeyGen video generate API (avatar + audio asset) per chunk. Batch to max 3 concurrent.
5. **Poll** — poll HeyGen status every 30s per chunk until `completed` or `failed` (20 min timeout).
6. **Download** — download completed MP4s to local storage.

Job status and chunk-level progress are written to PostgreSQL after each stage. The API and dashboard read from DB — no direct worker communication needed.

### Background Generation

If `background: "ai"`, the worker calls KIE.ai (Nanobanana) with a prompt derived from the video title before submitting to HeyGen. The returned image URL is passed as the HeyGen video background.

### Avatar Creation

HeyGen's instant avatar API accepts a video upload. The dashboard and `POST /api/v1/avatars` endpoint accept a video file, upload it to HeyGen, poll for processing completion, then store the resulting `avatar_id`.

### Resumability

Each chunk's state (`audio_generated`, `heygen_asset_id`, `heygen_video_id`, `video_status`) is persisted in the `VideoJob.chunks` JSON column. If a worker crashes mid-job, re-queuing the job skips already-completed chunks.

---

## Dashboard

Five pages, built with Next.js App Router + Tailwind + shadcn/ui:

### Jobs (home `/`)
- Table: title, client, status badge, created date, action buttons
- Status badge colors: queued=gray, processing=blue (with spinner), completed=green, failed=red
- Download button on completed jobs
- Filter bar: by client, by status

### New Video (`/videos/new`)
- Fields: title, script (textarea), avatar (dropdown), voice (dropdown), client (dropdown, optional), background (radio: none / AI-generated / custom URL)
- Submit → POST to API → redirect to job detail page

### Avatars (`/avatars`)
- Grid of avatar cards with thumbnail, name, HeyGen ID
- "Sync from HeyGen" button
- "Create New Avatar" button → modal with video file upload + name field

### Voices (`/voices`)
- List of voices with name and settings summary
- "Sync from ElevenLabs" button → shows available voices to select and register

### Clients (`/clients`)
- Table: name, slug, job count, API key (masked with reveal button)
- Create / edit / delete actions

---

## Configuration

Environment variables (`.env`):

```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
HEYGEN_API_KEY=
ELEVENLABS_API_KEY=
KIE_API_KEY=
ADMIN_API_KEY=        # master key for admin API access
```

---

## Deployment (Coolify)

- One Coolify service running two processes: Next.js app + standalone `worker.ts` Node process, managed via a `Procfile` or `pm2`
- Coolify-managed PostgreSQL
- Coolify-managed Redis
- Port: 9102 (new project, safe range)
- Output files (audio, video) stored in a mounted volume
