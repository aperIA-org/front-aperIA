/**
 * Declaração ambiente para importar CSS por efeito colateral
 * (`import './globals.css'`).
 *
 * O Next.js gera `next-env.d.ts` com os tipos de imagem, mas não declara
 * `*.css`. Versões mais recentes do TypeScript passaram a exigir isso e
 * apontam TS2882 ("Cannot find module or type declarations for side-effect
 * import") — inclusive quando o `tsc` do projeto ainda não reclama, o que faz
 * o erro aparecer só no editor.
 */
declare module '*.css';
