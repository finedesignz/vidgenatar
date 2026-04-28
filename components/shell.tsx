'use client'

import { usePathname } from 'next/navigation'
import { Nav } from '@/components/nav'

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/login') return <>{children}</>
  return (
    <div className="flex min-h-screen">
      <Nav />
      <main className="flex-1 p-8 overflow-auto min-w-0">{children}</main>
    </div>
  )
}
