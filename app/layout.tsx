import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import './globals.css'
import { Nav } from '@/components/nav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Vidgenatar',
  description: 'Automated video generation platform',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const hdrs = await headers()
  const isLoginPage = hdrs.get('x-pathname') === '/login'

  return (
    <html lang="en">
      <body className={inter.className}>
        {isLoginPage ? (
          children
        ) : (
          <div className="flex min-h-screen">
            <Nav />
            <main className="flex-1 p-6 overflow-auto">
              {children}
            </main>
          </div>
        )}
      </body>
    </html>
  )
}
