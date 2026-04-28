'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function MagicLinkForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Something went wrong'); return }
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center py-3">
        <div
          className="inline-flex items-center justify-center w-10 h-10 rounded-full text-lg mb-3"
          style={{ background: 'rgba(245,154,35,0.15)', color: 'var(--accent)' }}
        >
          ✉
        </div>
        <p className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>Check your inbox</p>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Sent a sign-in link to{' '}
          <span className="font-medium" style={{ color: 'var(--muted-2)' }}>{email}</span>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--muted-2)' }}>
          Email address
        </label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoFocus
        />
      </div>
      {error && (
        <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
      )}
      <Button type="submit" disabled={loading} className="w-full h-10">
        {loading ? 'Sending...' : 'Send sign-in link'}
      </Button>
    </form>
  )
}
