# Codebase Concerns

**Analysis Date:** 2026-06-07

## Security Considerations

**Admin API key exposed to browser via NEXT_PUBLIC env var:**
- Risk: `NEXT_PUBLIC_ADMIN_KEY` is embedded in the client-side JS bundle and visible to any user inspecting page source or network requests. This gives any browser user full admin API access.
- Files: `components/new-video-form.tsx:45`, `components/sync-button.tsx:18`, `pm2.config.js:22`
- Current mitigation: None — the key is sent as a `Bearer` token directly from client components.
- Recommendations: Move admin API calls to server-side Next.js API routes or Server Actions. The frontend should call a session-authenticated server action that internally uses the admin key from a server-only env var.

**Unauthenticated path traversal / arbitrary file read via `/api/download`:**
- Risk: `app/api/download/route.ts` accepts a `?path=` query param, calls `path.resolve()` on it, and streams back any file that exists on the filesystem. There is no auth check and no path sandboxing. An attacker can read `/etc/passwd`, `.env`, private keys, DB dumps, etc.
- Files: `app/api/download/route.ts:7-23`
- Current mitigation: None — route has no `authenticate()` call.
- Recommendations: (1) Add `authenticate()` guard immediately. (2) Sandbox resolved path to `OUTPUT_DIR`. (3) Reject any path that resolves outside the allowed directory.

**Magic-link rate limit is in-process memory only:**
- Risk: `rateLimitMap` in `app/api/auth/send-magic-link/route.ts` is a module-level `Map`. In production the Next.js app runs under PM2 — if the process restarts or a second instance is ever started, the map resets, defeating the rate limit entirely.
- Files: `app/api/auth/send-magic-link/route.ts:8-19`
- Current mitigation: Redis nonce store exists (`lib/nonce.ts`) but is not used for rate limiting.
- Recommendations: Move rate-limit counters to Redis with a TTL key (`ml:rl:<email>` with `INCR`/`EXPIRE`), consistent with the existing nonce infrastructure.

**Magic-link allows sign-in by any email address:**
- Risk: There is no allowlist check. Any email address can trigger a magic link and, if the link is clicked, receives a valid session. This app appears to be an internal admin tool, not a public SaaS.
- Files: `app/api/auth/send-magic-link/route.ts:25-32`, `lib/auth.ts`
- Current mitigation: None.
- Recommendations: Add an `ALLOWED_EMAILS` or `ALLOWED_EMAIL_DOMAINS` env var check before sending the link. Fail silently (return 200) to avoid email enumeration.

**`disableWebSecurity: true` in Chromium/Remotion renderer:**
- Risk: The Remotion render stage launches Chromium with web security disabled, which bypasses CORS and same-origin policy inside the renderer. If template composition props are user-controlled (they are — `templateProps` flows from the API request), this could allow SSRF or data exfiltration from the render sandbox.
- Files: `worker/stages/remotion-render.ts:40`
- Current mitigation: None.
- Recommendations: Remove `disableWebSecurity` unless a concrete reason exists. If required for asset loading, scope it narrowly and sanitize `inputProps` before passing to Remotion.

**`E4A_INBOX_ID` hardcoded fallback in `lib/email.ts`:**
- Risk: A real inbox UUID (`08fb192d-a3e3-4717-87d2-2bd2ac212b02`) is hardcoded as a fallback when `E4A_INBOX_ID` env var is absent. This will silently send production emails from the wrong inbox if the env var is not set.
- Files: `lib/email.ts:2`
- Current mitigation: None — the fallback silently uses a potentially shared/default inbox.
- Recommendations: Remove the fallback; throw if `E4A_INBOX_ID` is not set, consistent with how `E4A_API_KEY` is used (non-null assertion `!`).

---

## Tech Debt

**Dockerfile EXPOSE port mismatch (uncommitted change):**
- Issue: `Dockerfile` has an uncommitted change (`git diff HEAD`) that updates `EXPOSE` from `9102` to `9109`. However, `pm2.config.js` still hardcodes `PORT: '9102'` for the web process. The two values are out of sync, and neither matches any documented port assignment.
- Files: `Dockerfile:35`, `pm2.config.js:16`
- Impact: Container port mapping will be wrong. Caddy/reverse-proxy routing will break silently.
- Fix approach: Decide on a canonical port, update both `Dockerfile` `EXPOSE` and `pm2.config.js` `PORT` to match, commit together.

**`chunks` field stored as opaque JSON in `VideoJob`:**
- Issue: Pipeline state (`ChunkState[]`) is serialized into a Prisma JSON column with double-casts (`as unknown as never`). This bypasses all type safety for the most complex state machine in the app.
- Files: `worker/pipeline.ts:92,109,124,135`, `lib/types.ts` (ChunkState)
- Impact: Schema drift is invisible to TypeScript; a bug in serialization silently corrupts job state; no DB-level constraints on chunk structure.
- Fix approach: Model chunk state as a proper Prisma relation (`VideoJobChunk` table) or at minimum add a Zod parse on read.

**`bundleCache` module singleton in Remotion renderer:**
- Issue: `worker/stages/remotion-render.ts` caches the Remotion bundle path in a module-level variable. If the worker restarts between jobs the cache is invalid (the temp bundle dir may not exist). No cache invalidation on error path.
- Files: `worker/stages/remotion-render.ts:6-16`
- Impact: Worker can fail silently with "bundle not found" errors after process restarts.
- Fix approach: Wrap `getBundle()` with a file-existence check; re-bundle if the cached path no longer exists.

**`OUTPUT_DIR` defaults to `./output` (relative path, no cleanup):**
- Issue: Four files default `OUTPUT_DIR` to `'./output'` relative to cwd. In the Docker container this resolves to `/app/output` inside the container filesystem (ephemeral). No cleanup logic exists anywhere in the codebase — audio mp3s, background mp4s, and downloaded HeyGen videos accumulate indefinitely.
- Files: `worker/pipeline.ts:11`, `worker/stages/audio.ts:8`, `worker/stages/video.ts:6`, `app/api/v1/templates/[id]/preview/route.ts:9`
- Impact: Container disk fills up over time; preview renders (`preview-${compositionId}-${Date.now()}.mp4`) are generated on every preview request with no TTL.
- Fix approach: Add a post-job cleanup stage that deletes intermediate audio/video files once the job completes. Add a cron or BullMQ delayed job to purge preview files older than N hours.

**`pollUntilComplete` timeout silently returns `null`:**
- Issue: `services/heygen.ts:pollUntilComplete` times out after 20 minutes and returns `null`. The caller in `worker/stages/video.ts` treats `null` as "failed" but does not record a distinct "timed out" error message. The job log will show `failed` with no indication of why.
- Files: `services/heygen.ts:124-136`, `worker/stages/video.ts:34-35`
- Impact: Timed-out jobs are indistinguishable from HeyGen-rejected jobs; operators cannot diagnose the root cause.
- Fix approach: Throw a named `HeyGenTimeoutError` on timeout; propagate to `ChunkState.videoError` field.

**`pipeline.ts` only stores `chunkStates[0].videoFile` as final output:**
- Issue: Multi-part jobs generate one video file per chunk, but `videoFilePath` on the job is set to `chunkStates[0]?.videoFile ?? null`. Parts 2–N are written to disk but never referenced from the job record.
- Files: `worker/pipeline.ts:128-135`
- Impact: Multi-chunk jobs appear to complete with only the first segment; downstream consumers get an incomplete video with no error.
- Fix approach: Either concatenate chunks (ffmpeg stitch), or store all chunk paths in a separate field/table. This is a functional bug for any script that splits into >1 chunk.

---

## Performance Bottlenecks

**Remotion bundle rebuilt on first render after each worker restart:**
- Problem: `getBundle()` calls `@remotion/bundler` which runs a full webpack compilation on first call. This can take 30–60+ seconds and blocks the first job.
- Files: `worker/stages/remotion-render.ts:10-17`
- Cause: No persistent bundle cache across restarts; bundle lives in a temp directory.
- Improvement path: Pre-build the bundle at container startup (`RUN npx remotion bundle` in Dockerfile) and point `bundleCache` to the pre-built artifact.

**`createQueue()` opens a new Redis connection on every API request:**
- Problem: `app/api/v1/videos/route.ts` calls `createQueue()` then `queue.close()` on every POST. Each call creates and tears down an IORedis connection.
- Files: `app/api/v1/videos/route.ts:73-75`, `lib/queue.ts:13-23`
- Cause: No shared/singleton queue instance at the API layer.
- Improvement path: Export a lazily-initialized singleton queue from `lib/queue.ts` (pattern already used for Redis in `lib/nonce.ts`).

**HeyGen avatar list fetches both stock and custom on every `/api/v1/avatars` call:**
- Problem: `listAvatars()` makes two sequential (Promise.all) external HTTP calls to HeyGen on every request. The avatar list changes rarely.
- Files: `services/heygen.ts:21-53`, `app/api/v1/avatars/route.ts`
- Cause: No caching layer between the service and the DB.
- Improvement path: The sync endpoint (`/api/v1/avatars/sync`) already writes avatars to DB — read from DB for list, not live from HeyGen API.

---

## Fragile Areas

**HeyGen `getVideoStatus` uses v1 endpoint; other calls use v2:**
- Files: `services/heygen.ts:111` (`/v1/video_status.get`), vs `services/heygen.ts:89` (`/v2/video/generate`)
- Why fragile: Mixed API version usage. HeyGen may deprecate v1 independently of v2. The v1 endpoint also uses a query-param style (`?video_id=`) which differs from v2 REST conventions.
- Safe modification: Validate against HeyGen API changelog before any heygen.ts changes; add integration tests that mock both base URLs.

**`worker/index.ts` concurrency=2 vs pipeline `CONCURRENT_LIMIT=3` mismatch:**
- Files: `worker/index.ts:16`, `worker/pipeline.ts:12`
- Why fragile: The BullMQ worker processes 2 jobs concurrently. Each job internally fans out to 3 concurrent HeyGen API calls. Peak simultaneous HeyGen calls = 2×3=6. HeyGen rate limits are not documented in the codebase; exceeding them causes silent 429s that manifest as job failures.
- Safe modification: Either reduce `CONCURRENT_LIMIT` or implement exponential backoff on HeyGen 429 responses in `services/heygen.ts`.

**Webhook delivery has no signature/auth:**
- Files: `worker/pipeline.ts:14-30`
- Why fragile: Webhook POSTs include `job_id`, `status`, and `video_url` with no HMAC signature. Clients cannot verify the payload is genuine.
- Test coverage: None — webhook delivery is untested.

---

## Test Coverage Gaps

**Pipeline (`worker/pipeline.ts`) — zero tests:**
- What's not tested: The core job orchestration logic — chunk splitting, stage sequencing, retry/resume from partial state, DB state updates, error propagation.
- Files: `worker/pipeline.ts`, `worker/stages/audio.ts`, `worker/stages/video.ts`, `worker/stages/upload.ts`
- Risk: Any regression in the pipeline is only caught in production.
- Priority: High

**`/api/download` path traversal — zero tests:**
- What's not tested: Auth enforcement, path boundary checks (currently absent), error paths.
- Files: `app/api/download/route.ts`
- Risk: Security regression invisible without tests.
- Priority: High

**HeyGen service — zero tests:**
- What's not tested: `listAvatars` deduplication logic, `pollUntilComplete` timeout behavior, error response handling.
- Files: `services/heygen.ts`
- Risk: HeyGen API contract changes or edge cases in deduplication silently corrupt the avatar list.
- Priority: Medium

**Magic-link flow — only happy-path auth tested:**
- What's not tested: `send-magic-link` rate limiting, nonce registration/consumption, expired token handling, email delivery failure.
- Files: `tests/auth.test.ts`, `app/api/auth/send-magic-link/route.ts`, `app/api/auth/verify/route.ts`
- Risk: Auth bypass or nonce replay vulnerability not caught by tests.
- Priority: High

---

## Missing Critical Features

**No video stitching for multi-chunk jobs:**
- Problem: Multi-part scripts generate N separate HeyGen video files. No ffmpeg concat step exists. The final `videoFilePath` stores only part 1.
- Blocks: Any job with a script that splits into >1 chunk produces an incomplete deliverable.
- Files: `worker/pipeline.ts:127-137`

**No disk cleanup / storage management:**
- Problem: Intermediate files (`.mp3`, background `.mp4`, downloaded chunk `.mp4`) are never deleted. No volume mount or storage quota is defined in the Dockerfile or pm2 config.
- Blocks: Long-running production deployment without manual intervention.

---

*Concerns audit: 2026-06-07*
