# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Front-end for **aperIA**, a security product concept (Attack Path Validation: correlate scanner findings
with AI + adversary emulation). Three surfaces: a marketing landing page, a signup/login flow, and a
prototype dashboard.

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS **v4** (CSS-first config, there is
no `tailwind.config.js`). Path alias `@/*` → `src/*`. Fonts via `next/font` (self-hosted).

**All UI copy and commit messages are pt-BR.** Code comments are Portuguese too.

The project was migrated from a hand-maintained static site, which is preserved in `legacy/` as the visual
and behavioural reference. See [legacy/](#legacy--the-pre-migration-site) below.

## Commands

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm start          # production; use this to share via a tunnel, not `dev`
npm run lint
npm run typecheck  # tsc --noEmit

# Serve the pre-migration site side by side for visual comparison
python3 -m http.server 8000 --directory legacy
```

`typecheck`, `lint` and `build` all pass clean — keep them that way. `npm run typecheck`, `npm run lint`
and `npm run build` are in the permission allowlist (`.claude/settings.json`), so they run without a prompt.

**Do not leave dev servers running in the background.** The user starts them. If you need one to verify
something, kill it in the same turn and confirm the port is free. Kill by PID from the port
(`ss -ltnp | grep -oP ':3000.*pid=\K[0-9]+'`) — **never `pkill -f next`**, because this repo lives under
`fiap/next/…` and that pattern matches the agent's own shell.

### Environment

`APERIA_API_URL` (server-only, **no** `NEXT_PUBLIC_` prefix) points at the FastAPI backend in
`../python-api`. Without it, auth runs in **demo mode**: validation still applies, then straight to the
dashboard. See `.env.example`. A local `.env` may already set it — that overrides demo mode, so a missing
backend will surface as a 502 on login.

## Two visual systems

The single most important thing to understand about the CSS.

1. **"paper"** — landing + auth. Always light: beige `#f2f0e9`, brand red `#d81f2a`. Tokens are **fixed**
   values in `@theme` (`bg-paper`, `text-ink`, `text-ink-mute`, `border-paper-line`, …).
2. **"dash"** — dashboard. **Dark is the baseline**, light is an override on `[data-theme="light"]`.
   Tokens are CSS custom properties in `:root` / `[data-theme='light']`, and the `@theme` aliases
   (`bg-surface`, `text-fg`, `border-line`, …) point at them — so components need **no variant at all**,
   the attribute swap does the work.

Because dash is dark-by-default, `globals.css` registers a **`light:`** variant, not `dark:`. Reaching for
`dark:` here is always a mistake.

`src/app/globals.css` holds the `@theme` tokens, both dash token blocks, landing keyframes, the
scroll-reveal `@supports` blocks and the Attack Path `calc()` machinery. `src/app/dash/dash.css` holds the
dashboard's component-class design system (`.stat-card`, `.sev-*`, `.dtbl`, `.btn-*`, `.chip`, `.ov-tile`,
`.sb-item`, clip-paths, keyframes) — extracted verbatim from the prototype and imported only by the dash
layout, so it doesn't load on the landing.

## Traps that have already caused bugs here

Read this section before touching layout or CSS. Each of these was a real defect, not a hypothetical.

**Every subtree needs an explicit base text colour.** The prototype's `<body>` carried `text-fg`. Nothing
in `globals.css` sets `color` on `body`, so any element that doesn't declare its own colour inherits the
browser default — **black**, which is invisible on the dark dashboard. The base colour now lives on the
dash shell (`bg-surface-deep text-fg` in `DashShell`) and on the auth page (`text-ink`). If you add a new
top-level surface, set its colour.

**`.ap-node` exists in *both* stylesheets.** The landing's scroll-driven attack path and the dashboard's
attack chain independently use that class name, and both stylesheets load on `/dash`. The landing's `.ap-*`
rules are therefore scoped under `[data-attack-path]`. Keep them scoped, and don't add a bare `.ap-*` rule
to `globals.css`.

**The dash shell must stay a client component.** Sidebar collapse changes two things that have to agree:
the grid column width on `#app-shell` and the `.sb-c` class on the `<aside>`. They both derive from
`sidebarCollapsed` in `DashShell`. When the width was hard-coded in the server-rendered layout, collapsing
shrank the sidebar to 64px and left a 192px gap — the toggle looked dead.

**Never `Date.now()`, `new Date()` with no argument, or `Math.random()`.** The prototype's clock is frozen
at `REF_NOW = 2024-06-29T16:00:00Z` and the finding dataset comes from a seeded PRNG; both would drift.
A random value also differs between server and client and breaks hydration — the prototype generated SVG
gradient ids with `Math.random()`, and those are `useId()` here. Where the prototype needed pseudo-random
data (`runScanRepo`), the port uses an FNV-1a hash of a stable key.

**`mounted` guards mean no SSR content.** Screens that depend on `localStorage` (the GitHub connection
state) render `null` until the first effect runs, so their server-rendered HTML is empty. This is the
trade-off of keeping connection state in `localStorage` — the server genuinely cannot know it. Moving
`aperia-connected` to a cookie would let those screens render server-side; worth doing when the GitHub
connection stops being simulated.

## Landing page (`/`)

`src/app/page.tsx` composes the sections; components in `src/components/landing/` (18), data in
`src/lib/landing/`.

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

- **All 3 post-hydration patch scripts are gone.** They existed only because the generated markup could not
  be edited, and they located elements by matching **visible Portuguese text** (`/Coletar/i`,
  `/Confirm merge/i`, `textContent === "aperIA"`). Their real effects are authored directly now:
  `text-ink-graf` (`#3A2E2A`) in the footer bottom bar and the "Como funciona" dim texts,
  `rgba(58,46,42,.22)` on the layer-card `border-top` (so card 03 has **no** red top border), the ecosystem
  marquee rendered inside `<HeroSection>`, and the LAWLER font on `<Wordmark>`.
- **4 of the 9 original sections were empty and were dropped** (`Plataforma`, `O problema`, `Ecossistema`,
  `Diferenciais`). The nav link that pointed at the empty `#problema` now targets `#camadas`.
- **A recursive `<dc-import>` self-embed was dropped** — it rendered the whole page again, floating over the
  PR section on desktop. A real, if small, visual change.
- **The intro overlay does not render under `prefers-reduced-motion`** (it used to show a blank beige screen
  for 3.1 s). Its font is `font-hero` (Electro Garden → Manrope): the override layer cancelled that rule's
  colour, background, filter, `text-transform` and `white-space`, but **not** `font-family`.
- **Two logos are intentionally still distorted** (footer 113×110, PR bot avatar 119×83) because inline
  styles overrode their `width`/`height` attributes in the original. Both are commented. Almost certainly
  mistakes worth fixing.
- Dead code dropped: the `bgRef` canvas + code-rain (~90 lines), `flameRef`, `evRef`/`_countEv`, and the
  `signedUp`/`onSignup` success branch (never wired — the CTA is a native GET form).

### The Attack Path animation

`src/hooks/useAttackPathProgress.ts` + the `.ap-*` classes in `globals.css`. The original recomputed
14 nodes × 5 derived values through `setState` on **every rAF** (~70 style objects per frame). The port
writes a single `--ap` custom property (0→1) on the section and derives everything in CSS `calc()`, so
scrolling never re-renders React. Only `confidence` (`Math.round(p*94)`) and the caption are state.

The algebra must stay exact: `tops[i] = 3 + i*(87/13)`, `markerPct = 3 + p*87`,
`L = clamp01((markerPct - top)/4 + 1)`, `opacity = 0.45 + 0.55*L`, `scale = 0.96 → 1` at `L ≥ 0.5`.
CSS has no ternary, so the step functions (`--act`, `--pop`, `--check`) are emulated as
`clamp(0, (x - threshold) * 1000, 1)`.

The rail's **fixed `height: 1560px`** with percentage-positioned rows is load-bearing — the `tops[]` math
depends on it. Don't refactor it to flow layout without re-deriving the positions.

## Auth (`/cadastro`, `/login`)

**Two routes, one component.** The static site used a single page with a query-param mode
(`cadastro.html?mode=login`); the port splits it into `/cadastro` and `/login`, both rendering
`<AuthPage mode>`. Clean URLs, real per-route `metadata`, separate analytics, no duplicated UI — the ~20%
that differs lives in `authCopy()` and two conditional fields in `AuthForm`.

`/cadastro?mode=login` still works: it 307s to `/login`, preserving `?email=`. The redirect is done **in
the page component**, not `next.config.ts`, because a config redirect forwards the whole query string and
the destination would end up `/login?mode=login`.

The left panel drives the *real* dashboard in an iframe. The original reached into the iframe's DOM to
click `.sb-item[data-screen="…"]`; the port uses **`postMessage`** plus `?preview=1&theme=light`, so
stepping through screens never reloads the frame. The dash side is `PreviewNavigationBridge`, which
validates the message origin.

### Back-end integration (FastAPI, `../python-api`)

**Wired via a BFF, not direct fetch.** The screens call `/api/auth/*` Route Handlers on Next, which call
the Python API server-side. Two reasons, both load-bearing:

1. **The API registers no `CORSMiddleware`** — a browser call from `:3000` to `:8000` would be blocked.
2. `POST /auth/login` returns the tokens **in the response body**. The BFF converts them into
   **`httpOnly` cookies** (`aperia_access` / `aperia_refresh`), so no XSS can read them — which
   `localStorage` would not prevent.

| Next route | Calls | Notes |
|---|---|---|
| `POST /api/auth/signup` | `POST /users` → `POST /auth/login` | Two calls: `/users` returns only `{id}`, no tokens |
| `POST /api/auth/login` | `POST /auth/login` | 401 → "E-mail ou senha inválidos." |
| `POST /api/auth/refresh` | `POST /auth/refresh` | Token rotation; clears cookies on any failure |
| `POST /api/auth/logout` | `POST /auth/logout` | Clears cookies even if revocation fails |

**Field names differ between the UI and the API** — the BFF translates, do not "fix" one side to match the
other: the form is `nome`/`senha`, the API schema is `username`/`password`/`email`. `UserCreate` sets
`extra="forbid"`, so any additional key returns 422.

Constraints mirrored from the Pydantic schema: password 8–128, username 1–255, email 3–500. Cookie
lifetimes mirror `ACCESS_TOKEN_EXPIRE_MINUTES=15` / `REFRESH_TOKEN_EXPIRE_DAYS=7`.

The current user comes from `src/lib/api/user.ts`: the API has no `/users/me`, so it reads the `sub` claim
from the access token (decode only — the API is the authority on verification) and calls `GET /users/{id}`.
The dash layout resolves it server-side and passes it to `DashTopBar`. Without a session the header shows a
neutral state rather than inventing a name; in demo mode it shows `DEMO_USER` (Marina Alves, matching the
`approved_by` in the mock remediations). The org line ("Acme · Pessoal") is still static — the API exposes
no organization endpoint.

### Silent session refresh — `src/middleware.ts`

The access cookie lives 15 minutes; the refresh cookie 7 days. When the access cookie expires the browser
just stops sending it, so the middleware (matcher `/dash/:path*`) exchanges the refresh token for a new
pair before the page renders.

**Why middleware and not the layout:** server components **cannot set cookies** in Next.js — only Route
Handlers, Server Actions, and middleware can. And middleware is the only one that runs *before* the page,
so the renewal is invisible.

Two things that are easy to get wrong and are load-bearing:

1. The new token is written to **both** `request.cookies` (so the server component in *this same request*
   already reads the fresh token — otherwise the first load after expiry still fails) and
   `response.cookies` (so the browser keeps it). The `request` one requires `NextResponse.next({ request })`.
2. **`src/middleware.ts` is the only `fetch` in the codebase, deliberately.** Everything else uses axios,
   but axios calls `setImmediate`/`process.nextTick`, which the Edge runtime does not have — the build
   warns "A Node.js API is used … not supported in the Edge Runtime". `adapter: 'fetch'` does not help
   because the warning comes from `utils.js`, imported with the package. Do not "fix" this back to axios.

On a rejected refresh (expired, revoked, or reuse detected — the API invalidates the whole token family)
the middleware clears both cookies, so it does not retry on every request with a token that will never work.

## Dashboard (`/dash/*`)

All 11 screens are ported. `src/app/dash/layout.tsx` (server: resolves the user, injects the pre-paint theme
script) → `DashStateProvider` → `DashShell` (client: grid + sidebar + topbar). 28 components in
`src/components/dash/`, 6 modules in `src/lib/dash/`.

**Routes** are real, one per screen. The screen keys (`home`, `findings`, `pipelines`, `reports`,
`reportDetail`, `remediations`, `attack`, `integrations`, `repos`, `team`) remain the identity of a screen
because the sidebar exposes them as `data-screen` and the cadastro preview navigates by them. The map lives
in `src/lib/dash/dash-routes.ts` — always route through `SCREEN_ROUTES` / `reportDetailRoute()` /
`findingRoute()`, never hard-code a path.

**Onboarding gate.** `connected` (`localStorage.aperia-connected`) locks the data screens (`findings`,
`pipelines`, `reports`, `reportDetail`, `attack`, `remediations`). Wrap those screens in `<DataScreenGate>`.
`connectGitHub()` → repo selection → `finishOnboarding()` is the simulated GitHub App install flow.

**Preview mode** (`?preview=1`) forces connected and must suppress *every* `localStorage` write — the
cadastro carousel drives the real dashboard and cannot pollute real state. `?theme=light` forces the theme
without persisting it.

**State keys** are centralised in `src/lib/storage.ts` — reuse them, don't re-add string literals.
`logout()` calls `/api/auth/logout` and routes to `/login`.

**All data is deterministic mock data** in `src/lib/dash/mock-data.ts`. `buildFindings()` generates 80
synthetic findings from `VULN_TEMPLATES` with a seeded `mulberry32(20240629)` PRNG, plus 10 hand-written
"hero" findings. **The order of `rnd()` calls is part of the contract** — including the calls that only
happen via `&&` short-circuit (`scanner`, `secret_verified`). The generated dataset was verified
byte-identical to the prototype's.

### URL as state

Findings keeps every filter in the query string (`src/lib/dash/findings-filters.ts` does parse/serialize),
using the **same parameter names as the prototype** (`repo`, `cat`, `sev`, `scanner`, `tier`, `aging`,
`status`, `q`, `de`, `ate`) so old links still work. `de=all` means "todo o histórico"; a missing `de` means
the default 90-day window. This replaces the prototype's hand-rolled `syncURL()`/`parseURLToFF()` and gets
shareable filters and a working back button for free.

### Cross-screen contracts

These are the seams between screens. Keep them in the helpers, not inline:

- `findingRoute(id)` → `/dash/findings?finding=<id>`. Report detail and Remediações both link to a finding;
  the Findings list scrolls to and flashes that row.
- `?scan=<id>` on `/dash/remediacoes` scopes the list to one execution (Scans links to it).
- `?scan=<id>` on `/dash/ai-emulation` selects which execution's attack path to show.

### Screens never mutate the shared mock arrays

Approve/reject on Remediações, and the Scans polling that completes `s2`'s Tier 3, both hold their changes
in `useState` instead of writing into `REMEDIATIONS` / `SCAN_JOBS`. Mutating module state would leave the
dataset corrupted after navigating away and back.

## What is NOT ported

Two pieces of the dashboard remain in `legacy/dash/index.html` only:

1. **The three interactive charts above the Findings table** — `findingsChartsBand` → `chartRepoBody`,
   `chartCategoryBody`, `chartOpenVsRemedBody`, `metaBands`, `fChartCard` (~lines 1400–1543). They
   cross-filter by clicking a bar/slice (`onDimClick`), and the filter state they would drive already exists
   in `findings-filters.ts` — so they plug in without reworking anything.
2. **The finding slide-over drawer** — `openFinding`, `rotationBlock`. The port replaces it with the
   `findingRoute()` deep link. Building the drawer would also restore the chain-scoped prev/next that
   AI Emulation had to drop.

`src/components/dash/NotPortedYet.tsx` is now referenced by nothing. Delete it whenever.

## legacy/ — the pre-migration site

The original static site: `index.html` (generated bundle), `cadastro.html` ("dc" format), `support.js`
(generated dc runtime, never edit), `dash/index.html` (~2700-line single-file SPA). `assets` and
`dash/uploads` are symlinks into `public/`.

Excluded from the build by `tsconfig.json`, `next.config.ts` and `eslint.config.mjs`. It exists to compare
behaviour and to recover copy or values the port may have missed. Once the two remaining pieces above are
ported and validated, the whole folder can go — git history preserves it.

## Conventions

- Commit messages: Portuguese, imperative, **no accents in the subject line**
  (e.g. `Atualiza dashboard: paginacao na lista de Findings`).
- Code comments in Portuguese, and only where they explain *why* — a workaround, a non-obvious value, or
  something inherited from the old runtime. Several comments record that a value came from a patch script
  rather than the original markup; keep them.
- Prefer Tailwind utilities, including arbitrary values (`text-[13.5px]`). Use `style={{…}}` only for what
  Tailwind cannot express: CSS custom properties, multi-layer `filter`, `mask-image`, `conic-gradient`,
  comma-separated multi-animations, and per-element dynamic values.
- Server components by default; `'use client'` only where there is genuinely state, an effect, or a handler.
- New dashboard UI uses the `dash.css` component classes and the CSS custom properties — not raw hex.
