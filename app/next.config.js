/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Image optimization for stock footage thumbnails
  images: {
    remotePatterns: [
      { hostname: 'images.pexels.com' },
      { hostname: 'cdn.pixabay.com' },
      { hostname: 'img.youtube.com' }
    ],
    formats: ['image/webp', 'image/avif']
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_DOMAIN: process.env.NEXT_PUBLIC_APP_DOMAIN || '[DOMAIN]',
  },

  // Webpack configuration for FFmpeg
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('fluent-ffmpeg');
    }
    return config;
  },
};

module.exports = nextConfig;
