import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Com `output: 'export'`, o dev server só renderiza URLs já previstas em generateStaticParams;
  // rotas dinâmicas como `/institucional/campanhas/inscricao/[slug]` falhariam para slugs novos.
  // Em desenvolvimento não usamos export; o build de produção (`next build`) mantém o export estático.
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' as const } : {}),
  ...(process.env.NODE_ENV !== 'production'
    ? {
        webpack: (config) => {
          // Evita timeouts ao carregar chunks durante compilações lentas no `next dev`.
          config.output = {
            ...config.output,
            chunkLoadTimeout: 300000,
          };
          return config;
        },
      }
    : {}),
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '4000', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'i.ibb.co', pathname: '/**' },
    ],
  },
};

export default nextConfig;
