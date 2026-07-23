# Handoff: aperIA — Landing "Opção C · Fundo v1" (Cena Hero Mascote Gato)

## Overview
Landing page de marketing da aperIA (plataforma de **Attack Path Validation** / ASPM).
Comunica a proposta "From Attack to Defense": correlacionar evidências de scanners
com IA e **provar** o caminho real até uma invasão via emulação de adversário.
A página é dark, cinematográfica, com sotaque carmim (vermelho) e um mascote 3D
(gato ciber-militar) no hero.

## About the Design Files
Os arquivos deste pacote são **referências de design feitas em HTML** — protótipos que
mostram o visual e o comportamento pretendidos, **não** código de produção para copiar
literalmente. A tarefa é **recriar este design no ambiente do codebase de destino**
(no seu caso: **React + Vite**), usando os padrões e bibliotecas já estabelecidos ali
(sistema de componentes, roteamento, CSS/Tailwind, etc.). Se ainda não houver ambiente,
escolha o framework mais adequado e implemente lá.

> Observação técnica: os `.dc.html` usam um runtime interno de preview (`support.js`,
> tags `<x-dc>`, `<helmet>`, holes `{{ ... }}`, `<dc-import>`). **Nada disso deve ir para
> produção.** Trate como fonte de referência: leia a marcação e os valores (hex, spacing,
> tipografia, animações) e reescreva em componentes React idiomáticos.

## Fidelity
**Alta fidelidade (hi-fi).** Cores, tipografia, espaçamento, animações e microinterações
estão finalizados. Recrie a UI fielmente usando as bibliotecas do seu codebase.

## Como abrir para referência
Abra `aperIA - Opcao C Fundo v1 - Cena Hero Mascote Gato.dc.html` direto no navegador
(ele carrega `support.js` por caminho relativo). Sirva a pasta via um static server local
(ex.: `npx serve .`) para os assets carregarem.

## Estrutura da página (seções, de cima para baixo)
Container raiz: `[data-page]` com `max-width` de conteúdo **1240–1280px**, centralizado,
padding lateral **32px**.

1. **Fundo cinematográfico (canvas fixo)** — `<canvas>` `position:fixed; inset:0; z-index:0`.
   Anima uma "chuva de código" carmim descendo a tela (glifos `01{}</>xaf9$;=+#λ`),
   com faixa superior de 98px limpa (para o header). Desliga com `prefers-reduced-motion`.
2. **Header sticky** — logo (`assets/mark.svg` + wordmark "aper**IA**"), nav âncora,
   botões "Entrar" (outline) e "Cadastrar" (sólido carmim). `backdrop-filter: blur(14px)`.
3. **Hero split** — grid 2 colunas `minmax(0,0.92fr) / minmax(0,1.08fr)`, gap 52px.
   - Esq.: H1 "From Attack **to Defense.**" (clamp 40–74px, weight 800), parágrafo,
     CTA "Solicite uma demonstração →".
   - Dir.: **mascote** (`mascote-gato.png`) com `animation: catBob` + camada de glow
     (`mascote-gato-glow.png`, `mix-blend-mode:screen`) + halo radial `breatheGlow`.
4. **Attack Path (scrollytelling)** — seção alta (~1560px). Um trilho vertical à esquerda
   com um "marcador de chama" que desce conforme o scroll; 14 nós (etapas) se acendem em
   sequência. Big number de confiança `{{ apConf }}%` sincronizado ao progresso.
   Botão "Ver o caminho completo →" abre um **modal** de attack path (disclosure progressiva).
   Divide-se em 3 tiers rotulados: **TRIAGEM · ANÁLISE · EMULAÇÃO**.
5. **Como funciona / Camadas** — H2 "Do sinal à prova, em três camadas.", 3 colunas
   (01 Coletar · 02 Correlacionar · 03 [Provar]) com um "flowrail" horizontal cinza→carmim.
6. **Ecossistema** — marquee horizontal infinito de logos de ferramentas
   (`logo-semgrep/trivy/zap/prowler/opencti/caldera/mitre-attack.png`) em cards claros.
7. **Footer** — colunas de links + copyright "© 2026 aperIA".

## Design Tokens
Fonte: `tokens.css` do projeto + valores inline da página.

### Cores
- **Fundo/superfícies**: `--bg #08090c`, `--surface-1 #161920` (ou `#12151b` no modal),
  `--surface-2 #1f2228`, `#0c0d10` (nós).
- **Texto**: `--fg #f4f5f7`, `--fg-mute #aeb3bd`, `--fg-dim #767c88`.
- **Linhas**: `--line #2e323a`, `border rgba(255,255,255,.06–.07)`.
- **Acento carmim**: `--accent #e5333b`, `--accent-bright #ff4d54`, hover `#ff5a61`.
  Escala vermelha: `#ff6b6b #ef3a3a #e11d2a/#d81f2a #b81620 #8d0e16 #5a070d #2b0306`.
- **Severidade** (nós/hops): critical `#ff2d3d`, high `#ff6a3d`, medium `#f5a524`/`#c99542`,
  info `#4aa3ff`, safe `#2ecc8b`.

### Tipografia
- Display/brand: **Space Grotesk** (`--fd`), weights 700/800.
- Corpo: **Inter** (e "Open Sans" no dashboard).
- Mono: **JetBrains Mono** (labels, captions, números).
- Também carregadas: Manrope, Clash Display, Geist / Geist Mono, Plus Jakarta Sans.
- H1 hero: `clamp(40px,5.2vw,74px)`, weight 800, `letter-spacing:-.03em`, `line-height:1`.
- H2 seção: `clamp(30px,3.6vw,46px)`, weight 700, `letter-spacing:-.02em`.
- Big number confiança: Space Grotesk `clamp(58px,7vw,88px)`, weight 800.

### Raio / sombra / motion
- Raio: `--rs 7px` (botões), 8–14px (cards/modais).
- Glow botão carmim: `0 0 0 1px rgba(255,77,84,.4), 0 14px 40px -10px rgba(229,51,59,.75)`.
- Easing hero pop: `cubic-bezier(.34,1.6,.5,1)`; durações 0.15s–0.6s.

## Interações & comportamento
- **Scroll-driven attack path**: progresso `p` (0→1) calculado do `getBoundingClientRect`
  da seção vs. viewport; dirige `markerTop`, `railFill`, `apConf` e o acender dos 14 nós
  (`glowN`, `actN`, `litLN`, `popN`, `checkN`). Caption muda por faixa de progresso
  ("triando · Tier 1…" → "kill chain confirmada · 8/8 etapas").
- **Modal attack path**: abre no clique do CTA; trava `body` overflow; fecha com `Esc`,
  clique no overlay ou botão ✕. Hops entram com `apmHop` escalonado.
- **Contadores de evidência**: animam de 0 ao alvo quando entram na viewport
  (IntersectionObserver): confiança 94, ruído 92, MTTR 68, peso 30.
- **Marquee de logos**: `marqueeX` 48s linear infinito; pausa no hover.
- **Respeita `prefers-reduced-motion`**: canvas, chama e contadores desligam/saltam ao estado final.

## Estado necessário (equivalente React)
`ap` (progresso 0–1 do scroll), `modalOpen`, `signedUp`, e os contadores
`evConf/evNoise/evMttr/evWeight`. Derivados por render: `apConf`, `markerTop`,
`railFill`, `apCaption` e os arrays de acendimento dos nós (glow/act/lit/pop/check ×14).
Handlers: `openModal`, `closeModal`, `onSignup`, listeners de `scroll`/`resize`.

## Assets (na pasta `assets/`)
- `mark.svg` — marca aperIA (favicon/logo).
- `mascote-gato.png` — mascote 3D (gato ciber-militar + triângulo carmim). Hero.
- `mascote-gato-glow.png` — camada de glow do mascote (usar com `mix-blend-mode:screen`).
- `logo-{semgrep,trivy,zap,prowler,opencti,caldera,mitre-attack}.png` — logos de ecossistema.
São imagens rasterizadas/SVG prontas; recopie para os assets do seu projeto.

## Dependências entre arquivos
- `aperIA - Opcao C Fundo v1 - Cena Hero Mascote Gato.dc.html` — página principal.
- `aperIA Cena Cinematica - Do Sinal a Prova.dc.html` — componente filho (`<dc-import>`)
  usado dentro da seção "Camadas". Recrie como um componente React separado.
- `support.js` — runtime de preview do protótipo. **Referência apenas; não portar.**

## Arquivos neste pacote
```
design_handoff_landing_opcao_c/
├─ README.md
├─ aperIA - Opcao C Fundo v1 - Cena Hero Mascote Gato.dc.html   ← página principal
├─ aperIA Cena Cinematica - Do Sinal a Prova.dc.html            ← componente filho
├─ support.js                                                   ← runtime (só referência)
└─ assets/  (mark.svg, mascote-gato.png, mascote-gato-glow.png, logo-*.png)
```
