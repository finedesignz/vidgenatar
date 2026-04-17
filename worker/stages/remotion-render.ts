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
