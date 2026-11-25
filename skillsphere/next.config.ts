import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The preview panel serves the dev server on 127.0.0.1, which Next treats as
  // a different origin from localhost. Without this, dev assets are blocked.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  // node:sqlite is a Node builtin used by the local demo backend only.
  serverExternalPackages: ['node:sqlite'],
}

export default nextConfig
