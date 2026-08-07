import type { Metadata } from 'next';
import { fontVariables } from '@/lib/fonts';
import './globals.css';

/**
 * Base para resolver URLs absolutas de og:image / twitter:image.
 * Em produção na Vercel a variável já vem preenchida; localmente cai no
 * localhost. Para um domínio próprio, defina NEXT_PUBLIC_SITE_URL.
 */
function resolveMetadataBase(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelHost) return new URL(`https://${vercelHost}`);

  return new URL('http://localhost:3000');
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: 'aperIA · From Attack to Defense',
  description:
    'A camada de inteligência ofensiva acima dos seus scanners. A aperIA correlaciona evidências com I.A. e prova o caminho real até uma invasão com emulação de adversário.',
  icons: {
    icon: [
      { url: '/assets/mark.svg', type: 'image/svg+xml' },
      { url: '/uploads/1.png', type: 'image/png', sizes: '32x32' },
    ],
  },
  openGraph: {
    type: 'website',
    title: 'aperIA · From Attack to Defense',
    description:
      'Attack Path Validation: correlação por I.A. + emulação real de adversário. Não uma lista de vulnerabilidades, a prova do caminho até a invasão.',
    images: ['/assets/mark.svg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'aperIA · From Attack to Defense',
    description:
      'Attack Path Validation: correlação por I.A. + emulação real de adversário.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: extensões de browser (LanguageTool, Grammarly,
    // tradutores) injetam atributos no <html> antes do React hidratar, o que
    // gera falso positivo de mismatch. O efeito é de UM nível só — vale para os
    // atributos desta tag, não para a árvore abaixo, então mismatches reais nos
    // componentes continuam sendo reportados.
    <html lang="pt-BR" className={fontVariables} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
