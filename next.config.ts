import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },
  },
}

export default nextConfig
