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

async function deliverWebhooks(jobId: string, status: string, videoUrl?: string | null) {
  const job = await db.videoJob.findUnique({
    where: { id: jobId },
    include: { client: { include: { webhooks: true } } },
  })
  if (!job?.client?.webhooks?.length) return
  for (const hook of job.client.webhooks) {
    try {
      await fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, status, video_url: videoUrl ?? null }),
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
    include: { avatar: true, voice: true, template: true, client: true },
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
        const clientDefaults = (job.client?.brandDefaults as Record<string, unknown>) ?? {}
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

    // Stages 2+3: Audio + Upload (parallel per chunk, batched)
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

    // Stages 4+5+6: Video create, poll, download (batched)
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
    const firstVideo = chunkStates[0]?.videoFile ?? null

    await db.videoJob.update({
      where: { id: jobId },
      data: {
        status: allDone ? 'completed' : 'failed',
        videoFilePath: firstVideo,
        chunks: chunkStates as unknown as never,
      },
    })

    console.log(`[Pipeline] Job ${jobId} ${allDone ? 'COMPLETED' : 'FAILED'}`)
    await deliverWebhooks(jobId, allDone ? 'completed' : 'failed', firstVideo)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[Pipeline] Job ${jobId} ERROR:`, message)
    await db.videoJob.update({ where: { id: jobId }, data: { status: 'failed', errorMessage: message } })
    await deliverWebhooks(jobId, 'failed')
    throw err
  }
}
