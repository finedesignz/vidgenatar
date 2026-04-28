'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function SyncButton({ url, label }: { url: string; label: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSync() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY ?? ''}` },
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Sync failed'); return }
      router.refresh()
    } catch {
      setError('Sync failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button variant="outline" onClick={handleSync} disabled={loading}>
        {loading ? 'Syncing...' : label}
      </Button>
    </div>
  )
}
