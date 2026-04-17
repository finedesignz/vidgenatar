import React from 'react'
import { spring, useCurrentFrame, useVideoConfig } from 'remotion'

type Props = {
  text: string
  delay?: number
  fontSize?: number
  color?: string
  fontFamily?: string
}

export const AnimatedText: React.FC<Props> = ({
  text,
  delay = 0,
  fontSize = 64,
  color = '#ffffff',
  fontFamily = 'Inter, sans-serif',
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const opacity = spring({ frame: frame - delay, fps, from: 0, to: 1, durationInFrames: 20 })
  const translateY = spring({ frame: frame - delay, fps, from: 30, to: 0, durationInFrames: 20 })

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        fontSize,
        color,
        fontFamily,
        fontWeight: 700,
        lineHeight: 1.2,
        textAlign: 'center',
        padding: '0 80px',
      }}
    >
      {text}
    </div>
  )
}
