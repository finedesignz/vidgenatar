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
