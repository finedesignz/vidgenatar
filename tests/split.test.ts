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
