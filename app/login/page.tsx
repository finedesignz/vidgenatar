export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { MagicLinkForm } from '@/components/magic-link-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await getSession()
  if (session) redirect('/')

  const params = await searchParams

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--background)' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(245,154,35,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo mark */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-11 h-11 rounded-2xl text-lg font-bold mb-4"
            style={{ background: 'linear-gradient(135deg, #f5a123 0%, #e8891a 100%)', color: '#0c0c10' }}
          >
            V
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Welcome back</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Sign in to Vidgenatar</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          }}
        >
          {params.error === 'invalid_token' && (
            <div
              className="mb-5 rounded-lg px-3.5 py-2.5 text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
            >
              That sign-in link is invalid or has expired. Please request a new one.
            </div>
          )}
          <MagicLinkForm />
        </div>

        <p className="text-center text-xs mt-5" style={{ color: 'var(--muted)' }}>
          A magic link will be sent to your email
        </p>
      </div>
    </div>
  )
}
