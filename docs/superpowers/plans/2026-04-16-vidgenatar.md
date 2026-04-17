# Vidgenatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully automated video generation platform with REST API and web dashboard that turns scripts into branded avatar-narrated videos using Remotion, ElevenLabs, and HeyGen.

**Architecture:** Next.js 14 App Router serves both the dashboard UI and REST API (`/api/v1`). A standalone BullMQ worker process handles async video generation: Remotion renders branded backgrounds → ElevenLabs generates audio → HeyGen creates avatar videos. All state persists in PostgreSQL via Prisma.

**Tech Stack:** Next.js 14, TypeScript, PostgreSQL + Prisma, BullMQ + Redis, Remotion 4, ElevenLabs API, HeyGen API, Tailwind CSS, shadcn/ui, pm2

---

## File Map

```
vidgenatar/
├── app/
│   ├── layout.tsx                        # Root layout with sidebar nav
│   ├── page.tsx                          # Jobs dashboard (home)
│   ├── videos/new/page.tsx               # New video form
│   ├── templates/page.tsx
│   ├── avatars/page.tsx
│   ├── voices/page.tsx
│   ├── clients/page.tsx
│   └── api/v1/
│       ├── videos/route.ts               # GET list, POST create
│       ├── videos/[id]/route.ts          # GET, DELETE
│       ├── avatars/route.ts              # GET list, POST create
│       ├── avatars/sync/route.ts         # POST sync from HeyGen
│       ├── avatars/[id]/route.ts         # DELETE
│       ├── voices/route.ts               # GET list, POST register
│       ├── voices/sync/route.ts          # POST sync from ElevenLabs
│       ├── voices/[id]/route.ts          # DELETE
│       ├── clients/route.ts              # GET list, POST create
│       ├── clients/[id]/route.ts         # GET, PATCH, DELETE
│       ├── templates/route.ts            # GET list
│       ├── templates/[id]/route.ts       # GET by ID
│       ├── templates/[id]/preview/route.ts  # POST render preview
│       └── webhooks/route.ts             # POST register
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                           # Seed Template records
├── lib/
│   ├── db.ts                             # Prisma singleton
│   ├── auth.ts                           # Bearer token validation
│   ├── queue.ts                          # BullMQ queue + job types
│   └── types.ts                          # Shared TypeScript types (ChunkState, etc.)
├── services/
│   ├── elevenlabs.ts                     # ElevenLabs API client
│   └── heygen.ts                         # HeyGen API client
├── worker/
│   ├── index.ts                          # Worker process entry point
│   ├── pipeline.ts                       # Job orchestrator
│   └── stages/
│       ├── split.ts                      # Script → chunks
│       ├── audio.ts                      # ElevenLabs TTS per chunk
│       ├── upload.ts                     # HeyGen asset upload per chunk
│       ├── video.ts                      # HeyGen video create + poll + download
│       └── remotion-render.ts            # Remotion template render
├── remotion/
│   ├── index.ts                          # Bundler entry point
│   ├── Root.tsx                          # Registers all compositions
│   ├── remotion.config.ts
│   ├── compositions/
│   │   ├── BrandedSlide.tsx
│   │   ├── LogoIntro.tsx
│   │   ├── ProductTeaser.tsx
│   │   ├── DataReveal.tsx
│   │   └── AdVariant.tsx
│   ├── components/
│   │   ├── AnimatedText.tsx
│   │   ├── BrandBackground.tsx
│   │   └── LogoBug.tsx
│   └── lib/brand.ts                      # Default brand tokens
├── components/
│   ├── nav.tsx
│   ├── status-badge.tsx
│   ├── jobs-table.tsx
│   ├── new-video-form.tsx
│   ├── avatar-grid.tsx
│   ├── voice-list.tsx
│   ├── client-table.tsx
│   └── template-grid.tsx
├── tests/
│   ├── split.test.ts
│   ├── auth.test.ts
│   └── api/videos.test.ts
├── .env.example
├── jest.config.ts
├── pm2.config.js
└── Procfile
```

---

## Task 1: Scaffold Next.js project + install dependencies

**Files:**
- Create: `package.json`, `tsconfig.json`, `jest.config.ts`, `.env.example`, `next.config.ts`

- [ ] **Step 1: Scaffold Next.js app at repo root (run from `vidgenatar/`)**

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install @prisma/client prisma bullmq ioredis zod uuid music-metadata
npm install remotion @remotion/renderer @remotion/bundler @remotion/player @remotion/cli
npm install tsx pm2
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D @types/uuid jest ts-jest @types/jest jest-environment-node
```

- [ ] **Step 4: Initialize shadcn/ui**

```bash
npx shadcn@latest init --yes
npx shadcn@latest add button table badge card form input select textarea dialog dropdown-menu
```

- [ ] **Step 5: Write `jest.config.ts`**

```typescript
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: ['**/tests/**/*.test.ts'],
}

export default config
```

- [ ] **Step 6: Write `.env.example`**

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/vidgenatar
REDIS_URL=redis://localhost:6379
HEYGEN_API_KEY=
ELEVENLABS_API_KEY=
ADMIN_API_KEY=change-me
OUTPUT_DIR=./output
```

- [ ] **Step 7: Add scripts to `package.json`**

Open `package.json` and merge into the `"scripts"` section:

```json
"worker": "tsx worker/index.ts",
"worker:dev": "tsx --watch worker/index.ts",
"db:generate": "prisma generate",
"db:migrate": "prisma migrate dev",
"db:seed": "tsx prisma/seed.ts"
```

- [ ] **Step 8: Create output directories**

```bash
mkdir -p output/audio output/video output/background
echo "" > output/audio/.gitkeep
echo "" > output/video/.gitkeep
echo "" > output/background/.gitkeep
```

Add to `.gitignore`:
```
output/audio/*
output/video/*
output/background/*
!output/**/.gitkeep
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with dependencies"
```

---

## Task 2: Prisma schema + migration

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Client {
  id           String     @id @default(uuid())
  name         String
  slug         String     @unique
  apiKey       String     @unique @default(uuid())
  brandDefaults Json?
  createdAt    DateTime   @default(now())
  jobs         VideoJob[]
  webhooks     Webhook[]
}

model Template {
  id                 String     @id @default(uuid())
  name               String
  compositionId      String     @unique
  description        String?
  propsSchema        Json       @default("{}")
  defaultProps       Json       @default("{}")
  previewThumbnailUrl String?
  createdAt          DateTime   @default(now())
  jobs               VideoJob[]
}

model Avatar {
  id             String     @id @default(uuid())
  heygenAvatarId String     @unique
  name           String
  style          String?
  thumbnailUrl   String?
  createdAt      DateTime   @default(now())
  jobs           VideoJob[]
}

model Voice {
  id                String     @id @default(uuid())
  elevenlabsVoiceId String     @unique
  name              String
  settings          Json       @default("{}")
  createdAt         DateTime   @default(now())
  jobs              VideoJob[]
}

enum JobStatus {
  queued
  processing
  completed
  failed
}

enum AssetType {
  script
  audio
  background
  video
}

model VideoJob {
  id                     String    @id @default(uuid())
  title                  String
  script                 String
  status                 JobStatus @default(queued)
  clientId               String?
  client                 Client?   @relation(fields: [clientId], references: [id])
  avatarId               String
  avatar                 Avatar    @relation(fields: [avatarId], references: [id])
  voiceId                String
  voice                  Voice     @relation(fields: [voiceId], references: [id])
  templateId             String?
  template               Template? @relation(fields: [templateId], references: [id])
  templateProps          Json?
  chunks                 Json      @default("[]")
  remotionBackgroundPath String?
  heygenVideoId          String?
  videoUrl               String?
  videoFilePath          String?
  errorMessage           String?
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  assets                 Asset[]
}

model Asset {
  id        String    @id @default(uuid())
  jobId     String
  job       VideoJob  @relation(fields: [jobId], references: [id], onDelete: Cascade)
  type      AssetType
  filePath  String
  createdAt DateTime  @default(now())
}

model Webhook {
  id        String   @id @default(uuid())
  url       String
  clientId  String?
  client    Client?  @relation(fields: [clientId], references: [id])
  createdAt DateTime @default(now())
}
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 4: Generate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat: add prisma schema with all models"
```

---

## Task 3: DB client singleton + shared types

**Files:**
- Create: `lib/db.ts`, `lib/types.ts`

- [ ] **Step 1: Write `lib/db.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 2: Write `lib/types.ts`**

```typescript
export type ChunkState = {
  part: number
  words: number
  scriptFile: string
  audioGenerated: boolean
  audioDurationSec: number | null
  audioFile: string | null
  heygenAssetId: string | null
  heygenVideoId: string | null
  videoStatus: 'pending' | 'completed' | 'failed' | null
  videoFile: string | null
}

export type VideoJobData = {
  jobId: string
}

export type AuthContext =
  | { type: 'admin' }
  | { type: 'client'; clientId: string }
```

- [ ] **Step 3: Commit**

```bash
git add lib/
git commit -m "feat: add db singleton and shared types"
```

---

## Task 4: Auth middleware

**Files:**
- Create: `lib/auth.ts`, `tests/auth.test.ts`

- [ ] **Step 1: Write failing test `tests/auth.test.ts`**

```typescript
import { authenticate } from '@/lib/auth'

const mockDb = { client: { findUnique: jest.fn() } }
jest.mock('@/lib/db', () => ({ db: mockDb }))

beforeEach(() => jest.clearAllMocks())

test('returns admin context for ADMIN_API_KEY', async () => {
  process.env.ADMIN_API_KEY = 'admin-secret'
  const req = new Request('http://localhost', {
    headers: { authorization: 'Bearer admin-secret' },
  })
  const ctx = await authenticate(req)
  expect(ctx).toEqual({ type: 'admin' })
})

test('returns client context for valid client api key', async () => {
  mockDb.client.findUnique.mockResolvedValue({ id: 'client-1' })
  const req = new Request('http://localhost', {
    headers: { authorization: 'Bearer client-key' },
  })
  const ctx = await authenticate(req)
  expect(ctx).toEqual({ type: 'client', clientId: 'client-1' })
})

test('returns null for missing token', async () => {
  const req = new Request('http://localhost')
  const ctx = await authenticate(req)
  expect(ctx).toBeNull()
})

test('returns null for invalid token', async () => {
  mockDb.client.findUnique.mockResolvedValue(null)
  const req = new Request('http://localhost', {
    headers: { authorization: 'Bearer bad-token' },
  })
  const ctx = await authenticate(req)
  expect(ctx).toBeNull()
})
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest tests/auth.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/auth'`

- [ ] **Step 3: Write `lib/auth.ts`**

```typescript
import { db } from '@/lib/db'
import type { AuthContext } from '@/lib/types'

export async function authenticate(req: Request): Promise<AuthContext | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  if (token === process.env.ADMIN_API_KEY) return { type: 'admin' }

  const client = await db.client.findUnique({ where: { apiKey: token } })
  if (client) return { type: 'client', clientId: client.id }

  return null
}

export function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
```

- [ ] **Step 4: Run test — confirm it passes**

```bash
npx jest tests/auth.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts tests/auth.test.ts
git commit -m "feat: add bearer token auth middleware"
```

---

## Task 5: BullMQ queue setup

**Files:**
- Create: `lib/queue.ts`

- [ ] **Step 1: Write `lib/queue.ts`**

```typescript
import { Queue, Worker, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'
import type { VideoJobData } from '@/lib/types'

export const QUEUE_NAME = 'video-generation'

export function createRedisConnection() {
  return new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  })
}

export function createQueue() {
  return new Queue<VideoJobData>(QUEUE_NAME, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  })
}

export function createQueueEvents() {
  return new QueueEvents(QUEUE_NAME, { connection: createRedisConnection() })
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/queue.ts
git commit -m "feat: add bullmq queue setup"
```

---

## Task 6: Script splitter (with tests)

**Files:**
- Create: `worker/stages/split.ts`, `tests/split.test.ts`

- [ ] **Step 1: Write failing tests `tests/split.test.ts`**

```typescript
import { splitScript } from '@/worker/stages/split'

test('returns single chunk when text is short', () => {
  const text = 'Hello world. This is a short script.'
  const chunks = splitScript(text, 200)
  expect(chunks).toHaveLength(1)
  expect(chunks[0]).toBe(text)
})

test('splits at sentence boundaries when exceeding maxWords', () => {
  const sentence = 'This is a sentence with exactly eight words here.'
  const text = Array(30).fill(sentence).join(' ')
  const chunks = splitScript(text, 50)
  expect(chunks.length).toBeGreaterThan(1)
  for (const chunk of chunks) {
    expect(chunk.split(/\s+/).length).toBeLessThanOrEqual(70)
  }
})

test('no chunk exceeds maxWords by more than one sentence', () => {
  const sentences = Array.from({ length: 20 }, (_, i) => `Sentence number ${i + 1} ends here.`)
  const text = sentences.join(' ')
  const chunks = splitScript(text, 20)
  for (const chunk of chunks) {
    expect(chunk.split(/\s+/).length).toBeLessThanOrEqual(30)
  }
})

test('preserves all text across chunks', () => {
  const sentence = 'Each sentence has some words in it.'
  const text = Array(40).fill(sentence).join(' ')
  const chunks = splitScript(text, 50)
  const rejoined = chunks.join(' ')
  expect(rejoined.split(/\s+/).length).toBe(text.split(/\s+/).length)
})

test('strips BOM from input', () => {
  const text = '\ufeffHello world.'
  const chunks = splitScript(text, 200)
  expect(chunks[0].startsWith('\ufeff')).toBe(false)
})
```

- [ ] **Step 2: Run test — confirm fail**

```bash
npx jest tests/split.test.ts
```

Expected: FAIL — `Cannot find module '@/worker/stages/split'`

- [ ] **Step 3: Create directory and write `worker/stages/split.ts`**

```bash
mkdir -p worker/stages
```

```typescript
export function splitScript(text: string, maxWords = 200): string[] {
  const cleaned = text.startsWith('\ufeff') ? text.slice(1) : text
  const trimmed = cleaned.trim()
  const words = trimmed.split(/\s+/)

  if (words.length <= maxWords) return [trimmed]

  const sentences = trimmed.split(/(?<=[.!?])\s+/)
  const chunks: string[] = []
  let current: string[] = []
  let currentWords = 0

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).length
    if (currentWords + sentenceWords > maxWords && current.length > 0) {
      chunks.push(current.join(' '))
      current = []
      currentWords = 0
    }
    current.push(sentence)
    currentWords += sentenceWords
  }

  if (current.length > 0) chunks.push(current.join(' '))
  return chunks
}
```

- [ ] **Step 4: Run test — confirm pass**

```bash
npx jest tests/split.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add worker/stages/split.ts tests/split.test.ts
git commit -m "feat: add script splitter with sentence boundary chunking"
```

---

## Task 7: ElevenLabs service

**Files:**
- Create: `services/elevenlabs.ts`

- [ ] **Step 1: Create directory and write `services/elevenlabs.ts`**

```bash
mkdir -p services
```

```typescript
export type VoiceSettings = {
  stability?: number
  similarity_boost?: number
  style?: number
  use_speaker_boost?: boolean
  speed?: number
}

export type ElevenLabsVoice = {
  voice_id: string
  name: string
  preview_url: string | null
}

const BASE = 'https://api.elevenlabs.io/v1'

function headers() {
  return {
    'xi-api-key': process.env.ELEVENLABS_API_KEY ?? '',
    'Content-Type': 'application/json',
  }
}

export async function generateSpeech(
  text: string,
  voiceId: string,
  settings: VoiceSettings = {}
): Promise<ArrayBuffer> {
  const url = `${BASE}/text-to-speech/${voiceId}`
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      output_format: 'mp3_44100_128',
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
        speed: 1.03,
        ...settings,
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`ElevenLabs TTS error ${res.status}: ${body.slice(0, 200)}`)
  }

  return res.arrayBuffer()
}

export async function listVoices(): Promise<ElevenLabsVoice[]> {
  const res = await fetch(`${BASE}/voices`, { headers: headers() })
  if (!res.ok) throw new Error(`ElevenLabs list voices error ${res.status}`)
  const data = await res.json()
  return data.voices as ElevenLabsVoice[]
}
```

- [ ] **Step 2: Commit**

```bash
git add services/elevenlabs.ts
git commit -m "feat: add ElevenLabs API service"
```

---

## Task 8: HeyGen service

**Files:**
- Create: `services/heygen.ts`

- [ ] **Step 1: Write `services/heygen.ts`**

```typescript
export type HeyGenAvatar = {
  avatar_id: string
  avatar_name: string
  preview_image_url: string | null
}

export type VideoStatus = 'pending' | 'processing' | 'completed' | 'failed'

const BASE = 'https://api.heygen.com'
const UPLOAD_BASE = 'https://upload.heygen.com'

function headers(contentType = 'application/json') {
  return {
    'X-Api-Key': process.env.HEYGEN_API_KEY ?? '',
    'Content-Type': contentType,
    Accept: 'application/json',
  }
}

export async function listAvatars(): Promise<HeyGenAvatar[]> {
  const res = await fetch(`${BASE}/v2/avatars`, { headers: headers() })
  if (!res.ok) throw new Error(`HeyGen list avatars error ${res.status}`)
  const data = await res.json()
  return (data.data?.avatars ?? []) as HeyGenAvatar[]
}

export async function uploadAudio(audioBuffer: ArrayBuffer): Promise<string> {
  const res = await fetch(`${UPLOAD_BASE}/v1/asset`, {
    method: 'POST',
    headers: {
      'X-Api-Key': process.env.HEYGEN_API_KEY ?? '',
      'Content-Type': 'audio/mpeg',
    },
    body: audioBuffer,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HeyGen upload error ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  const assetId = data.data?.id
  if (!assetId) throw new Error('HeyGen upload returned no asset id')
  return assetId as string
}

export async function createVideo(
  avatarId: string,
  audioAssetId: string,
  title: string,
  backgroundVideoUrl?: string
): Promise<string> {
  const videoInput: Record<string, unknown> = {
    character: { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' },
    voice: { type: 'audio', audio_asset_id: audioAssetId },
  }
  if (backgroundVideoUrl) {
    videoInput.background = { type: 'video', url: backgroundVideoUrl }
  }

  const res = await fetch(`${BASE}/v2/video/generate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      video_inputs: [videoInput],
      dimension: { width: 1920, height: 1080 },
      title,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HeyGen create video error ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = await res.json()
  const videoId = data.data?.video_id
  if (!videoId) throw new Error('HeyGen create video returned no video_id')
  return videoId as string
}

export async function getVideoStatus(
  videoId: string
): Promise<{ status: VideoStatus; videoUrl?: string; error?: string }> {
  const res = await fetch(
    `${BASE}/v1/video_status.get?video_id=${videoId}`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`HeyGen status error ${res.status}`)
  const data = await res.json()
  return {
    status: data.data?.status as VideoStatus,
    videoUrl: data.data?.video_url,
    error: data.data?.error,
  }
}

export async function pollUntilComplete(
  videoId: string,
  timeoutMs = 1_200_000
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const { status, videoUrl } = await getVideoStatus(videoId)
    if (status === 'completed' && videoUrl) return videoUrl
    if (status === 'failed') return null
    await new Promise((r) => setTimeout(r, 30_000))
  }
  return null
}
```

- [ ] **Step 2: Commit**

```bash
git add services/heygen.ts
git commit -m "feat: add HeyGen API service"
```

---

## Task 9: Remotion project setup

**Files:**
- Create: `remotion/index.ts`, `remotion/Root.tsx`, `remotion/remotion.config.ts`, `remotion/lib/brand.ts`, `remotion/components/AnimatedText.tsx`, `remotion/components/BrandBackground.tsx`, `remotion/components/LogoBug.tsx`

- [ ] **Step 1: Write `remotion/remotion.config.ts`**

```bash
mkdir -p remotion/compositions remotion/components remotion/lib
```

```typescript
import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setOverwriteOutput(true)
```

- [ ] **Step 2: Write `remotion/lib/brand.ts`**

```typescript
export type BrandTokens = {
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  textColor: string
  fontFamily: string
  logoUrl?: string
}

export const defaultBrand: BrandTokens = {
  primaryColor: '#6366f1',
  secondaryColor: '#818cf8',
  backgroundColor: '#0f0f1a',
  textColor: '#ffffff',
  fontFamily: 'Inter, sans-serif',
}
```

- [ ] **Step 3: Write `remotion/components/AnimatedText.tsx`**

```tsx
import { spring, useCurrentFrame, useVideoConfig } from 'remotion'

type Props = {
  text: string
  delay?: number
  fontSize?: number
  color?: string
  fontFamily?: string
}

export const AnimatedText: React.FC<Props> = ({
  text,
  delay = 0,
  fontSize = 64,
  color = '#ffffff',
  fontFamily = 'Inter, sans-serif',
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const opacity = spring({ frame: frame - delay, fps, from: 0, to: 1, durationInFrames: 20 })
  const translateY = spring({ frame: frame - delay, fps, from: 30, to: 0, durationInFrames: 20 })

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        fontSize,
        color,
        fontFamily,
        fontWeight: 700,
        lineHeight: 1.2,
        textAlign: 'center',
        padding: '0 80px',
      }}
    >
      {text}
    </div>
  )
}
```

- [ ] **Step 4: Write `remotion/components/BrandBackground.tsx`**

```tsx
import { useCurrentFrame, useVideoConfig, spring } from 'remotion'
import type { BrandTokens } from '../lib/brand'

type Props = { brand: BrandTokens }

export const BrandBackground: React.FC<Props> = ({ brand }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const scale = spring({ frame, fps, from: 1.05, to: 1.0, durationInFrames: 40 })

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(135deg, ${brand.backgroundColor} 0%, ${brand.primaryColor}33 100%)`,
        transform: `scale(${scale})`,
      }}
    />
  )
}
```

- [ ] **Step 5: Write `remotion/components/LogoBug.tsx`**

```tsx
type Props = { logoUrl?: string; brand: { primaryColor: string } }

export const LogoBug: React.FC<Props> = ({ logoUrl, brand }) => {
  if (!logoUrl) return null
  return (
    <div
      style={{
        position: 'absolute',
        top: 48,
        right: 64,
        width: 80,
        height: 80,
        borderRadius: 12,
        overflow: 'hidden',
        border: `2px solid ${brand.primaryColor}66`,
      }}
    >
      <img src={logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  )
}
```

- [ ] **Step 6: Write `remotion/Root.tsx`** (placeholder — compositions registered in later tasks)

```tsx
import { Composition } from 'remotion'
import { BrandedSlide } from './compositions/BrandedSlide'
import { LogoIntro } from './compositions/LogoIntro'
import { ProductTeaser } from './compositions/ProductTeaser'
import { DataReveal } from './compositions/DataReveal'
import { AdVariant } from './compositions/AdVariant'

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="BrandedSlide"
      component={BrandedSlide}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ title: 'Your Title Here', brand: {} }}
    />
    <Composition
      id="LogoIntro"
      component={LogoIntro}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ brand: {} }}
    />
    <Composition
      id="ProductTeaser"
      component={ProductTeaser}
      durationInFrames={450}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ headline: 'Product Name', subline: 'Tagline', cta: 'Learn More', brand: {} }}
    />
    <Composition
      id="DataReveal"
      component={DataReveal}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ metric: '10x', label: 'Faster Results', brand: {} }}
    />
    <Composition
      id="AdVariant"
      component={AdVariant}
      durationInFrames={450}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ headline: 'Headline', body: 'Body copy', cta: 'Shop Now', brand: {} }}
    />
  </>
)
```

- [ ] **Step 7: Write `remotion/index.ts`**

```typescript
import { registerRoot } from 'remotion'
import { RemotionRoot } from './Root'

registerRoot(RemotionRoot)
```

- [ ] **Step 8: Commit**

```bash
git add remotion/
git commit -m "feat: scaffold Remotion project with shared components"
```

---

## Task 10: Remotion compositions

**Files:**
- Create: `remotion/compositions/BrandedSlide.tsx`, `LogoIntro.tsx`, `ProductTeaser.tsx`, `DataReveal.tsx`, `AdVariant.tsx`

- [ ] **Step 1: Write `remotion/compositions/BrandedSlide.tsx`**

```tsx
import { AbsoluteFill } from 'remotion'
import { BrandBackground } from '../components/BrandBackground'
import { AnimatedText } from '../components/AnimatedText'
import { LogoBug } from '../components/LogoBug'
import { defaultBrand, type BrandTokens } from '../lib/brand'

type Props = { title: string; subtitle?: string; brand: Partial<BrandTokens> }

export const BrandedSlide: React.FC<Props> = ({ title, subtitle, brand }) => {
  const b = { ...defaultBrand, ...brand }
  return (
    <AbsoluteFill style={{ fontFamily: b.fontFamily }}>
      <BrandBackground brand={b} />
      <LogoBug logoUrl={b.logoUrl} brand={b} />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <AnimatedText text={title} delay={10} fontSize={80} color={b.textColor} fontFamily={b.fontFamily} />
        {subtitle && <AnimatedText text={subtitle} delay={25} fontSize={40} color={b.secondaryColor} fontFamily={b.fontFamily} />}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Write `remotion/compositions/LogoIntro.tsx`**

```tsx
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { BrandBackground } from '../components/BrandBackground'
import { defaultBrand, type BrandTokens } from '../lib/brand'

type Props = { brand: Partial<BrandTokens> }

export const LogoIntro: React.FC<Props> = ({ brand }) => {
  const b = { ...defaultBrand, ...brand }
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const scale = spring({ frame, fps, from: 0, to: 1, durationInFrames: 30, config: { damping: 12 } })
  const opacity = spring({ frame, fps, from: 0, to: 1, durationInFrames: 20 })

  return (
    <AbsoluteFill style={{ fontFamily: b.fontFamily }}>
      <BrandBackground brand={b} />
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {b.logoUrl ? (
          <img
            src={b.logoUrl}
            style={{ width: 320, height: 320, objectFit: 'contain', transform: `scale(${scale})`, opacity }}
          />
        ) : (
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: 32,
              background: b.primaryColor,
              transform: `scale(${scale})`,
              opacity,
            }}
          />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 3: Write `remotion/compositions/ProductTeaser.tsx`**

```tsx
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { BrandBackground } from '../components/BrandBackground'
import { AnimatedText } from '../components/AnimatedText'
import { defaultBrand, type BrandTokens } from '../lib/brand'

type Props = { headline: string; subline: string; cta: string; brand: Partial<BrandTokens> }

export const ProductTeaser: React.FC<Props> = ({ headline, subline, cta, brand }) => {
  const b = { ...defaultBrand, ...brand }
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const ctaOpacity = spring({ frame: frame - 60, fps, from: 0, to: 1, durationInFrames: 20 })
  const ctaScale = spring({ frame: frame - 60, fps, from: 0.8, to: 1, durationInFrames: 20 })

  return (
    <AbsoluteFill style={{ fontFamily: b.fontFamily }}>
      <BrandBackground brand={b} />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
        <AnimatedText text={headline} delay={10} fontSize={96} color={b.textColor} fontFamily={b.fontFamily} />
        <AnimatedText text={subline} delay={25} fontSize={48} color={b.secondaryColor} fontFamily={b.fontFamily} />
        <div
          style={{
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
            marginTop: 32,
            padding: '24px 64px',
            background: b.primaryColor,
            borderRadius: 16,
            fontSize: 40,
            color: '#ffffff',
            fontWeight: 700,
          }}
        >
          {cta}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 4: Write `remotion/compositions/DataReveal.tsx`**

```tsx
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { BrandBackground } from '../components/BrandBackground'
import { AnimatedText } from '../components/AnimatedText'
import { defaultBrand, type BrandTokens } from '../lib/brand'

type Props = { metric: string; label: string; context?: string; brand: Partial<BrandTokens> }

export const DataReveal: React.FC<Props> = ({ metric, label, context, brand }) => {
  const b = { ...defaultBrand, ...brand }
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const metricScale = spring({ frame, fps, from: 0, to: 1, durationInFrames: 40, config: { damping: 10 } })

  return (
    <AbsoluteFill style={{ fontFamily: b.fontFamily }}>
      <BrandBackground brand={b} />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 180, fontWeight: 900, color: b.primaryColor, transform: `scale(${metricScale})`, lineHeight: 1 }}>
          {metric}
        </div>
        <AnimatedText text={label} delay={30} fontSize={56} color={b.textColor} fontFamily={b.fontFamily} />
        {context && <AnimatedText text={context} delay={45} fontSize={32} color={b.secondaryColor} fontFamily={b.fontFamily} />}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 5: Write `remotion/compositions/AdVariant.tsx`**

```tsx
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { BrandBackground } from '../components/BrandBackground'
import { AnimatedText } from '../components/AnimatedText'
import { defaultBrand, type BrandTokens } from '../lib/brand'

type Props = { headline: string; body: string; cta: string; imageUrl?: string; brand: Partial<BrandTokens> }

export const AdVariant: React.FC<Props> = ({ headline, body, cta, imageUrl, brand }) => {
  const b = { ...defaultBrand, ...brand }
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const ctaOpacity = spring({ frame: frame - 45, fps, from: 0, to: 1, durationInFrames: 20 })

  return (
    <AbsoluteFill style={{ fontFamily: b.fontFamily }}>
      <BrandBackground brand={b} />
      {imageUrl && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', overflow: 'hidden' }}>
          <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.8))' }} />
        </div>
      )}
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: 80, gap: 24 }}>
        <AnimatedText text={headline} delay={10} fontSize={72} color={b.textColor} fontFamily={b.fontFamily} />
        <AnimatedText text={body} delay={25} fontSize={36} color={b.secondaryColor} fontFamily={b.fontFamily} />
        <div style={{ opacity: ctaOpacity, padding: '20px 60px', background: b.primaryColor, borderRadius: 12, fontSize: 36, color: '#fff', fontWeight: 700, marginTop: 16 }}>
          {cta}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add remotion/compositions/
git commit -m "feat: add five Remotion compositions"
```

---

## Task 11: Remotion render worker stage

**Files:**
- Create: `worker/stages/remotion-render.ts`

- [ ] **Step 1: Write `worker/stages/remotion-render.ts`**

```typescript
import path from 'path'
import fs from 'fs/promises'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'

let bundleCache: string | null = null

async function getBundle(): Promise<string> {
  if (bundleCache) return bundleCache
  console.log('[Remotion] Bundling compositions...')
  bundleCache = await bundle({
    entryPoint: path.resolve('./remotion/index.ts'),
    webpackOverride: (config) => config,
  })
  console.log('[Remotion] Bundle ready.')
  return bundleCache
}

export async function renderTemplate(
  compositionId: string,
  props: Record<string, unknown>,
  outputPath: string
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true })

  const serveUrl = await getBundle()

  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps: props,
  })

  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: props,
    chromiumOptions: { disableWebSecurity: true },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add worker/stages/remotion-render.ts
git commit -m "feat: add Remotion render stage with bundle caching"
```

---

## Task 12: Audio and upload stages

**Files:**
- Create: `worker/stages/audio.ts`, `worker/stages/upload.ts`

- [ ] **Step 1: Write `worker/stages/audio.ts`**

```typescript
import path from 'path'
import fs from 'fs/promises'
import { parseFile } from 'music-metadata'
import { generateSpeech } from '@/services/elevenlabs'
import type { ChunkState } from '@/lib/types'
import type { Prisma } from '@prisma/client'

const OUTPUT_DIR = process.env.OUTPUT_DIR ?? './output'

export async function generateAudioForChunk(
  jobId: string,
  chunk: ChunkState,
  voiceId: string,
  voiceSettings: Prisma.JsonValue
): Promise<ChunkState> {
  const audioFile = path.join(OUTPUT_DIR, 'audio', `${jobId}-part-${chunk.part}.mp3`)

  try {
    await fs.access(audioFile)
    console.log(`  [skip] Audio exists: ${path.basename(audioFile)}`)
    return { ...chunk, audioGenerated: true, audioFile }
  } catch {}

  console.log(`  Generating audio for part ${chunk.part}...`)
  const settings = (voiceSettings ?? {}) as Record<string, unknown>
  const buffer = await generateSpeech(chunk.scriptFile, voiceId, settings)

  await fs.mkdir(path.dirname(audioFile), { recursive: true })
  await fs.writeFile(audioFile, Buffer.from(buffer))

  const metadata = await parseFile(audioFile)
  const duration = metadata.format.duration ?? 0

  if (duration > 65) {
    console.warn(`  [WARN] Part ${chunk.part} audio is ${duration.toFixed(1)}s (>65s)`)
  }

  return {
    ...chunk,
    audioGenerated: true,
    audioDurationSec: Math.round(duration * 10) / 10,
    audioFile,
  }
}
```

- [ ] **Step 2: Write `worker/stages/upload.ts`**

```typescript
import fs from 'fs/promises'
import { uploadAudio } from '@/services/heygen'
import type { ChunkState } from '@/lib/types'

export async function uploadChunkAudio(chunk: ChunkState): Promise<ChunkState> {
  if (chunk.heygenAssetId) {
    console.log(`  [skip] Already uploaded part ${chunk.part}`)
    return chunk
  }

  if (!chunk.audioFile) throw new Error(`Part ${chunk.part}: no audio file to upload`)

  console.log(`  Uploading audio for part ${chunk.part}...`)
  const buffer = await fs.readFile(chunk.audioFile)
  const assetId = await uploadAudio(buffer.buffer)

  return { ...chunk, heygenAssetId: assetId }
}
```

- [ ] **Step 3: Commit**

```bash
git add worker/stages/audio.ts worker/stages/upload.ts
git commit -m "feat: add audio generation and upload stages"
```

---

## Task 13: Video create + poll + download stage

**Files:**
- Create: `worker/stages/video.ts`

- [ ] **Step 1: Write `worker/stages/video.ts`**

```typescript
import path from 'path'
import fs from 'fs/promises'
import { createVideo, pollUntilComplete } from '@/services/heygen'
import type { ChunkState } from '@/lib/types'

const OUTPUT_DIR = process.env.OUTPUT_DIR ?? './output'

export async function createAndPollChunkVideo(
  jobId: string,
  chunk: ChunkState,
  avatarId: string,
  backgroundVideoUrl?: string
): Promise<ChunkState> {
  if (chunk.videoStatus === 'completed') {
    console.log(`  [skip] Part ${chunk.part} already completed`)
    return chunk
  }

  if (!chunk.heygenVideoId) {
    if (!chunk.heygenAssetId) throw new Error(`Part ${chunk.part}: no heygen asset id`)
    console.log(`  Creating HeyGen video for part ${chunk.part}...`)
    const videoId = await createVideo(
      avatarId,
      chunk.heygenAssetId,
      `Job ${jobId} Part ${chunk.part}`,
      backgroundVideoUrl
    )
    chunk = { ...chunk, heygenVideoId: videoId, videoStatus: 'pending' }
  }

  console.log(`  Polling HeyGen for part ${chunk.part} (${chunk.heygenVideoId})...`)
  const videoUrl = await pollUntilComplete(chunk.heygenVideoId!)

  if (!videoUrl) {
    return { ...chunk, videoStatus: 'failed' }
  }

  const videoFile = path.join(OUTPUT_DIR, 'video', `${jobId}-part-${chunk.part}.mp4`)
  await fs.mkdir(path.dirname(videoFile), { recursive: true })

  console.log(`  Downloading video for part ${chunk.part}...`)
  const res = await fetch(videoUrl)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const buf = await res.arrayBuffer()
  await fs.writeFile(videoFile, Buffer.from(buf))

  const sizeMb = (buf.byteLength / 1024 / 1024).toFixed(1)
  console.log(`  Downloaded: ${path.basename(videoFile)} (${sizeMb} MB)`)

  return { ...chunk, videoStatus: 'completed', videoFile }
}
```

- [ ] **Step 2: Commit**

```bash
git add worker/stages/video.ts
git commit -m "feat: add HeyGen video create, poll, and download stage"
```

---

## Task 14: Pipeline orchestrator + worker entry point

**Files:**
- Create: `worker/pipeline.ts`, `worker/index.ts`

- [ ] **Step 1: Write `worker/pipeline.ts`**

```typescript
import path from 'path'
import fs from 'fs/promises'
import { db } from '@/lib/db'
import { splitScript } from './stages/split'
import { renderTemplate } from './stages/remotion-render'
import { generateAudioForChunk } from './stages/audio'
import { uploadChunkAudio } from './stages/upload'
import { createAndPollChunkVideo } from './stages/video'
import type { ChunkState } from '@/lib/types'

const OUTPUT_DIR = process.env.OUTPUT_DIR ?? './output'
const CONCURRENT_LIMIT = 3

async function deliverWebhooks(jobId: string, status: string) {
  const job = await db.videoJob.findUnique({ where: { id: jobId }, include: { client: { include: { webhooks: true } } } })
  if (!job?.client?.webhooks?.length) return
  for (const hook of job.client.webhooks) {
    try {
      await fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, status, video_url: job.videoUrl }),
      })
    } catch (e) {
      console.warn(`Webhook delivery failed for ${hook.url}:`, e)
    }
  }
}

export async function runPipeline(jobId: string): Promise<void> {
  console.log(`\n[Pipeline] Starting job ${jobId}`)

  const job = await db.videoJob.findUnique({
    where: { id: jobId },
    include: { avatar: true, voice: true, template: true },
  })

  if (!job) throw new Error(`Job ${jobId} not found`)

  await db.videoJob.update({ where: { id: jobId }, data: { status: 'processing' } })

  try {
    // Stage 0: Render Remotion template
    let backgroundVideoUrl: string | undefined

    if (job.templateId && job.template) {
      const bgPath = path.join(OUTPUT_DIR, 'background', `${jobId}-bg.mp4`)

      if (job.remotionBackgroundPath) {
        console.log(`  [skip] Background already rendered`)
        backgroundVideoUrl = `file://${path.resolve(job.remotionBackgroundPath)}`
      } else {
        const clientDefaults = (job as unknown as { client?: { brandDefaults?: Record<string, unknown> } }).client?.brandDefaults ?? {}
        const templateDefaults = (job.template.defaultProps as Record<string, unknown>) ?? {}
        const jobOverrides = (job.templateProps as Record<string, unknown>) ?? {}
        const resolvedProps = { ...clientDefaults, ...templateDefaults, ...jobOverrides }

        console.log(`  Rendering template ${job.template.compositionId}...`)
        await renderTemplate(job.template.compositionId, resolvedProps, bgPath)
        await db.videoJob.update({ where: { id: jobId }, data: { remotionBackgroundPath: bgPath } })
        backgroundVideoUrl = `file://${path.resolve(bgPath)}`
      }
    }

    // Stage 1: Split script
    const chunks = splitScript(job.script)
    let chunkStates: ChunkState[] = (job.chunks as ChunkState[]) ?? []

    if (chunkStates.length === 0) {
      chunkStates = await Promise.all(
        chunks.map(async (text, i) => {
          const scriptFile = path.join(OUTPUT_DIR, 'audio', `${jobId}-part-${i + 1}.txt`)
          await fs.mkdir(path.dirname(scriptFile), { recursive: true })
          await fs.writeFile(scriptFile, text)
          return {
            part: i + 1,
            words: text.split(/\s+/).length,
            scriptFile,
            audioGenerated: false,
            audioDurationSec: null,
            audioFile: null,
            heygenAssetId: null,
            heygenVideoId: null,
            videoStatus: null,
            videoFile: null,
          } satisfies ChunkState
        })
      )
      await db.videoJob.update({ where: { id: jobId }, data: { chunks: chunkStates as unknown as never } })
    }

    const todo = chunkStates.filter((c) => c.videoStatus !== 'completed')
    console.log(`  ${todo.length} chunks to process (${chunkStates.length - todo.length} already done)`)

    // Stage 2+3: Audio + Upload (parallel per chunk)
    for (let i = 0; i < todo.length; i += CONCURRENT_LIMIT) {
      const batch = todo.slice(i, i + CONCURRENT_LIMIT)
      await Promise.all(
        batch.map(async (chunk) => {
          const withAudio = await generateAudioForChunk(jobId, chunk, job.voice.elevenlabsVoiceId, job.voice.settings)
          const withUpload = await uploadChunkAudio(withAudio)
          const idx = chunkStates.findIndex((c) => c.part === chunk.part)
          chunkStates[idx] = withUpload
        })
      )
      await db.videoJob.update({ where: { id: jobId }, data: { chunks: chunkStates as unknown as never } })
    }

    // Stage 4+5+6: Video create, poll, download (batched, max 3 concurrent)
    const needVideo = chunkStates.filter((c) => c.videoStatus !== 'completed')

    for (let i = 0; i < needVideo.length; i += CONCURRENT_LIMIT) {
      const batch = needVideo.slice(i, i + CONCURRENT_LIMIT)
      await Promise.all(
        batch.map(async (chunk) => {
          const result = await createAndPollChunkVideo(jobId, chunk, job.avatar.heygenAvatarId, backgroundVideoUrl)
          const idx = chunkStates.findIndex((c) => c.part === chunk.part)
          chunkStates[idx] = result
        })
      )
      await db.videoJob.update({ where: { id: jobId }, data: { chunks: chunkStates as unknown as never } })
    }

    const allDone = chunkStates.every((c) => c.videoStatus === 'completed')
    const firstVideo = chunkStates[0]?.videoFile

    await db.videoJob.update({
      where: { id: jobId },
      data: {
        status: allDone ? 'completed' : 'failed',
        videoFilePath: firstVideo ?? null,
        chunks: chunkStates as unknown as never,
      },
    })

    console.log(`[Pipeline] Job ${jobId} ${allDone ? 'COMPLETED' : 'FAILED'}`)
    await deliverWebhooks(jobId, allDone ? 'completed' : 'failed')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[Pipeline] Job ${jobId} ERROR:`, message)
    await db.videoJob.update({ where: { id: jobId }, data: { status: 'failed', errorMessage: message } })
    await deliverWebhooks(jobId, 'failed')
    throw err
  }
}
```

- [ ] **Step 2: Write `worker/index.ts`**

```typescript
import { Worker } from 'bullmq'
import { QUEUE_NAME, createRedisConnection } from '@/lib/queue'
import { runPipeline } from './pipeline'
import type { VideoJobData } from '@/lib/types'

console.log('[Worker] Starting vidgenatar worker...')

const worker = new Worker<VideoJobData>(
  QUEUE_NAME,
  async (job) => {
    console.log(`[Worker] Processing job ${job.data.jobId}`)
    await runPipeline(job.data.jobId)
  },
  {
    connection: createRedisConnection(),
    concurrency: 2,
  }
)

worker.on('completed', (job) => console.log(`[Worker] Job ${job.data.jobId} completed`))
worker.on('failed', (job, err) => console.error(`[Worker] Job ${job?.data.jobId} failed:`, err.message))

process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down...')
  await worker.close()
  process.exit(0)
})
```

- [ ] **Step 3: Commit**

```bash
git add worker/
git commit -m "feat: add pipeline orchestrator and worker entry point"
```

---

## Task 15: Videos REST API

**Files:**
- Create: `app/api/v1/videos/route.ts`, `app/api/v1/videos/[id]/route.ts`

- [ ] **Step 1: Write `app/api/v1/videos/route.ts`**

```bash
mkdir -p app/api/v1/videos/\[id\]
```

```typescript
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'
import { createQueue } from '@/lib/queue'

const CreateVideoSchema = z.object({
  title: z.string().min(1),
  script: z.string().min(1),
  avatar_id: z.string().uuid(),
  voice_id: z.string().uuid(),
  client_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  template_props: z.record(z.unknown()).optional(),
})

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') as null | 'queued' | 'processing' | 'completed' | 'failed'
  const clientId = searchParams.get('client_id')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (clientId) where.clientId = clientId
  if (ctx.type === 'client') where.clientId = ctx.clientId

  const [jobs, total] = await Promise.all([
    db.videoJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { client: true, avatar: true, voice: true, template: true },
    }),
    db.videoJob.count({ where }),
  ])

  return Response.json({ data: jobs, total, limit, offset })
}

export async function POST(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()

  const body = await req.json().catch(() => null)
  const parsed = CreateVideoSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const { title, script, avatar_id, voice_id, client_id, template_id, template_props } = parsed.data

  const effectiveClientId = ctx.type === 'client' ? ctx.clientId : (client_id ?? null)

  const job = await db.videoJob.create({
    data: {
      title,
      script,
      avatarId: avatar_id,
      voiceId: voice_id,
      clientId: effectiveClientId,
      templateId: template_id ?? null,
      templateProps: template_props ?? null,
      status: 'queued',
    },
  })

  const queue = createQueue()
  await queue.add('generate', { jobId: job.id })
  await queue.close()

  return Response.json({ job_id: job.id, status: 'queued' }, { status: 201 })
}
```

- [ ] **Step 2: Write `app/api/v1/videos/[id]/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()

  const job = await db.videoJob.findUnique({
    where: { id: params.id },
    include: { client: true, avatar: true, voice: true, template: true },
  })

  if (!job) return Response.json({ error: 'Not found' }, { status: 404 })
  if (ctx.type === 'client' && job.clientId !== ctx.clientId) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return Response.json(job)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()

  const job = await db.videoJob.findUnique({ where: { id: params.id } })
  if (!job) return Response.json({ error: 'Not found' }, { status: 404 })
  if (ctx.type === 'client' && job.clientId !== ctx.clientId) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (job.status !== 'queued') {
    return Response.json({ error: 'Only queued jobs can be cancelled' }, { status: 409 })
  }

  await db.videoJob.update({ where: { id: params.id }, data: { status: 'failed', errorMessage: 'Cancelled' } })
  return Response.json({ ok: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/v1/videos/
git commit -m "feat: add videos REST API (GET list, POST create, GET by ID, DELETE)"
```

---

## Task 16: Avatars, Voices, Clients REST APIs

**Files:**
- Create: avatar routes, voice routes, client routes

- [ ] **Step 1: Write `app/api/v1/avatars/route.ts`**

```bash
mkdir -p app/api/v1/avatars/\[id\] app/api/v1/avatars/sync
```

```typescript
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'
import { listAvatars } from '@/services/heygen'

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()
  const avatars = await db.avatar.findMany({ orderBy: { name: 'asc' } })
  return Response.json(avatars)
}

export async function POST(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()

  const body = await req.json().catch(() => null)
  const parsed = z.object({
    heygen_avatar_id: z.string(),
    name: z.string(),
    style: z.string().optional(),
    thumbnail_url: z.string().optional(),
  }).safeParse(body)

  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  const { heygen_avatar_id, name, style, thumbnail_url } = parsed.data

  const avatar = await db.avatar.upsert({
    where: { heygenAvatarId: heygen_avatar_id },
    create: { heygenAvatarId: heygen_avatar_id, name, style: style ?? null, thumbnailUrl: thumbnail_url ?? null },
    update: { name, style: style ?? null, thumbnailUrl: thumbnail_url ?? null },
  })
  return Response.json(avatar, { status: 201 })
}
```

- [ ] **Step 2: Write `app/api/v1/avatars/sync/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'
import { listAvatars } from '@/services/heygen'

export async function POST(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()

  const heygenAvatars = await listAvatars()
  let upserted = 0

  for (const a of heygenAvatars) {
    await db.avatar.upsert({
      where: { heygenAvatarId: a.avatar_id },
      create: { heygenAvatarId: a.avatar_id, name: a.avatar_name, thumbnailUrl: a.preview_image_url },
      update: { name: a.avatar_name, thumbnailUrl: a.preview_image_url },
    })
    upserted++
  }

  return Response.json({ synced: upserted })
}
```

- [ ] **Step 3: Write `app/api/v1/avatars/[id]/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()
  await db.avatar.delete({ where: { id: params.id } })
  return Response.json({ ok: true })
}
```

- [ ] **Step 4: Write `app/api/v1/voices/route.ts`**

```bash
mkdir -p app/api/v1/voices/\[id\] app/api/v1/voices/sync
```

```typescript
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()
  const voices = await db.voice.findMany({ orderBy: { name: 'asc' } })
  return Response.json(voices)
}

export async function POST(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()

  const body = await req.json().catch(() => null)
  const parsed = z.object({
    elevenlabs_voice_id: z.string(),
    name: z.string(),
    settings: z.record(z.unknown()).optional(),
  }).safeParse(body)

  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  const { elevenlabs_voice_id, name, settings } = parsed.data

  const voice = await db.voice.upsert({
    where: { elevenlabsVoiceId: elevenlabs_voice_id },
    create: { elevenlabsVoiceId: elevenlabs_voice_id, name, settings: settings ?? {} },
    update: { name, settings: settings ?? {} },
  })
  return Response.json(voice, { status: 201 })
}
```

- [ ] **Step 5: Write `app/api/v1/voices/sync/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'
import { listVoices } from '@/services/elevenlabs'

export async function POST(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()

  const voices = await listVoices()
  return Response.json({ available: voices })
}
```

- [ ] **Step 6: Write `app/api/v1/voices/[id]/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()
  await db.voice.delete({ where: { id: params.id } })
  return Response.json({ ok: true })
}
```

- [ ] **Step 7: Write `app/api/v1/clients/route.ts`**

```bash
mkdir -p app/api/v1/clients/\[id\]
```

```typescript
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()
  const clients = await db.client.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { jobs: true } } },
  })
  return Response.json(clients)
}

export async function POST(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()

  const body = await req.json().catch(() => null)
  const parsed = z.object({
    name: z.string().min(1),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
    brand_defaults: z.record(z.unknown()).optional(),
  }).safeParse(body)

  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  const { name, slug, brand_defaults } = parsed.data

  const client = await db.client.create({
    data: { name, slug, brandDefaults: brand_defaults ?? null },
  })
  return Response.json(client, { status: 201 })
}
```

- [ ] **Step 8: Write `app/api/v1/clients/[id]/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()
  const client = await db.client.findUnique({ where: { id: params.id }, include: { _count: { select: { jobs: true } } } })
  if (!client) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(client)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()

  const body = await req.json().catch(() => null)
  const parsed = z.object({
    name: z.string().optional(),
    brand_defaults: z.record(z.unknown()).optional(),
  }).safeParse(body)

  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  const client = await db.client.update({
    where: { id: params.id },
    data: { name: parsed.data.name, brandDefaults: parsed.data.brand_defaults },
  })
  return Response.json(client)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()
  await db.client.delete({ where: { id: params.id } })
  return Response.json({ ok: true })
}
```

- [ ] **Step 9: Write `app/api/v1/webhooks/route.ts`**

```bash
mkdir -p app/api/v1/webhooks
```

```typescript
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()

  const body = await req.json().catch(() => null)
  const parsed = z.object({
    url: z.string().url(),
    client_id: z.string().uuid().optional(),
  }).safeParse(body)

  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const clientId = ctx.type === 'client' ? ctx.clientId : (parsed.data.client_id ?? null)
  const webhook = await db.webhook.create({ data: { url: parsed.data.url, clientId } })
  return Response.json(webhook, { status: 201 })
}
```

- [ ] **Step 10: Commit**

```bash
git add app/api/v1/
git commit -m "feat: add avatars, voices, clients, webhooks REST APIs"
```

---

## Task 17: Templates REST API + seed

**Files:**
- Create: `app/api/v1/templates/route.ts`, `app/api/v1/templates/[id]/route.ts`, `app/api/v1/templates/[id]/preview/route.ts`, `prisma/seed.ts`

- [ ] **Step 1: Write `app/api/v1/templates/route.ts`**

```bash
mkdir -p "app/api/v1/templates/[id]/preview"
```

```typescript
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()
  const templates = await db.template.findMany({ orderBy: { name: 'asc' } })
  return Response.json(templates)
}
```

- [ ] **Step 2: Write `app/api/v1/templates/[id]/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()
  const template = await db.template.findUnique({ where: { id: params.id } })
  if (!template) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(template)
}
```

- [ ] **Step 3: Write `app/api/v1/templates/[id]/preview/route.ts`**

```typescript
import path from 'path'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'
import { renderTemplate } from '@/worker/stages/remotion-render'

const OUTPUT_DIR = process.env.OUTPUT_DIR ?? './output'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()

  const template = await db.template.findUnique({ where: { id: params.id } })
  if (!template) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const props = { ...(template.defaultProps as Record<string, unknown>), ...body }

  const outputPath = path.join(OUTPUT_DIR, 'background', `preview-${template.compositionId}-${Date.now()}.mp4`)
  await renderTemplate(template.compositionId, props, outputPath)

  return Response.json({ preview_path: outputPath })
}
```

- [ ] **Step 4: Write `prisma/seed.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const templates = [
  {
    name: 'Branded Slide',
    compositionId: 'BrandedSlide',
    description: 'Avatar on animated branded background with title and subtitle',
    propsSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Main title text' },
        subtitle: { type: 'string', description: 'Subtitle text (optional)' },
        brand: { type: 'object', description: 'Brand token overrides' },
      },
      required: ['title'],
    },
    defaultProps: { title: 'Your Title Here', brand: {} },
  },
  {
    name: 'Logo Intro',
    compositionId: 'LogoIntro',
    description: '5-second branded logo reveal intro clip',
    propsSchema: {
      type: 'object',
      properties: { brand: { type: 'object', description: 'Brand tokens (logoUrl, primaryColor, etc.)' } },
    },
    defaultProps: { brand: {} },
  },
  {
    name: 'Product Teaser',
    compositionId: 'ProductTeaser',
    description: '15-second product ad with hook, value prop, and CTA',
    propsSchema: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        subline: { type: 'string' },
        cta: { type: 'string' },
        brand: { type: 'object' },
      },
      required: ['headline', 'subline', 'cta'],
    },
    defaultProps: { headline: 'Introducing Something New', subline: 'The smarter way to work', cta: 'Learn More', brand: {} },
  },
  {
    name: 'Data Reveal',
    compositionId: 'DataReveal',
    description: '10-second animated metric/milestone reveal',
    propsSchema: {
      type: 'object',
      properties: {
        metric: { type: 'string', description: 'Big number or stat (e.g. "10x")' },
        label: { type: 'string', description: 'Label under the metric' },
        context: { type: 'string', description: 'Optional supporting context' },
        brand: { type: 'object' },
      },
      required: ['metric', 'label'],
    },
    defaultProps: { metric: '10x', label: 'Faster Results', brand: {} },
  },
  {
    name: 'Ad Variant',
    compositionId: 'AdVariant',
    description: 'Vertical 9:16 ad template for Meta/social with headline, body, and CTA',
    propsSchema: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        body: { type: 'string' },
        cta: { type: 'string' },
        imageUrl: { type: 'string', description: 'Optional background image URL' },
        brand: { type: 'object' },
      },
      required: ['headline', 'body', 'cta'],
    },
    defaultProps: { headline: 'Limited Time Offer', body: 'Get started today and save', cta: 'Shop Now', brand: {} },
  },
]

async function main() {
  for (const t of templates) {
    await db.template.upsert({
      where: { compositionId: t.compositionId },
      create: t,
      update: { name: t.name, description: t.description, defaultProps: t.defaultProps, propsSchema: t.propsSchema },
    })
    console.log(`Seeded: ${t.name}`)
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
```

- [ ] **Step 5: Run seed**

```bash
npx tsx prisma/seed.ts
```

Expected output:
```
Seeded: Branded Slide
Seeded: Logo Intro
Seeded: Product Teaser
Seeded: Data Reveal
Seeded: Ad Variant
```

- [ ] **Step 6: Commit**

```bash
git add app/api/v1/templates/ prisma/seed.ts
git commit -m "feat: add templates REST API and seed 5 compositions"
```

---

## Task 18: Dashboard layout + nav

**Files:**
- Create: `app/layout.tsx`, `components/nav.tsx`

- [ ] **Step 1: Write `components/nav.tsx`**

```bash
mkdir -p components
```

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Video, LayoutTemplate, Users, Mic, Building2 } from 'lucide-react'

const links = [
  { href: '/', label: 'Jobs', icon: Video },
  { href: '/templates', label: 'Templates', icon: LayoutTemplate },
  { href: '/avatars', label: 'Avatars', icon: Users },
  { href: '/voices', label: 'Voices', icon: Mic },
  { href: '/clients', label: 'Clients', icon: Building2 },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <aside className="w-56 shrink-0 border-r min-h-screen p-4 flex flex-col gap-1">
      <div className="text-lg font-bold mb-6 px-2">Vidgenatar</div>
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
            pathname === href ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          )}
        >
          <Icon className="w-4 h-4" />
          {label}
        </Link>
      ))}
    </aside>
  )
}
```

- [ ] **Step 2: Update `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/nav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = { title: 'Vidgenatar', description: 'Automated video generation' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <Nav />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx components/nav.tsx
git commit -m "feat: add dashboard layout with sidebar nav"
```

---

## Task 19: Jobs dashboard page

**Files:**
- Create: `app/page.tsx`, `components/status-badge.tsx`, `components/jobs-table.tsx`

- [ ] **Step 1: Write `components/status-badge.tsx`**

```tsx
import { Badge } from '@/components/ui/badge'

type Status = 'queued' | 'processing' | 'completed' | 'failed'

const variants: Record<Status, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  queued: 'secondary',
  processing: 'default',
  completed: 'outline',
  failed: 'destructive',
}

export function StatusBadge({ status }: { status: Status }) {
  return <Badge variant={variants[status]}>{status}</Badge>
}
```

- [ ] **Step 2: Write `components/jobs-table.tsx`**

```tsx
import Link from 'next/link'
import { StatusBadge } from './status-badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Job = {
  id: string
  title: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  createdAt: Date | string
  client: { name: string } | null
  template: { name: string } | null
  videoFilePath: string | null
}

export function JobsTable({ jobs }: { jobs: Job[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Template</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="font-medium">{job.title}</TableCell>
            <TableCell>{job.client?.name ?? '—'}</TableCell>
            <TableCell>{job.template?.name ?? '—'}</TableCell>
            <TableCell><StatusBadge status={job.status} /></TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(job.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              {job.status === 'completed' && job.videoFilePath && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/download?path=${encodeURIComponent(job.videoFilePath)}`}>Download</a>
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
        {jobs.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              No jobs yet. <Link href="/videos/new" className="underline">Create one</Link>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
```

- [ ] **Step 3: Write `app/page.tsx`**

```tsx
import Link from 'next/link'
import { db } from '@/lib/db'
import { JobsTable } from '@/components/jobs-table'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function JobsPage() {
  const jobs = await db.videoJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { client: true, template: true },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Video Jobs</h1>
        <Button asChild><Link href="/videos/new">New Video</Link></Button>
      </div>
      <JobsTable jobs={jobs as Parameters<typeof JobsTable>[0]['jobs']} />
    </div>
  )
}
```

- [ ] **Step 4: Write download API route `app/api/download/route.ts`**

```bash
mkdir -p app/api/download
```

```typescript
import path from 'path'
import fs from 'fs'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path')
  if (!filePath) return new Response('Missing path', { status: 400 })

  const resolved = path.resolve(filePath)
  if (!fs.existsSync(resolved)) return new Response('Not found', { status: 404 })

  const stream = fs.createReadStream(resolved)
  const filename = path.basename(resolved)

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/api/download/ components/jobs-table.tsx components/status-badge.tsx
git commit -m "feat: add jobs dashboard page with status badges and download"
```

---

## Task 20: New Video form

**Files:**
- Create: `app/videos/new/page.tsx`, `components/new-video-form.tsx`

- [ ] **Step 1: Write `components/new-video-form.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Option = { id: string; name: string }
type Template = { id: string; name: string; propsSchema: unknown; defaultProps: unknown }

type Props = {
  avatars: Option[]
  voices: Option[]
  clients: Option[]
  templates: Template[]
}

export function NewVideoForm({ avatars, voices, clients, templates }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const data = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {
      title: data.get('title'),
      script: data.get('script'),
      avatar_id: data.get('avatar_id'),
      voice_id: data.get('voice_id'),
    }
    const clientId = data.get('client_id')
    const templateId = data.get('template_id')
    if (clientId) body.client_id = clientId
    if (templateId) body.template_id = templateId

    try {
      const res = await fetch('/api/v1/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY ?? ''}` },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setError(JSON.stringify(json.error)); return }
      router.push('/')
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>New Video Job</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Title</label>
            <Input name="title" required placeholder="My Video" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Script</label>
            <Textarea name="script" required placeholder="Enter your script..." rows={8} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Avatar</label>
            <Select name="avatar_id" required>
              <SelectTrigger><SelectValue placeholder="Select avatar" /></SelectTrigger>
              <SelectContent>{avatars.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Voice</label>
            <Select name="voice_id" required>
              <SelectTrigger><SelectValue placeholder="Select voice" /></SelectTrigger>
              <SelectContent>{voices.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Client (optional)</label>
            <Select name="client_id">
              <SelectTrigger><SelectValue placeholder="No client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Template (optional)</label>
            <Select name="template_id">
              <SelectTrigger><SelectValue placeholder="No template" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Video Job'}</Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Write `app/videos/new/page.tsx`**

```bash
mkdir -p app/videos/new
```

```tsx
import { db } from '@/lib/db'
import { NewVideoForm } from '@/components/new-video-form'

export default async function NewVideoPage() {
  const [avatars, voices, clients, templates] = await Promise.all([
    db.avatar.findMany({ orderBy: { name: 'asc' } }),
    db.voice.findMany({ orderBy: { name: 'asc' } }),
    db.client.findMany({ orderBy: { name: 'asc' } }),
    db.template.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Video</h1>
      <NewVideoForm avatars={avatars} voices={voices} clients={clients} templates={templates} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/videos/ components/new-video-form.tsx
git commit -m "feat: add new video form page"
```

---

## Task 21: Remaining dashboard pages

**Files:**
- Create: `app/templates/page.tsx`, `app/avatars/page.tsx`, `app/voices/page.tsx`, `app/clients/page.tsx`

- [ ] **Step 1: Write `app/templates/page.tsx`**

```bash
mkdir -p app/templates app/avatars app/voices app/clients
```

```tsx
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const templates = await db.template.findMany({ orderBy: { name: 'asc' } })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Templates</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <Card key={t.id}>
            {t.previewThumbnailUrl && (
              <img src={t.previewThumbnailUrl} className="w-full h-36 object-cover rounded-t-lg" />
            )}
            <CardHeader>
              <CardTitle className="text-base">{t.name}</CardTitle>
              <CardDescription>{t.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground font-mono">{t.compositionId}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `app/avatars/page.tsx`**

```tsx
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function AvatarsPage() {
  const avatars = await db.avatar.findMany({ orderBy: { name: 'asc' } })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Avatars</h1>
        <form action="/api/v1/avatars/sync" method="POST">
          <Button variant="outline" type="submit">Sync from HeyGen</Button>
        </form>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {avatars.map((a) => (
          <Card key={a.id}>
            {a.thumbnailUrl && (
              <img src={a.thumbnailUrl} className="w-full h-40 object-cover rounded-t-lg" />
            )}
            <CardHeader className="py-3">
              <CardTitle className="text-sm">{a.name}</CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <p className="text-xs text-muted-foreground font-mono truncate">{a.heygenAvatarId}</p>
            </CardContent>
          </Card>
        ))}
        {avatars.length === 0 && (
          <p className="text-muted-foreground col-span-full">No avatars. Click "Sync from HeyGen" to import.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write `app/voices/page.tsx`**

```tsx
import { db } from '@/lib/db'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function VoicesPage() {
  const voices = await db.voice.findMany({ orderBy: { name: 'asc' } })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Voices</h1>
        <Button variant="outline" asChild>
          <a href="/api/v1/voices/sync" target="_blank">Sync from ElevenLabs</a>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>ElevenLabs ID</TableHead>
            <TableHead>Speed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {voices.map((v) => {
            const settings = (v.settings as Record<string, unknown>) ?? {}
            return (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{v.elevenlabsVoiceId}</TableCell>
                <TableCell>{String(settings.speed ?? '1.0')}x</TableCell>
              </TableRow>
            )
          })}
          {voices.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No voices yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 4: Write `app/clients/page.tsx`**

```tsx
import { db } from '@/lib/db'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const clients = await db.client.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { jobs: true } } },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Button>New Client</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Jobs</TableHead>
            <TableHead>API Key</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell className="font-mono text-xs">{c.slug}</TableCell>
              <TableCell>{c._count.jobs}</TableCell>
              <TableCell>
                <span className="font-mono text-xs text-muted-foreground">
                  {c.apiKey.slice(0, 8)}••••••••
                </span>
              </TableCell>
            </TableRow>
          ))}
          {clients.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No clients yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/templates/ app/avatars/ app/voices/ app/clients/
git commit -m "feat: add templates, avatars, voices, clients dashboard pages"
```

---

## Task 22: Deployment config

**Files:**
- Create: `pm2.config.js`, `Procfile`, update `next.config.ts`

- [ ] **Step 1: Write `pm2.config.js`**

```javascript
module.exports = {
  apps: [
    {
      name: 'vidgenatar-web',
      script: 'node_modules/.bin/next',
      args: 'start -p 9102',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'vidgenatar-worker',
      script: 'node_modules/.bin/tsx',
      args: 'worker/index.ts',
      env: { NODE_ENV: 'production' },
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
}
```

- [ ] **Step 2: Write `Procfile`**

```
web: next start -p 9102
worker: tsx worker/index.ts
```

- [ ] **Step 3: Update `next.config.ts` to set port and output**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: { serverComponentsExternalPackages: ['@remotion/renderer', '@remotion/bundler'] },
}

export default nextConfig
```

- [ ] **Step 4: Write `Dockerfile`**

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache chromium nss freetype freetype-dev harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV CHROME_PATH=/usr/bin/chromium-browser
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/remotion ./remotion
COPY --from=builder /app/worker ./worker
COPY --from=builder /app/services ./services
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/prisma ./prisma
COPY pm2.config.js ./
RUN npm install -g tsx pm2
EXPOSE 9102
CMD ["pm2-runtime", "pm2.config.js"]
```

- [ ] **Step 5: Commit**

```bash
git add pm2.config.js Procfile Dockerfile next.config.ts
git commit -m "feat: add deployment config for Coolify with pm2 and Docker"
```

---

## Task 23: Wire up `NEXT_PUBLIC_ADMIN_KEY` + final verification

**Files:**
- Update: `.env.example`, `next.config.ts`

- [ ] **Step 1: Add `NEXT_PUBLIC_ADMIN_KEY` to `.env.example`**

```bash
# Add this line to .env.example:
NEXT_PUBLIC_ADMIN_KEY=change-me   # same value as ADMIN_API_KEY, exposed to browser for dashboard
```

- [ ] **Step 2: Verify all routes import correctly**

```bash
npx tsc --noEmit
```

Expected: no errors (or only Remotion JSX errors which are expected at type-check time).

- [ ] **Step 3: Run split tests to confirm nothing regressed**

```bash
npx jest
```

Expected: all tests pass.

- [ ] **Step 4: Run DB migration + seed on a local Postgres instance**

```bash
npx prisma migrate dev
npx tsx prisma/seed.ts
```

- [ ] **Step 5: Start dev server and verify pages load**

```bash
npm run dev
```

Open http://localhost:3000 — Jobs, Templates, Avatars, Voices, Clients pages should render without errors.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete vidgenatar v1 implementation"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| VideoJob CRUD | Task 15 |
| Avatar CRUD + HeyGen sync | Task 16 |
| Voice CRUD + ElevenLabs sync | Task 16 |
| Client CRUD | Task 16 |
| Template list + preview render | Task 17 |
| Webhook registration + delivery | Tasks 16, 14 |
| Pipeline: split → audio → upload → video → poll → download | Tasks 6, 12, 13 |
| Remotion stage 0 (template render) | Task 11 |
| Resumability (chunk state in DB) | Task 14 |
| 5 Remotion compositions | Tasks 9, 10 |
| BrandedSlide, LogoIntro, ProductTeaser, DataReveal, AdVariant | Task 10 |
| Template props resolution (client → template → job) | Task 14 |
| Dashboard: 6 pages | Tasks 18–21 |
| Auth: admin + per-client keys | Task 4 |
| BullMQ job queue | Task 5 |
| pm2 dual-process deployment | Task 22 |
| Coolify port 9102 | Task 22 |
