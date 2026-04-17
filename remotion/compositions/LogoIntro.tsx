import React from 'react'
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { BrandBackground } from '../components/BrandBackground'
import { defaultBrand, type BrandTokens } from '../lib/brand'

type Props = { brand: Partial<BrandTokens> }

export const LogoIntro: React.FC<Props> = ({ brand }) => {
  const b = { ...defaultBrand, ...brand }
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const scale = spring({ frame, fps, from: 0, to: 1, durationInFrames: 30, config: { damping: 12 } })
  const opacity = spring({ frame, fps, from: 0, to: 1, durationInFrames: 20 })

  return (
    <AbsoluteFill style={{ fontFamily: b.fontFamily }}>
      <BrandBackground brand={b} />
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {b.logoUrl ? (
          <img
            src={b.logoUrl}
            style={{ width: 320, height: 320, objectFit: 'contain', transform: `scale(${scale})`, opacity }}
          />
        ) : (
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: 32,
              background: b.primaryColor,
              transform: `scale(${scale})`,
              opacity,
            }}
          />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
