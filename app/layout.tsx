import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import { Shell } from '@/components/shell'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata: Metadata = {
  title: 'Vidgenatar',
  description: 'Automated video generation platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={outfit.variable}>
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
