import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@remotion/renderer', '@remotion/bundler'],
}

export default nextConfig
