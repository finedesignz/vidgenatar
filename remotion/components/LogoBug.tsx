import React from 'react'

type Props = { logoUrl?: string; brand: { primaryColor: string } }

export const LogoBug: React.FC<Props> = ({ logoUrl, brand }) => {
  if (!logoUrl) return null
  return (
    <div
      style={{
        position: 'absolute',
        top: 48,
        right: 64,
        width: 80,
        height: 80,
        borderRadius: 12,
        overflow: 'hidden',
        border: `2px solid ${brand.primaryColor}66`,
      }}
    >
      <img src={logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  )
}
