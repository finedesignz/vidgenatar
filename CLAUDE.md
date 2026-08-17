<!-- template-version: 1 -->
<!-- repo-align-template: dev v1 -->

@AGENTS.md

## Purpose

Automated video generation platform. Submit a script, pick an avatar and voice, and
Vidgenatar renders a talking-head video via HeyGen — with ElevenLabs TTS baked in.

## Stack

- Next.js 15 (App Router, standalone output)
- Prisma 7 + PostgreSQL
- BullMQ + Redis (job queue)
- HeyGen API — avatar video rendering
- ElevenLabs API — voice sync
- emails4agents — magic-link email delivery
- Storybook (component development)

## Commands

```powershell
# install
npm ci

# dev (long-lived — run with run_in_background: true)
npm run dev

# worker (long-lived — run with run_in_background: true)
npm run worker:dev

# build
npm run build

# lint
npm run lint

# docs
npm run docs-sync   # regenerates docs/openapi.json via scripts/dump-openapi.ts

# storybook (long-lived — run with run_in_background: true)
npm run storybook
```

## Deploy target

Coolify, at app.vidgenatar.com. `Dockerfile` is a 3-stage build (deps -> builder -> runner)
targeting `node:20-alpine`; Prisma client generation uses a dummy `DATABASE_URL` at build
time (real URL injected at runtime). Chromium is installed in the runner stage for
Puppeteer-based work (`PUPPETEER_SKIP_DOWNLOAD=true`, `CHROME_PATH` set explicitly).

## Repo conventions

Auth is magic-link only (email -> link -> 7-day session cookie, no passwords). CI already
on self-hosted Woodpecker (`.woodpecker/docs-drift.yaml`, ported from GitHub Actions in PR
#12) — no `.github/workflows/` present on `origin/main`, so this repo is fully migrated,
not GHA-only as an earlier audit pass assumed.

## GSD state

`.planning/` directory present on `origin/main` but no `STATE.md` found at the top level in
this pass — check `.planning/` directly for the current milestone/phase structure before
assuming GSD is inactive.

## Gotchas

- `CLAUDE.md` is a Claude Code import pointer (`@AGENTS.md`) — `AGENTS.md` itself is a
  short Next.js training-data-drift warning ("read `node_modules/next/dist/docs/` before
  writing any code, this version has breaking API changes"). Keep both files in sync if
  either is edited; don't let this repo-align pass silently diverge them.
- A stray `CLAUDE.md.bak` exists at the repo root on `origin/main` — not touched by this
  pass; flag to the owner if it's meant to be removed.
