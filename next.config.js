/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Enable standalone output for Docker production builds
  output: 'standalone',
}

module.exports = nextConfig
