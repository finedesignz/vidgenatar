import React from 'react'
import { AbsoluteFill } from 'remotion'
import { BrandBackground } from '../components/BrandBackground'
import { AnimatedText } from '../components/AnimatedText'
import { LogoBug } from '../components/LogoBug'
import { defaultBrand, type BrandTokens } from '../lib/brand'

type Props = { title: string; subtitle?: string; brand: Partial<BrandTokens> }

export const BrandedSlide: React.FC<Props> = ({ title, subtitle, brand }) => {
  const b = { ...defaultBrand, ...brand }
  return (
    <AbsoluteFill style={{ fontFamily: b.fontFamily }}>
      <BrandBackground brand={b} />
      <LogoBug logoUrl={b.logoUrl} brand={b} />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <AnimatedText text={title} delay={10} fontSize={80} color={b.textColor} fontFamily={b.fontFamily} />
        {subtitle && <AnimatedText text={subtitle} delay={25} fontSize={40} color={b.secondaryColor} fontFamily={b.fontFamily} />}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
