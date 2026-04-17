import React from 'react'
import { useCurrentFrame, useVideoConfig, spring } from 'remotion'
import type { BrandTokens } from '../lib/brand'

type Props = { brand: BrandTokens }

export const BrandBackground: React.FC<Props> = ({ brand }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const scale = spring({ frame, fps, from: 1.05, to: 1.0, durationInFrames: 40 })

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(135deg, ${brand.backgroundColor} 0%, ${brand.primaryColor}33 100%)`,
        transform: `scale(${scale})`,
      }}
    />
  )
}
