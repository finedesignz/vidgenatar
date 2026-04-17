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
