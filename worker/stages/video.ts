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
