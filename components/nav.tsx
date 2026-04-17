'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Jobs' },
  { href: '/templates', label: 'Templates' },
  { href: '/avatars', label: 'Avatars' },
  { href: '/voices', label: 'Voices' },
  { href: '/clients', label: 'Clients' },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <nav className="w-56 min-h-screen border-r bg-muted/40 p-4 flex flex-col gap-1">
      <div className="mb-6 px-2">
        <h1 className="text-lg font-semibold tracking-tight">Vidgenatar</h1>
        <p className="text-xs text-muted-foreground">Video Generator</p>
      </div>
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
            pathname === href
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground'
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
