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
