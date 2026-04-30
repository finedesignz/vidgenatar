'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Avatar = {
  id: string
  name: string
  heygenAvatarId: string
  thumbnailUrl: string | null
  avatarType: string
}

export function AvatarTabs({ avatars }: { avatars: Avatar[] }) {
  const [tab, setTab] = useState<'stock' | 'custom'>('custom')

  const stock = avatars.filter((a) => a.avatarType === 'stock')
  const custom = avatars.filter((a) => a.avatarType === 'custom')
  const shown = tab === 'stock' ? stock : custom

  return (
    <div>
      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: 'var(--surface-2)' }}>
        {(['custom', 'stock'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === t
                ? 'text-[var(--foreground)]'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            )}
            style={tab === t ? { background: 'var(--surface-3)', color: 'var(--accent)' } : {}}
          >
            {t === 'custom' ? 'My Avatars' : 'Stock Avatars'}
            <span
              className="ml-2 text-xs px-1.5 py-0.5 rounded"
              style={{ background: 'var(--surface-3)', color: 'var(--muted)' }}
            >
              {t === 'custom' ? custom.length : stock.length}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {tab === 'custom'
            ? 'No custom avatars found. Create one in HeyGen Studio, then sync.'
            : 'No stock avatars. Click "Sync from HeyGen" to import.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {shown.map((a) => (
            <Card key={a.id}>
              {a.thumbnailUrl && (
                <img src={a.thumbnailUrl} className="w-full h-40 object-cover rounded-t-lg" alt={a.name} />
              )}
              <CardHeader className="py-3">
                <CardTitle className="text-sm">{a.name}</CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                <p className="text-xs font-mono truncate" style={{ color: 'var(--muted)' }}>{a.heygenAvatarId}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
