import {
  Inter,
  JetBrains_Mono,
  Manrope,
  Open_Sans,
  Space_Grotesk,
} from 'next/font/google';
import localFont from 'next/font/local';

/**
 * Todas as famílias usadas pelo projeto, expostas como CSS custom properties
 * para que o `@theme` do Tailwind (globals.css) as referencie pelo mesmo nome.
 *
 * O site original carregava fontes via <link> do Google Fonts em cada página e
 * declarava 8 famílias na landing — das quais só 3 eram realmente usadas
 * (Inter, JetBrains Mono, Manrope). IBM Plex Mono, Playfair Display,
 * Space Grotesk (só como fallback que nunca disparava) e Clash Display foram
 * removidas no port. Aqui tudo passa por next/font, que faz self-host.
 */

// ── Landing ──
export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

// ── Compartilhada (landing, cadastro, dash) ──
export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

// ── Cadastro + dash ──
export const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700', '800'],
  variable: '--font-open-sans',
  display: 'swap',
});

export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

/** Fonte da marca "aperIA" — os dois wordmarks (header e footer). */
export const lawler = localFont({
  src: [
    { path: '../../public/assets/LAWLER.woff', weight: '400', style: 'normal' },
    { path: '../../public/assets/LAWLER.ttf', weight: '400', style: 'normal' },
  ],
  variable: '--font-lawler',
  display: 'swap',
});

/** Fallback histórico do wordmark — LAWLER a substitui em runtime. */
export const modernRomance = localFont({
  src: '../../public/assets/fonts/ModernRomance.otf',
  weight: '400',
  style: 'normal',
  variable: '--font-modern-romance',
  display: 'swap',
});

/**
 * H1 da hero ("From Attack / to Defense.") e o display do cadastro.
 * `display: 'block'` evita FOUT num título de até 132px.
 */
export const electroGarden = localFont({
  src: '../../public/assets/fonts/ElectroGarden.ttf',
  weight: '400',
  style: 'normal',
  variable: '--font-electro-garden',
  display: 'block',
});

/** Todas as variáveis de fonte, para aplicar no <html>. */
export const fontVariables = [
  inter.variable,
  manrope.variable,
  jetbrainsMono.variable,
  openSans.variable,
  spaceGrotesk.variable,
  lawler.variable,
  modernRomance.variable,
  electroGarden.variable,
].join(' ');
