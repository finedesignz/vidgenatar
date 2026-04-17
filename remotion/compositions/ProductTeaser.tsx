import React from 'react'
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { BrandBackground } from '../components/BrandBackground'
import { AnimatedText } from '../components/AnimatedText'
import { defaultBrand, type BrandTokens } from '../lib/brand'

type Props = { headline: string; subline: string; cta: string; brand: Partial<BrandTokens> }

export const ProductTeaser: React.FC<Props> = ({ headline, subline, cta, brand }) => {
  const b = { ...defaultBrand, ...brand }
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const ctaOpacity = spring({ frame: frame - 60, fps, from: 0, to: 1, durationInFrames: 20 })
  const ctaScale = spring({ frame: frame - 60, fps, from: 0.8, to: 1, durationInFrames: 20 })

  return (
    <AbsoluteFill style={{ fontFamily: b.fontFamily }}>
      <BrandBackground brand={b} />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
        <AnimatedText text={headline} delay={10} fontSize={96} color={b.textColor} fontFamily={b.fontFamily} />
        <AnimatedText text={subline} delay={25} fontSize={48} color={b.secondaryColor} fontFamily={b.fontFamily} />
        <div
          style={{
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
            marginTop: 32,
            padding: '24px 64px',
            background: b.primaryColor,
            borderRadius: 16,
            fontSize: 40,
            color: '#ffffff',
            fontWeight: 700,
          }}
        >
          {cta}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
