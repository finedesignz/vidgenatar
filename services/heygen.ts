export type HeyGenAvatar = {
  avatar_id: string
  avatar_name: string
  preview_image_url: string | null
  avatarType: 'stock' | 'custom'
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
  const [stockRes, customRes] = await Promise.all([
    fetch(`${BASE}/v2/avatars`, { headers: headers() }),
    fetch(`${BASE}/v2/avatars?is_public=false`, { headers: headers() }),
  ])

  if (!stockRes.ok) throw new Error(`HeyGen list avatars error ${stockRes.status}`)

  const stockData = await stockRes.json()
  const stockAvatars: HeyGenAvatar[] = (stockData.data?.avatars ?? []).map((a: Record<string, unknown>) => ({
    avatar_id: a.avatar_id as string,
    avatar_name: a.avatar_name as string,
    preview_image_url: (a.preview_image_url ?? null) as string | null,
    avatarType: 'stock' as const,
  }))

  let customAvatars: HeyGenAvatar[] = []
  if (customRes.ok) {
    const customData = await customRes.json()
    const rawCustom: Record<string, unknown>[] = customData.data?.avatars ?? []
    // Deduplicate — only include avatars not already in the stock list
    const stockIds = new Set(stockAvatars.map((a) => a.avatar_id))
    customAvatars = rawCustom
      .filter((a) => !stockIds.has(a.avatar_id as string))
      .map((a) => ({
        avatar_id: a.avatar_id as string,
        avatar_name: a.avatar_name as string,
        preview_image_url: (a.preview_image_url ?? null) as string | null,
        avatarType: 'custom' as const,
      }))
  }

  return [...stockAvatars, ...customAvatars]
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
