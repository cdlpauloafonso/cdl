import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '4000', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'i.ibb.co', pathname: '/**' },
    ],
  },
};

export default nextConfig;
