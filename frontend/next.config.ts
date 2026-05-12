import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Com `output: 'export'`, o dev server só renderiza URLs já previstas em generateStaticParams;
  // rotas dinâmicas como `/institucional/campanhas/inscricao/[slug]` falhariam para slugs novos.
  // Para notícias em produção, o Netlify reescreve `/noticias/:slug` → `noticias/ver.html` (ver `netlify.toml`).
  // Em desenvolvimento não usamos export; o build de produção (`next build`) mantém o export estático.
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' as const } : {}),
  ...(process.env.NODE_ENV !== 'production'
    ? {
        webpack: (config) => {
          // Evita timeouts ao carregar chunks durante compilações lentas no `next dev`.
          // Nunca substituir `output` inteiro por spread (se `output` ainda for undefined,
          // `{ ...undefined }` vira `{}` e quebra o runtime dos módulos — TypeError `.call`).
          if (!config.output) config.output = {};
          config.output.chunkLoadTimeout = 300000;
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
