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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Vidgenatar</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
        </div>
        <div className="rounded-xl border bg-card shadow-sm p-6">
          {params.error === 'invalid_token' && (
            <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              That sign-in link is invalid or has expired. Please request a new one.
            </div>
          )}
          <MagicLinkForm />
        </div>
      </div>
    </div>
  )
}
