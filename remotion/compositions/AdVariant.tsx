import React from 'react'
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { BrandBackground } from '../components/BrandBackground'
import { AnimatedText } from '../components/AnimatedText'
import { defaultBrand, type BrandTokens } from '../lib/brand'

type Props = { headline: string; body: string; cta: string; imageUrl?: string; brand: Partial<BrandTokens> }

export const AdVariant: React.FC<Props> = ({ headline, body, cta, imageUrl, brand }) => {
  const b = { ...defaultBrand, ...brand }
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const ctaOpacity = spring({ frame: frame - 45, fps, from: 0, to: 1, durationInFrames: 20 })

  return (
    <AbsoluteFill style={{ fontFamily: b.fontFamily }}>
      <BrandBackground brand={b} />
      {imageUrl && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', overflow: 'hidden' }}>
          <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.8))' }} />
        </div>
      )}
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: 80, gap: 24 }}>
        <AnimatedText text={headline} delay={10} fontSize={72} color={b.textColor} fontFamily={b.fontFamily} />
        <AnimatedText text={body} delay={25} fontSize={36} color={b.secondaryColor} fontFamily={b.fontFamily} />
        <div style={{ opacity: ctaOpacity, padding: '20px 60px', background: b.primaryColor, borderRadius: 12, fontSize: 36, color: '#fff', fontWeight: 700, marginTop: 16 }}>
          {cta}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
