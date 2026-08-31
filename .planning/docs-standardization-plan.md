# Docs Standardization Plan — vidgenatar

## Goal
Next.js fullstack (port 9109) → OpenAPI + Scalar + Storybook.

## Current state
- Root `README.md`, `CLAUDE.md`, `docs/`.
- Next.js + React.

## Tasks
1. Add `next-openapi-gen` + `@scalar/nextjs-api-reference`.
2. `app/openapi.json/route.ts` + `app/docs/page.tsx`.
3. `npx storybook@latest init`.
4. `package.json` `docs:sync` — curl openapi → widdershins → `docs/api.md`.
5. `.github/workflows/docs-drift.yml` — `stack: nextjs`, `start_cmd: 'npm run dev'`, `health_url: 'http://localhost:9109/api/healthz'`.

## Acceptance
- `/docs` renders. Storybook builds. CI green.

## Effort: M
