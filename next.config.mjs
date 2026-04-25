/** @type {import('next').NextConfig} */
import withPWA from 'next-pwa';

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        pathname: '**',
      },
      {
        hostname: 'images.pexels.com', 
      },
      {
        hostname: 'images.unsplash.com'
      },
      {
        hostname: 'plus.unsplash.com'
      },
      {
        hostname: 'cdn.dummyjson.com'
      },
      {
        hostname: 'i.dummyjson.com'
      },
      {
        hostname: 'drive.google.com'
      },
      {
        hostname: 'iili.io'
      },
    ],
  },
  turbopack: {},
}

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
  ],
  buildExcludes: [/middleware-manifest.json$/],
  publicExcludes: ['!noprecache/**/*'],
  disable: false, // Enable PWA in all environments
})

export default pwaConfig(nextConfig)
