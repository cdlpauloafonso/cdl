import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Remover output: export em desenvolvimento para evitar problemas com generateStaticParams
  ...(process.env.NODE_ENV !== 'production' && { output: undefined }),
  
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '4000', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'i.ibb.co', pathname: '/**' },
    ],
  },
};

export default nextConfig;
