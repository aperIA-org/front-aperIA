import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Gera `.next/standalone` com um server.js autocontido (so runtime deps),
  // usado pelo Dockerfile multi-stage para a imagem final enxuta.
  output: 'standalone',

  // `legacy/` holds the pre-refactor static site for side-by-side reference.
  // It must never be compiled or linted as part of the app.
  eslint: {
    dirs: ['src'],
  },

  /**
   * Origens externas permitidas em `next dev`.
   *
   * O Next 15 recusa requisições de dev vindas de outro host (proteção contra
   * um site qualquer conversar com o seu dev server). Sem isto, expor via
   * ngrok/Cloudflare Tunnel carrega o HTML mas quebra assets e HMR.
   *
   * Vale só em desenvolvimento — `next build`/`next start` ignoram.
   */
  allowedDevOrigins: [
    '*.ngrok-free.app',
    '*.ngrok-free.dev',
    '*.ngrok.io',
    '*.ngrok.app',
    '*.trycloudflare.com',
  ],
};

export default nextConfig;
