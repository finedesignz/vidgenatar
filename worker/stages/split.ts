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
