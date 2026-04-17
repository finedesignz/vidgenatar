import React from 'react'
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { BrandBackground } from '../components/BrandBackground'
import { AnimatedText } from '../components/AnimatedText'
import { defaultBrand, type BrandTokens } from '../lib/brand'

type Props = { metric: string; label: string; context?: string; brand: Partial<BrandTokens> }

export const DataReveal: React.FC<Props> = ({ metric, label, context, brand }) => {
  const b = { ...defaultBrand, ...brand }
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const metricScale = spring({ frame, fps, from: 0, to: 1, durationInFrames: 40, config: { damping: 10 } })

  return (
    <AbsoluteFill style={{ fontFamily: b.fontFamily }}>
      <BrandBackground brand={b} />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 180, fontWeight: 900, color: b.primaryColor, transform: `scale(${metricScale})`, lineHeight: 1 }}>
          {metric}
        </div>
        <AnimatedText text={label} delay={30} fontSize={56} color={b.textColor} fontFamily={b.fontFamily} />
        {context && <AnimatedText text={context} delay={45} fontSize={32} color={b.secondaryColor} fontFamily={b.fontFamily} />}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
