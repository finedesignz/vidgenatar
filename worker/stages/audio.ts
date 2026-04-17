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
