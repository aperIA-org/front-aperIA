# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Front-end for **aperIA**, a security product concept (Attack Path Validation: correlate scanner findings
with AI + adversary emulation). All UI copy and commit messages are **pt-BR**.

The project is **mid-migration** from a hand-maintained static site to Next.js. Read the next section
before touching anything.

## Migration status — READ THIS FIRST

| Page | Route | Status |
|---|---|---|
| Landing | `/` | ✅ **ported** — `src/app/page.tsx` + `src/components/landing/*` |
| Cadastro | `/cadastro` | ✅ **ported** — `src/app/cadastro/page.tsx` |
| Login | `/login` | ✅ **ported** — `src/app/login/page.tsx` |
| Dashboard | `/dash/*` | ❌ **NOT ported** — still only `legacy/dash/index.html` |

`legacy/` holds the original static site as a visual/functional reference (see `legacy/README.md`). It is
excluded from the build by `tsconfig.json` and `next.config.ts`. It can be deleted once the dashboard port
is validated — git history preserves it.

**Consequence:** the app currently has dead links. `src/lib/dash-routes.ts` and
`src/components/auth/DashPreviewCarousel.tsx` already point at `/dash*` routes that do not exist yet.
Creating them is the next task.

## Commands

```bash
npm install       # NOTE: Node.js is not installed in the dev container this was built in
npm run dev       # http://localhost:3000
npm run build
npm run lint
npm run typecheck # tsc --noEmit

# Serve the legacy static site side by side for visual comparison
python3 -m http.server 8000 --directory legacy
```

⚠️ **Nothing in `src/` has ever been compiled.** The entire port was hand-authored in an environment with
no Node.js, so it has never been typechecked, linted, or rendered. Expect to fix small errors on the first
`npm run build`, and verify the landing page visually against `legacy/`.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS **v4** (CSS-first config, no
`tailwind.config.js`). Path alias `@/*` → `src/*`. Fonts via `next/font` (self-hosted; the static site
used Google Fonts `<link>` tags).

## Two visual systems

This is the most important thing to understand about the CSS.

1. **"paper"** — landing + cadastro. Always light: beige `#f2f0e9`, brand red `#d81f2a`. Tokens are
   fixed values in `@theme` (`bg-paper`, `text-ink`, `text-ink-mute`, `border-paper-line`, …).
2. **"dash"** — dashboard. **Dark is the baseline**, light is an override on `[data-theme="light"]`.
   Tokens are CSS custom properties in `:root` / `[data-theme='light']`, and the `@theme` aliases
   (`bg-surface`, `text-fg`, `border-line`, …) point at them — so components need **no variant at all**,
   the attribute swap does the work.

Because dash is dark-by-default, `globals.css` registers a **`light:`** variant, not `dark:`. Reaching for
`dark:` here is always a mistake.

Everything lives in `src/app/globals.css`: `@theme` tokens, both dash token blocks, the landing keyframes,
the scroll-reveal `@supports` blocks, and the Attack Path `calc()` machinery.

## The landing page port

The original `index.html` was a 2.8 MB **generated bundle** whose real source was a JSON-escaped string
inside `<script type="__bundler/template">`, rendered at runtime by a generated "dc" runtime
(`legacy/support.js`). To read that source:

```bash
python3 -c "
import json,re
src=open('legacy/index.html',encoding='utf-8').read().split('\n')
print(json.loads(re.search(r'<script type=\"__bundler/template\">(.*)</script>',src[381],re.S).group(1)))
" > /tmp/landing.decoded.html
```

Things the port deliberately changed — do not "restore" them without asking:

- **All 3 post-hydration patch scripts are gone.** They existed only because the generated markup could
  not be edited, and they found elements by matching **visible Portuguese text** (`/Coletar/i`,
  `/Confirm merge/i`, `textContent === "aperIA"`). Their real effects are now authored directly:
  `text-ink-graf` (`#3A2E2A`) in the footer bottom bar and the "Como funciona" dim texts,
  `rgba(58,46,42,.22)` on the layer-card `border-top` (so card 03 has **no** red top border), the
  ecosystem marquee rendered inside `<HeroSection>`, and the LAWLER font on `<Wordmark>`.
- **4 of the 9 original sections were empty and were dropped** (`Plataforma`, `O problema`,
  `Ecossistema`, `Diferenciais`). The nav link that pointed at the empty `#problema` now targets
  `#camadas`.
- **A recursive `<dc-import>` self-embed was dropped** — it rendered the whole page again, floating over
  the PR section on desktop. This is a real, if small, visual change.
- **The intro overlay no longer renders under `prefers-reduced-motion`** (it used to show a blank beige
  screen for 3.1 s — a bug).
- **Two logos are intentionally still distorted** (footer 113×110, PR bot avatar 119×83) because inline
  styles overrode their `width`/`height` attributes in the original and the port stays visually faithful.
  Both are commented in the code. They are almost certainly mistakes worth fixing.
- Dead code dropped: the `bgRef` canvas + code-rain (~90 lines), `flameRef`, `evRef`/`_countEv`, and the
  `signedUp`/`onSignup` success branch (never wired — the CTA is a native GET form).

### The Attack Path animation

`src/hooks/useAttackPathProgress.ts` + the `.ap-*` classes in `globals.css`. The original recomputed
14 nodes × 5 derived values through `setState` on **every rAF** (~70 style objects per frame). The port
writes a single `--ap` custom property (0→1) on the section and derives everything in CSS `calc()`, so
scrolling never re-renders React. Only `confidence` (`Math.round(p*94)`) and the caption string are state.

The algebra must stay exact: `tops[i] = 3 + i*(87/13)`, `markerPct = 3 + p*87`,
`L = clamp01((markerPct - top)/4 + 1)`, `opacity = 0.45 + 0.55*L`, `scale = 0.96 → 1` at `L ≥ 0.5`.
CSS has no ternary, so the step functions (`--act`, `--pop`, `--check`) are emulated as
`clamp(0, (x - threshold) * 1000, 1)`.

The rail's **fixed `height: 1560px`** with percentage-positioned rows is load-bearing — the `tops[]` math
depends on it. Don't refactor it to flow layout without re-deriving the positions.

## Cadastro / login

**Two routes, one component.** The static site used a single page with a query-param mode
(`cadastro.html?mode=login`); the port splits it into `/cadastro` and `/login`, both rendering
`<AuthPage mode>`. That gives clean URLs, real per-route `metadata`, and separate analytics, with no
duplicated UI — the ~20% that differs lives in `authCopy()` and two conditional fields in `AuthForm`.

`/cadastro?mode=login` still works: it 307s to `/login`, preserving `?email=`. The redirect is done **in
the page component**, not `next.config.ts`, because a config redirect forwards the whole query string and
the destination would end up `/login?mode=login`. **When porting the dashboard, point `logout()` at
`/login` directly** rather than relying on this alias.

`AUTH_CONFIG` in `src/lib/auth-config.ts` is the back-end seam, and is **not wired to a back-end yet** —
by design, that comes later. While `SIGNUP_ENDPOINT`/`LOGIN_ENDPOINT` are empty the page runs in **demo
mode**: validation still applies, then it goes straight to the dashboard without persisting. Endpoints can
also be supplied via `NEXT_PUBLIC_*` env vars.

The left panel drives the *real* dashboard in an iframe. The original reached into the iframe's DOM to
click `.sb-item[data-screen="…"]` and wrote to its `localStorage`; the port uses **`postMessage`** plus a
`?preview=1&theme=light` query, so stepping through screens no longer reloads the frame. The dash side of
that contract (`PREVIEW_NAVIGATE_MESSAGE` in `src/lib/dash-routes.ts`) still needs implementing.

## When porting the dashboard

`legacy/dash/index.html` is ~2700 lines: a single-file SPA where every screen is a function returning an
HTML string assigned to `#app-main.innerHTML`, with inline `onclick="…"` attributes calling globals.

- Routing is `navigate(screen)`. The chosen target is **real routes** — the map already exists in
  `src/lib/dash-routes.ts` (`/dash`, `/dash/findings`, `/dash/scans`, `/dash/relatorios`,
  `/dash/relatorios/[id]`, `/dash/remediacoes`, `/dash/ai-emulation`, `/dash/repositorios`, `/dash/time`).
- Keep the `data-screen` attributes on sidebar items — the cadastro preview contract uses them.
- **Onboarding gate**: `appConnected` (`localStorage.aperia-connected`) locks the data screens
  (`findings`, `pipelines`, `reports`, `reportDetail`, `attack`, `remediations`).
- **Preview mode** (`?preview=1`) forces connected and must suppress *every* `localStorage` write.
- State keys are already centralised in `src/lib/storage.ts` — reuse them, don't re-add string literals.
- **All data is deterministic mock data.** `buildFindings()` uses a seeded `mulberry32` PRNG and the clock
  is frozen at `REF_NOW = 2024-06-29T16:00:00Z` so relative timestamps stay stable. Preserve both exactly;
  never introduce `Date.now()`.

## Conventions

- Commit messages: Portuguese, imperative, **no accents in the subject line**
  (e.g. `Atualiza dashboard: paginacao na lista de Findings`).
- Code comments in Portuguese, and only where they explain *why* — a workaround, a non-obvious value, or
  something inherited from the old runtime. Several existing comments record that a value came from a
  patch script rather than the original markup; keep them.
- Prefer Tailwind utilities (including arbitrary values like `text-[13.5px]`). Use `style={{…}}` only for
  what Tailwind cannot express: multi-layer `filter`, `mask-image`, `conic-gradient`, comma-separated
  multi-animations, and per-node dynamic values.
- Server components by default; `'use client'` only where there is genuinely state, an effect, or a
  handler.
