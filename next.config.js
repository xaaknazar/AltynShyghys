/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  swcMinify: true,
  
  images: {
    domains: [],
  },
  
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  output: 'standalone',
}

module.exports = nextConfig