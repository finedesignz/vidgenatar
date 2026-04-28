'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Jobs', icon: '▶' },
  { href: '/templates', label: 'Templates', icon: '◈' },
  { href: '/avatars', label: 'Avatars', icon: '◉' },
  { href: '/voices', label: 'Voices', icon: '◎' },
  { href: '/clients', label: 'Clients', icon: '◇' },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <nav
      className="w-56 min-h-screen flex flex-col flex-shrink-0"
      style={{
        background: 'linear-gradient(180deg, #16161f 0%, #111118 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-7 pb-8">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ background: 'var(--accent)', color: '#0c0c10' }}
          >
            V
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight" style={{ color: 'var(--foreground)' }}>
              Vidgenatar
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Video Generator</p>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="flex flex-col gap-0.5 px-3 flex-1">
        {links.map(({ href, label, icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                active
                  ? 'text-white'
                  : 'hover:text-white'
              )}
              style={active ? {
                background: 'rgba(245, 154, 35, 0.12)',
                color: 'var(--accent)',
                boxShadow: 'inset 1px 0 0 var(--accent)',
              } : {
                color: 'var(--muted)',
              }}
            >
              <span className="text-xs w-4 text-center opacity-70">{icon}</span>
              {label}
            </Link>
          )
        })}
      </div>

      {/* Sign out */}
      <div className="px-3 pb-6">
        <div style={{ height: '1px', background: 'var(--border)', margin: '0 0 12px' }} />
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--foreground)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
          >
            <span className="text-xs w-4 text-center opacity-70">↩</span>
            Sign out
          </button>
        </form>
      </div>
    </nav>
  )
}
